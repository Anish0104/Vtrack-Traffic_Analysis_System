import React from 'react';
import { Play } from 'lucide-react';

export default function VideoPlayer({ videoUrl, annotations }) {
    return (
        <div className="relative aspect-video bg-dark-950 flex items-center justify-center rounded-lg overflow-hidden border border-white/5">
            {videoUrl ? (
                <video src={videoUrl} controls className="object-cover w-full h-full" />
            ) : (
                <>
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-950 to-transparent z-10 opacity-60"></div>
                    <img src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="Traffic" className="object-cover w-full h-full opacity-40 grayscale" />
                    <button className="absolute z-30 w-16 h-16 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-105 active:scale-95 shadow-xl">
                        <Play className="w-6 h-6 ml-1" fill="currentColor" />
                    </button>
                </>
            )}
        </div>
    );
}
