import React from 'react';

export default function Heatmap({ heatmapData }) {
    return (
        <div className="w-full h-64 bg-dark-900 border border-white/5 rounded-xl flex items-center justify-center text-dark-100/50 flex-col gap-2">
            <div className="w-full h-full relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10">
                <div className="absolute inset-0 flex items-center justify-center">
                    <span>Heatmap View Overlay</span>
                </div>
            </div>
        </div>
    );
}
