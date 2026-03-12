import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Ruler, ArrowRight, SkipForward } from 'lucide-react';

export default function CalibrationStep({ videoFile, onComplete }) {
    const [currentStep, setCurrentStep] = useState(1); // 1 = Speed, 2 = Counting Line
    
    // Step 1: Speed Calibration State
    const [pixelsPerMeter, setPixelsPerMeter] = useState(20.0);
    const [mode, setMode] = useState('input'); // 'input' or 'draw'
    const [points, setPoints] = useState([]); // Speed reference line points
    const [realWorldMeters, setRealWorldMeters] = useState(5.0);

    // Step 2: Counting Line State
    const [linePoints, setLinePoints] = useState([]); // Counting line points
    const [countDirection, setCountDirection] = useState('both'); // 'entering_down', 'entering_up', 'both'
    const [thumbnail, setThumbnail] = useState(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        if (videoFile) {
            const url = URL.createObjectURL(videoFile);
            const video = document.createElement('video');
            video.src = url;
            video.currentTime = 1; // Try to extract frame at 1s
            video.addEventListener('seeked', () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                setThumbnail(canvas.toDataURL('image/jpeg', 0.8));
                URL.revokeObjectURL(url);
            });
        }
    }, [videoFile]);

    const handleCanvasClick = (e) => {
        if (currentStep === 1 && mode !== 'draw') return;
        
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        if (currentStep === 1) {
            if (points.length >= 2) {
                setPoints([{ x, y }]);
            } else {
                const newPoints = [...points, { x, y }];
                setPoints(newPoints);
                if (newPoints.length === 2) {
                    const dx = newPoints[1].x - newPoints[0].x;
                    const dy = newPoints[1].y - newPoints[0].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const ppm = dist / realWorldMeters;
                    setPixelsPerMeter(parseFloat(ppm.toFixed(2)));
                }
            }
        } else if (currentStep === 2) {
            if (linePoints.length >= 2) {
                setLinePoints([{ x, y }]);
            } else {
                setLinePoints([...linePoints, { x, y }]);
            }
        }
    };

    // Draw the line(s)
    useEffect(() => {
        if (canvasRef.current && thumbnail) {
            const ctx = canvasRef.current.getContext('2d');
            const img = new Image();
            img.onload = () => {
                if (canvasRef.current.width !== img.width) {
                    canvasRef.current.width = img.width;
                    canvasRef.current.height = img.height;
                }
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);

                // Draw Speed Line
                if (currentStep === 1 && mode === 'draw') {
                    if (points.length > 0) {
                        ctx.fillStyle = '#0ea5e9'; // sky-500
                        ctx.beginPath();
                        ctx.arc(points[0].x, points[0].y, 5, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                    if (points.length === 2) {
                        ctx.fillStyle = '#0ea5e9';
                        ctx.beginPath();
                        ctx.arc(points[1].x, points[1].y, 5, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.strokeStyle = '#0ea5e9';
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(points[0].x, points[0].y);
                        ctx.lineTo(points[1].x, points[1].y);
                        ctx.stroke();
                    }
                }

                // Draw Counting Line
                if (currentStep === 2) {
                    if (linePoints.length > 0) {
                        ctx.fillStyle = '#f59e0b'; // amber-500
                        ctx.beginPath();
                        ctx.arc(linePoints[0].x, linePoints[0].y, 5, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                    if (linePoints.length === 2) {
                        ctx.fillStyle = '#f59e0b';
                        ctx.beginPath();
                        ctx.arc(linePoints[1].x, linePoints[1].y, 5, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.strokeStyle = '#f59e0b';
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(linePoints[0].x, linePoints[0].y);
                        ctx.lineTo(linePoints[1].x, linePoints[1].y);
                        ctx.stroke();
                        
                        // Draw direction arrow roughly in middle if not both
                        if(countDirection !== 'both') {
                            const mx = (linePoints[0].x + linePoints[1].x) / 2;
                            const my = (linePoints[0].y + linePoints[1].y) / 2;
                            ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
                            ctx.beginPath();
                            ctx.arc(mx, my, 25, 0, 2 * Math.PI);
                            ctx.fill();
                        }
                    }
                }
            };
            img.src = thumbnail;
        }
    }, [points, linePoints, thumbnail, mode, currentStep, countDirection]);

    const handleSkip = () => {
        if (currentStep === 1) {
            setCurrentStep(2);
        } else {
            onComplete(pixelsPerMeter, null, 'both');
        }
    };

    const handleContinue = () => {
        if (currentStep === 1) {
            setCurrentStep(2);
        } else {
            // Formatting points for JSON
            const formattedLine = linePoints.length === 2 ? [[linePoints[0].x, linePoints[0].y], [linePoints[1].x, linePoints[1].y]] : null;
            onComplete(pixelsPerMeter, formattedLine, countDirection);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-4xl flex flex-col items-center justify-center min-h-[500px]"
        >
            <div className="bg-dark-900/60 backdrop-blur-md border border-white/10 rounded-sm p-8 w-full shadow-2xl relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
                
                <div className="text-center mb-8 relative z-10">
                    <div className="w-12 h-12 bg-dark-800 border border-white/10 rounded-sm flex items-center justify-center mx-auto mb-4">
                        <Ruler className={`w-6 h-6 ${currentStep === 1 ? 'text-teal-400' : 'text-amber-400'}`} />
                    </div>
                    <h2 className="text-2xl font-bold font-sans tracking-tighter uppercase text-white">
                        {currentStep === 1 ? 'Step 1: Scale Calibration' : 'Step 2: Counting Line'}
                    </h2>
                    <p className="text-slate-400 font-mono text-sm uppercase tracking-widest mt-2 block">
                        {currentStep === 1 ? 'Set physical scale to accurately compute speed.' : 'Define an intersection line to count directional flow.'}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    {/* Left side: Controls */}
                    <div className="space-y-6">
                        {currentStep === 1 ? (
                            <>
                                <div className="flex gap-2 p-1 bg-dark-800/50 rounded-sm border border-white/5">
                                    <button 
                                        onClick={() => setMode('input')} 
                                        className={`flex-1 py-2 text-xs font-mono uppercase tracking-widest rounded-sm transition-colors ${mode === 'input' ? 'bg-teal-600 shadow-[0_0_15px_rgba(20,184,166,0.2)] text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        Quick Input
                                    </button>
                                    <button 
                                        onClick={() => { setMode('draw'); setPoints([]); }} 
                                        className={`flex-1 py-2 text-xs font-mono uppercase tracking-widest rounded-sm transition-colors ${mode === 'draw' ? 'bg-teal-600 shadow-[0_0_15px_rgba(20,184,166,0.2)] text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        Draw Reference
                                    </button>
                                </div>

                                {mode === 'input' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-2">Pixels Per Meter Ratio</label>
                                            <input 
                                                type="number" 
                                                value={pixelsPerMeter}
                                                onChange={(e) => setPixelsPerMeter(parseFloat(e.target.value))}
                                                className="w-full bg-dark-800 border border-white/20 focus:border-teal-500 rounded-lg outline-none text-white font-mono p-3 transition-colors placeholder-slate-600"
                                                placeholder="Enter pixels per meter (default: 20)"
                                            />
                                            <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-wider font-mono">Higher values = lower reported speeds. Default is 20.</p>
                                        </div>
                                    </div>
                                )}

                                {mode === 'draw' && (
                                    <div className="space-y-4">
                                        <p className="text-xs text-slate-400 font-mono mb-2 uppercase tracking-widest">1. Enter known distance in video</p>
                                        <input 
                                            type="number" 
                                            value={realWorldMeters}
                                            onChange={(e) => setRealWorldMeters(parseFloat(e.target.value))}
                                            className="w-full bg-dark-800 border border-white/20 focus:border-teal-500 rounded-lg outline-none text-white font-mono p-3 transition-colors mb-4 placeholder-slate-600"
                                            placeholder="Distance in meters"
                                        />
                                        <p className="text-xs text-slate-400 font-mono uppercase tracking-widest">2. Draw a line corresponding to {realWorldMeters}m on the right panel.</p>
                                        
                                        {points.length === 2 && (
                                            <div className="p-3 bg-teal-900/20 border border-teal-500/30 rounded-sm mt-4">
                                                <p className="text-xs text-teal-400 font-mono text-center uppercase tracking-widest">
                                                    Result: {pixelsPerMeter.toFixed(2)} px/m
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-xs text-slate-400 font-mono mb-4 uppercase tracking-widest leading-relaxed">Draw a line across the road. Only vehicles crossing this line will be counted.</p>
                                
                                <div>
                                    <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-2 mt-4">Counting Direction</label>
                                    <div className="flex flex-col gap-2 p-1 bg-dark-800/50 rounded-sm border border-white/5">
                                        <button 
                                            onClick={() => setCountDirection('both')} 
                                            className={`p-2 text-xs font-mono uppercase tracking-widest rounded-sm transition-colors text-left ${countDirection === 'both' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                                        >
                                            Both Directions
                                        </button>
                                        <button 
                                            onClick={() => setCountDirection('entering')} 
                                            className={`p-2 text-xs font-mono uppercase tracking-widest rounded-sm transition-colors text-left ${countDirection === 'entering' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                                        >
                                            Entering Only (Crossing Up/Right)
                                        </button>
                                        <button 
                                            onClick={() => setCountDirection('exiting')} 
                                            className={`p-2 text-xs font-mono uppercase tracking-widest rounded-sm transition-colors text-left ${countDirection === 'exiting' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                                        >
                                            Exiting Only (Crossing Down/Left)
                                        </button>
                                    </div>
                                </div>
                                {linePoints.length > 0 && linePoints.length < 2 && (
                                     <p className="text-xs text-amber-400/80 font-mono mt-2 uppercase tracking-widest animate-pulse">Click again to complete the line...</p>
                                )}
                                {linePoints.length === 2 && (
                                    <div className="flex items-center justify-between mt-4">
                                        <p className="text-xs text-emerald-400 font-mono uppercase tracking-widest">Line set.</p>
                                        <button onClick={() => setLinePoints([])} className="text-[10px] text-slate-400 hover:text-white uppercase font-mono tracking-widest underline underline-offset-2">Redraw Line</button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between">
                            <button 
                                onClick={handleSkip}
                                className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 rounded-sm transition-colors flex items-center gap-2"
                            >
                                <SkipForward className="w-4 h-4" />
                                Skip
                            </button>
                            <button 
                                onClick={handleContinue}
                                className={`px-6 py-2.5 text-xs font-mono uppercase tracking-widest text-dark-900 rounded-sm transition-colors font-bold flex items-center gap-2 ${currentStep === 1 ? 'bg-teal-400 hover:bg-teal-300 shadow-[0_0_15px_rgba(45,212,191,0.3)]' : 'bg-amber-400 hover:bg-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.3)]'}`}
                            >
                                {currentStep === 1 ? 'Next Step' : 'Start Process'}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Right side: Preview Canvas */}
                    <div className="bg-dark-950 rounded-sm border border-white/5 flex items-center justify-center overflow-hidden min-h-[300px]">
                        {thumbnail ? (
                            <canvas 
                                ref={canvasRef} 
                                onClick={handleCanvasClick}
                                className={`max-w-full max-h-[350px] object-contain ${currentStep === 1 && mode === 'draw' ? 'cursor-crosshair' : ''} ${currentStep === 2 ? 'cursor-crosshair' : ''}`}
                            />
                        ) : (
                            <div className="flex flex-col items-center text-slate-500">
                                <div className="w-6 h-6 border-2 border-t-teal-500 border-slate-700 rounded-full animate-spin mb-3"></div>
                                <span className="text-xs font-mono uppercase tracking-widest">Extracting Reference Frame...</span>
                            </div>
                        )}
                        {/* Hidden image logic moved to useEffect */}
                        {thumbnail && mode === 'input' && (
                            <img src={thumbnail} alt="Video Frame" className="max-w-full max-h-[350px] object-contain hidden" onLoad={(e) => {
                                if(canvasRef.current) {
                                    canvasRef.current.width = e.target.naturalWidth;
                                    canvasRef.current.height = e.target.naturalHeight;
                                    const ctx = canvasRef.current.getContext('2d');
                                    ctx.drawImage(e.target, 0, 0);
                                }
                            }} />
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
