import React, { useEffect } from 'react';
import { Target, BarChart3, Zap, Map, Car, Download } from 'lucide-react';

export default function LandingPage({ onStart }) {
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    observer.unobserve(e.target);
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return (
        <div className="landing-layout overflow-x-hidden antialiased text-white relative z-10 w-full">
            {/* Hero */}
            <section className="relative min-h-[85vh] flex items-center justify-center">
                <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-full text-xs font-medium text-teal-400 mb-8 backdrop-blur-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                        Powered by YOLOv8
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white tracking-tight leading-[1.1]">
                        Smart Traffic
                        <span className="block bg-gradient-to-r from-teal-400 to-cyan-400 text-transparent bg-clip-text">Video Analysis</span>
                    </h1>
                    <p className="text-lg text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
                        Upload any traffic video and get instant AI-powered insights — vehicle detection, speed estimation, counting, and more.
                    </p>
                    <button
                        onClick={onStart}
                        className="px-8 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-semibold transition-all duration-200 shadow-lg shadow-teal-500/25 hover:shadow-teal-400/40 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        Get Started
                    </button>
                </div>
            </section>

            {/* Stats */}
            <section className="py-16 px-6 fade-in relative z-10">
                <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6">
                    <StatCard number="30+" label="FPS Processing" />
                    <StatCard number="90%+" label="Detection Accuracy" />
                    <StatCard number="24/7" label="Always Available" />
                </div>
            </section>

            {/* Features */}
            <section className="py-20 px-6 fade-in relative z-10">
                <div className="text-center mb-14">
                    <h2 className="text-3xl font-bold mb-3 text-white tracking-tight">
                        What Vtrack Can Do
                    </h2>
                    <p className="text-slate-400 max-w-lg mx-auto text-sm">
                        Everything you need to analyze traffic videos with AI.
                    </p>
                </div>

                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <FeatureCard
                        icon={<Target className="w-6 h-6 text-sky-400" />}
                        title="Vehicle Detection"
                        desc="Detect cars, trucks, buses, and motorcycles using YOLOv8 deep learning."
                    />
                    <FeatureCard
                        icon={<Car className="w-6 h-6 text-purple-400" />}
                        title="Object Tracking"
                        desc="Track each vehicle with unique IDs across frames, even through occlusions."
                    />
                    <FeatureCard
                        icon={<Zap className="w-6 h-6 text-emerald-400" />}
                        title="Speed Estimation"
                        desc="Estimate vehicle speeds with camera calibration for flow monitoring."
                    />
                    <FeatureCard
                        icon={<Map className="w-6 h-6 text-rose-400" />}
                        title="Heatmaps"
                        desc="Visualize traffic density with color-coded concentration maps."
                    />
                    <FeatureCard
                        icon={<BarChart3 className="w-6 h-6 text-amber-400" />}
                        title="Vehicle Counting"
                        desc="Count vehicles by type and direction with configurable counting lines."
                    />
                    <FeatureCard
                        icon={<Download className="w-6 h-6 text-blue-400" />}
                        title="Export Results"
                        desc="Download annotated videos and detailed analytics reports."
                    />
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-6 text-center fade-in relative z-10">
                <div className="max-w-2xl mx-auto bg-dark-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-12">
                    <h2 className="text-3xl font-bold mb-3 tracking-tight">Ready to Analyze?</h2>
                    <p className="text-slate-400 mb-8">
                        Upload your traffic video and get instant results.
                    </p>
                    <button
                        onClick={onStart}
                        className="px-8 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-semibold transition-all duration-200 shadow-lg shadow-teal-500/25 hover:shadow-teal-400/40 hover:-translate-y-0.5"
                    >
                        Open Dashboard
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-6 px-6 border-t border-white/5 text-center text-slate-600 text-xs relative z-20">
                <p>&copy; 2025 Vtrack &middot; YOLOv8 &middot; ByteTrack &middot; React &middot; Supabase &middot; FastAPI</p>
            </footer>
        </div>
    );
}

function StatCard({ number, label }) {
    return (
        <div className="text-center py-6 px-4 bg-dark-900/40 backdrop-blur-md border border-white/5 rounded-xl">
            <div className="text-3xl md:text-4xl font-bold text-white mb-1 tracking-tight">{number}</div>
            <div className="text-xs text-slate-500 font-medium">{label}</div>
        </div>
    );
}

function FeatureCard({ icon, title, desc }) {
    return (
        <div className="bg-dark-900/40 backdrop-blur-md border border-white/5 rounded-xl p-5 transition-all duration-200 hover:border-white/15 hover:bg-dark-800/60 group">
            <div className="mb-3 p-2.5 rounded-lg bg-white/5 inline-block">{icon}</div>
            <h3 className="text-sm font-semibold mb-1.5 text-white">{title}</h3>
            <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
        </div>
    );
}
