import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileVideo, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VideoUpload({ onUpload }) {
    const onDrop = useCallback(acceptedFiles => {
        if (acceptedFiles?.length > 0) {
            onUpload(acceptedFiles[0]);
        }
    }, [onUpload]);

    const onDropRejected = useCallback((fileRejections) => {
        if (fileRejections.length > 0) {
            const err = fileRejections[0].errors[0];
            alert(`Unable to upload video: ${err.message}`);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop,
        onDropRejected,
        accept: {
            'video/mp4': ['.mp4'],
            'video/avi': ['.avi'],
            'video/quicktime': ['.mov']
        },
        maxFiles: 1,
        maxSize: 500 * 1024 * 1024 // 500MB
    });

    return (
        <div className="w-full h-full flex flex-col justify-center">
            <motion.div
                {...getRootProps()}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={`glass-card p-10 text-center cursor-pointer transition-colors duration-300 relative overflow-hidden group
          ${isDragActive ? 'border-sky-500 bg-sky-500/10' : 'border-white/10 border-dashed hover:border-sky-500/30 hover:bg-white/5'}
          ${isDragReject ? 'border-amber-500 bg-amber-500/10' : ''}
        `}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-sky-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <input {...getInputProps()} />
                <motion.div
                    animate={isDragActive ? { y: [0, -10, 0] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-20 h-20 mx-auto bg-dark-800 border border-white/5 rounded-full flex items-center justify-center mb-6 relative z-10"
                >
                    <UploadCloud className={`w-10 h-10 ${isDragActive ? 'text-sky-400' : 'text-slate-500'}`} />
                </motion.div>

                <h3 className="text-xl font-bold font-display text-white mb-2 relative z-10">
                    {isDragActive ? 'Drop video here' : 'Drag & drop a video or click to browse'}
                </h3>
                <p className="text-slate-400 mb-8 max-w-sm mx-auto text-sm leading-relaxed relative z-10">
                    Support for MP4, AVI, or MOV files up to 500MB. GPU acceleration will be automatically enabled if available.
                </p>

                <button type="button" className="bg-dark-800 hover:bg-dark-700 border border-white/10 px-6 py-2.5 rounded-xl font-medium text-white transition-colors relative z-10">Select Video File</button>
            </motion.div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FeatureCard
                    icon={<AlertCircle className="w-5 h-5 text-yellow-500" />}
                    title="YOLOv8 Detection"
                    desc="Real-time multi-class vehicle identification"
                />
                <FeatureCard
                    icon={<FileVideo className="w-5 h-5 text-blue-500" />}
                    title="ByteTrack ID"
                    desc="Consistent trajectory tracking across frames"
                />
                <FeatureCard
                    icon={<svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>}
                    title="Speed & Flow"
                    desc="Calculated heatmaps and flow metrics"
                />
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, desc }) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="glass-card p-5 flex flex-col items-center text-center cursor-default group"
        >
            <div className="mb-3 bg-dark-800 p-2.5 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors">{icon}</div>
            <h4 className="text-white text-[0.95rem] font-bold font-display mb-1">{title}</h4>
            <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
        </motion.div>
    );
}
