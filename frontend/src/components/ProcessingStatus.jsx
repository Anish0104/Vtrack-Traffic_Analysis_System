import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function ProcessingStatus() {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Initializing models...');

    // Simulate progress updates since we haven't hooked up real Gradio server yet
    useEffect(() => {
        let p = 0;
        const interval = setInterval(() => {
            p += Math.random() * 10;
            if (p > 100) p = 100;
            setProgress(p);

            if (p < 20) setStatus("Loading YOLOv8 weights...");
            else if (p < 40) setStatus("Analyzing frames (1/3)...");
            else if (p < 60) setStatus("Running ByteTrack data association...");
            else if (p < 80) setStatus("Generating heatmaps and speed estimations...");
            else if (p < 100) setStatus("Finalizing output video...");
            else {
                setStatus("Processing Complete!");
                clearInterval(interval);
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full max-w-xl mx-auto py-16 text-center">
            <div className="relative w-32 h-32 mx-auto mb-8">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                        className="text-dark-800 stroke-current"
                        strokeWidth="8"
                        cx="50" cy="50" r="40" fill="transparent"
                    ></circle>
                    <circle
                        className="text-primary-500 transition-all duration-300 ease-out stroke-current"
                        strokeWidth="8"
                        strokeLinecap="round"
                        cx="50" cy="50" r="40" fill="transparent"
                        strokeDasharray={`${progress * 2.51} 251.2`}
                    ></circle>
                </svg>
                <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-white">{Math.round(progress)}%</span>
                </div>
            </div>

            <h3 className="text-xl font-medium text-white mb-2">{status}</h3>
            <p className="text-dark-100/60 mb-6">This may take a few moments depending on the video length.</p>

            <div className="w-full bg-dark-800 rounded-full h-1.5 overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-primary-400 text-sm animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                GPU Acceleration Active
            </div>
        </div>
    );
}
