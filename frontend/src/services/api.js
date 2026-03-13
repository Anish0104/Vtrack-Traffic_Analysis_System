import axios from 'axios';
import { GRADIO_SERVER } from "../utils/constants";

const API_BASE = `${GRADIO_SERVER}/api`;

export const uploadVideoFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    
    const uploadRes = await axios.post(`${API_BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    return uploadRes.data;
};

export const startProcessingAndPoll = async (job_id, file_path, total_frames, pixels_per_meter, counting_line, count_direction, onProgress) => {
    try {
        // Step 2: Start processing
        let url = `${API_BASE}/process?job_id=${job_id}&file_path=${encodeURIComponent(file_path)}&total_frames=${total_frames}&pixels_per_meter=${pixels_per_meter}`;
        if (counting_line && counting_line.length === 2) {
            url += `&counting_line=${encodeURIComponent(JSON.stringify(counting_line))}`;
        }
        if (count_direction) {
            url += `&count_direction=${count_direction}`;
        }
        await axios.post(url);
        
        // Step 3: Poll for status
        return new Promise((resolve, reject) => {
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await axios.get(`${API_BASE}/status/${job_id}`);
                    const data = statusRes.data;
                    
                    if (data.status === "Database disabled") {
                        clearInterval(pollInterval);
                        reject(new Error("Database is disabled, cannot poll status via REST API."));
                    }
                    
                    if (data.progress) {
                        const mappedProg = 15 + (data.progress * 0.8);
                        onProgress && onProgress(mappedProg);
                    }
                    
                    if (data.status === 'completed') {
                        clearInterval(pollInterval);
                        onProgress && onProgress(100);
                        
                        // Fetch results
                        try {
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
                            console.log("Results Data successfully fetched:", resultsData);
                            
                            resolve({
                                success: true,
                                videoUrl: `${API_BASE}/download/${job_id}`,
                                stats: {
                                    total: resultsData.total_vehicles,
                                    avg_speed: resultsData.avg_speed_kmh,
                                    model: resultsData.model || "yolov8s",
                                    duration: resultsData.processing_time_seconds || 10,
                                    fps: 30, // Defaulting as it's not saved explicitly but needed for UI
                                    counts: {
                                        car: resultsData.total_cars,
                                        truck: resultsData.total_trucks,
                                        bus: resultsData.total_buses,
                                        motorcycle: resultsData.total_motorcycles
                                    }
                                }
                            });
                        } catch (fetchErr) {
                            console.error("Fetch Exception:", fetchErr);
                            reject(new Error("Failed to fetch finalized results from the server."));
                        }
                    } else if (data.status === 'failed') {
                        clearInterval(pollInterval);
                        reject(new Error(data.error_message || "Processing failed"));
                    }
                } catch (e) {
                    console.error("Polling error:", e);
                }
            }, 1000);
        });
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};

export const fetchGlobalStats = async () => {
    try {
        const res = await axios.get(`${API_BASE}/global-stats`);
        return res.data;
    } catch (e) {
        console.error("Failed to fetch global stats:", e);
        return { total_processed: 0, total_vehicles: 0, system_load: 0 };
    }
};


