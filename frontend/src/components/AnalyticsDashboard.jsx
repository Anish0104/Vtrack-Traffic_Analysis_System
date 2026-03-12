import React from 'react';
import { Activity, TrendingUp, Car } from 'lucide-react';

export default function AnalyticsDashboard({ results }) {
    if (!results) return null;

    return (
        <div className="space-y-4">
            <MetricCard
                title="Total Vehicles"
                value={results.total}
                icon={<Activity className="text-primary-400" />}
                trend={results.directional && (results.directional.entering > 0 || results.directional.exiting > 0) ? 
                    `In: ${results.directional.entering} | Out: ${results.directional.exiting}` : 
                    "Net Flow"}
            />
            <MetricCard
                title="Avg Speed"
                value={`${results.avg_speed.toFixed(1)} km/h`}
                icon={<TrendingUp className="text-blue-400" />}
                trend="Normal flow"
            />
            <MetricCard
                title="Density"
                value={`${Math.round(results.total / (results.duration || 10))} v/s`}
                icon={<Car className="text-purple-400" />}
                trend="High congestion"
                alert
            />
        </div>
    );
}

function MetricCard({ title, value, icon, trend, alert }) {
    return (
        <div className={`bg-dark-900/60 backdrop-blur-md border-y border-r border-white/10 rounded-sm p-5 ${alert ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-teal-500'}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">{title}</p>
                    <h3 className="text-3xl font-mono text-white tracking-tighter">{value}</h3>
                </div>
                <div className="p-2 rounded-sm bg-dark-800 border border-white/5 text-teal-400">
                    {icon}
                </div>
            </div>
            <div className={`mt-4 text-[10px] font-mono uppercase tracking-widest ${alert ? 'text-rose-400' : 'text-teal-400'}`}>
                {trend}
            </div>
        </div>
    );
}
