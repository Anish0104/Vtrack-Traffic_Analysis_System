import axios from 'axios';
import { GRADIO_SERVER } from "../utils/constants";
import { supabase, isSupabaseConfigured } from './supabase';

const API_BASE = `${GRADIO_SERVER}/api`;

async function analyzeVideoMetadata(file) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        const objectUrl = URL.createObjectURL(file);
        video.onloadedmetadata = () => {
            const duration = video.duration || 0;
            const fps = 30;
            URL.revokeObjectURL(objectUrl);
            resolve({
                fps,
                duration,
                total_frames: Math.max(1, Math.round(duration * fps)),
                resolution: `${video.videoWidth}x${video.videoHeight}`,
            });
        };
        video.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({ fps: 30, duration: 0, total_frames: 900, resolution: 'unknown' });
        };
        video.src = objectUrl;
    });
}

async function uploadToSupabaseStorage(file) {
    const path = `videos/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const { error } = await supabase.storage.from('videos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
    });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);

    const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(path);
    return { path, publicUrl };
}

export const uploadVideoFile = async (file) => {
    if (isSupabaseConfigured()) {
        // Production path: upload directly to Supabase Storage, bypassing Vercel's body limit.
        const [metadata, { path, publicUrl }] = await Promise.all([
            analyzeVideoMetadata(file),
            uploadToSupabaseStorage(file),
        ]);

        const res = await axios.post(`${API_BASE}/register-upload`, {
            file_url: publicUrl,
            storage_path: path,
            filename: file.name,
            ...metadata,
        });
        return res.data;
    } else {
        // Local dev path: upload the file directly to the API.
        const formData = new FormData();
        formData.append('file', file);
        const res = await axios.post(`${API_BASE}/upload`, formData);
        return res.data;
    }
};

export const startProcessingAndPoll = async (job_id, file_path, total_frames, pixels_per_meter, counting_line, count_direction, onProgress) => {
    try {
        let url = `${API_BASE}/process?job_id=${job_id}&file_path=${encodeURIComponent(file_path)}&total_frames=${total_frames}&pixels_per_meter=${pixels_per_meter}`;
        if (counting_line && counting_line.length === 2) {
            url += `&counting_line=${encodeURIComponent(JSON.stringify(counting_line))}`;
        }
        if (count_direction) {
            url += `&count_direction=${count_direction}`;
        }
        await axios.post(url);

        return new Promise((resolve, reject) => {
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await axios.get(`${API_BASE}/status/${job_id}`);
                    const data = statusRes.data;

                    if (data.status === 'Database disabled') {
                        clearInterval(pollInterval);
                        reject(new Error('Database is disabled, cannot poll status via REST API.'));
                    }

                    if (data.progress) {
                        onProgress && onProgress(15 + (data.progress * 0.8));
                    }

                    if (data.status === 'completed') {
                        clearInterval(pollInterval);
                        onProgress && onProgress(100);

                        let resultsRes;
                        let retries = 3;
                        while (retries > 0) {
                            try {
                                resultsRes = await axios.get(`${API_BASE}/results/${job_id}`);
                                break;
                            } catch (err) {
                                retries--;
                                if (retries === 0) throw err;
                                await new Promise(r => setTimeout(r, 1000));
                            }
                        }
                        const resultsData = resultsRes.data;
                        console.log('Results fetched:', resultsData);
                        resolve({
                            success: true,
                            videoUrl: `${API_BASE}/download/${job_id}`,
                            stats: {
                                total: resultsData.total_vehicles,
                                avg_speed: resultsData.avg_speed_kmh,
                                model: resultsData.model || 'yolov8s',
                                duration: resultsData.processing_time_seconds || 10,
                                fps: 30,
                                counts: {
                                    car: resultsData.total_cars,
                                    truck: resultsData.total_trucks,
                                    bus: resultsData.total_buses,
                                    motorcycle: resultsData.total_motorcycles,
                                },
                            },
                        });
                    } else if (data.status === 'failed') {
                        clearInterval(pollInterval);
                        reject(new Error(data.error_message || 'Processing failed'));
                    }
                } catch (e) {
                    console.error('Polling error:', e);
                }
            }, 1000);
        });
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const fetchGlobalStats = async () => {
    try {
        const res = await axios.get(`${API_BASE}/global-stats`);
        return res.data;
    } catch (e) {
        console.error('Failed to fetch global stats:', e);
        return { total_processed: 0, total_vehicles: 0, system_load: 0 };
    }
};
