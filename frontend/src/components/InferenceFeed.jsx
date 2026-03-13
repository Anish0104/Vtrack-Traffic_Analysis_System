import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, Cpu, Search } from 'lucide-react';

const OBJECT_TYPES = ['car', 'truck', 'bus', 'motorcycle'];

const InferenceFeed = ({ isProcessing }) => {
  const [logs, setLogs] = useState([]);
  const [inferenceSpeed, setInferenceSpeed] = useState(0);

  useEffect(() => {
    if (!isProcessing) {
      setLogs([]);
      setInferenceSpeed(0);
      return;
    }

    const interval = setInterval(() => {
      const newLog = {
        id: Math.random().toString(36).substr(2, 9),
        type: OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)],
        confidence: (Math.random() * (0.98 - 0.7) + 0.7).toFixed(2),
        timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      setLogs(prev => [newLog, ...prev].slice(0, 10));
      setInferenceSpeed(Math.floor(Math.random() * (120 - 80) + 80));
    }, 800);

    return () => clearInterval(interval);
  }, [isProcessing]);

  return (
    <div className="bg-dark-900/60 backdrop-blur-md border border-white/10 rounded-sm overflow-hidden flex flex-col h-full min-h-[400px]">
      <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-dark-800/60">
        <h4 className="text-white font-medium text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-400" />
          AI System Intelligence
        </h4>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Neural Engine</span>
          </div>
          <div className="flex items-center gap-1.5 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
            <Zap className="w-3 h-3 text-teal-400" />
            <span className="text-[10px] font-bold text-teal-400">{inferenceSpeed}ms</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
        {!isProcessing ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3 opacity-50">
            <Search className="w-8 h-8" />
            <p className="text-sm font-medium">Waiting for inference stream...</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1">
            <AnimatePresence initial={false}>
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-dark-800/40 border border-white/5 rounded-sm p-3 flex justify-between items-center group hover:border-teal-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-[10px] font-mono text-slate-500">{log.timestamp}</div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white uppercase tracking-wider capitalize">{log.type} detected</span>
                      <span className="text-[10px] text-slate-400">YOLOv8s Confidence: {log.confidence}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-12 bg-dark-700 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${log.confidence * 100}%` }}
                      className="h-full bg-teal-500"
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="pt-4 mt-auto border-t border-white/5 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Model precision</div>
            <div className="text-sm font-mono text-white">FP16 / Optimized</div>
          </div>
          <div className="space-y-1">
            <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Compute provider</div>
            <div className="text-sm font-mono text-white">HF GPU Node 01</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InferenceFeed;
