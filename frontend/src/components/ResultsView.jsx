import React from 'react';
import { Download, Share2, Car, Truck, Bike } from 'lucide-react';
import CountChart from './Charts/CountChart';
import VideoPlayer from './VideoPlayer';
import AnalyticsDashboard from './AnalyticsDashboard';

export default function ResultsView({ results }) {
    if (!results) return null;

    const countData = Object.entries(results.counts).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        count: value
    }));

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
            {/* Header tools */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold font-sans tracking-tighter uppercase text-white">Analysis Results</h2>
                        {results.isCalibrated !== undefined && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-sm font-mono border ${results.isCalibrated ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>
                                {results.isCalibrated ? '✓ Calibrated' : '⚠️ Uncalibrated'}
                            </span>
                        )}
                    </div>
                    <p className="text-teal-400 font-mono text-xs uppercase mt-1 tracking-widest">Processed in {((results.duration || 10) / 3).toFixed(1)}s at {results.fps || 30} FPS | Model: {results.model || 'YOLOv8s'}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            alert('Link copied to clipboard!');
                        }}
                        className="p-2 bg-dark-800 hover:bg-dark-700 rounded-lg text-dark-100 transition-colors border border-white/5" 
                        title="Copy link"
                    >
                        <Share2 className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => {
                            const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'vtrack-analysis.json';
                            a.click();
                            URL.revokeObjectURL(url);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg border border-white/10 transition-colors text-sm font-medium"
                    >
                        <Download className="w-4 h-4" />
                        Export JSON
                    </button>
                    {results.videoUrl && (
                        <a 
                            href={results.videoUrl} 
                            download 
                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors border border-teal-400 text-sm font-medium shadow-[0_0_15px_rgba(20,184,166,0.3)]"
                        >
                            <Download className="w-4 h-4" />
                            Save Video
                        </a>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <VideoPlayer videoUrl={results.videoUrl} annotations={results.trajectories} />
                </div>
                <AnalyticsDashboard results={results} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
                <div className="bg-dark-900/60 backdrop-blur-md border border-white/10 rounded-sm p-6">
                    <h3 className="text-lg font-bold font-sans uppercase text-white mb-6 tracking-tighter">Vehicle Distribution</h3>
                    <CountChart data={countData} />
                </div>
                <div className="bg-dark-900/60 backdrop-blur-md border border-white/10 rounded-sm p-6 flex flex-col justify-center">
                    <h3 className="text-lg font-bold font-sans uppercase text-white mb-6 tracking-tighter">Class Breakdown</h3>
                    <div className="space-y-4">
                        <BreakdownRow icon={<Car className="w-4 h-4 text-teal-400" />} label="Cars & Light Vehicles" count={results.counts.car} total={results.total} color="bg-teal-500" />
                        <BreakdownRow icon={<Truck className="w-4 h-4 text-cyan-400" />} label="Trucks & Heavy" count={results.counts.truck} total={results.total} color="bg-cyan-500" />
                        <BreakdownRow icon={<Truck className="w-4 h-4 text-blue-400" />} label="Buses & Public" count={results.counts.bus} total={results.total} color="bg-blue-500" />
                        <BreakdownRow icon={<Bike className="w-4 h-4 text-rose-400" />} label="Motorcycles" count={results.counts.motorcycle} total={results.total} color="bg-rose-500" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function BreakdownRow({ icon, label, count, total, color }) {
    const percentage = Math.round((count / total) * 100) || 0;
    return (
        <div>
            <div className="flex justify-between items-center mb-1 text-sm">
                <div className="flex items-center gap-2 text-dark-100 font-mono text-xs uppercase tracking-widest">
                    {icon} <span>{label}</span>
                </div>
                <div className="text-white font-mono">{count} <span className="text-dark-100/50 text-[10px] ml-1">({percentage}%)</span></div>
            </div>
            <div className="w-full bg-dark-800 rounded-sm h-1">
                <div className={`h-full rounded-sm ${color}`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    )
}
