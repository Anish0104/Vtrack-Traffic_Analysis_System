import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Video, LayoutDashboard, TrendingUp, Settings, Play, Upload, Clock, ChevronRight, Car } from 'lucide-react';
import VideoUpload from './components/VideoUpload';
import ProcessingStatus from './components/ProcessingStatus';
import ResultsView from './components/ResultsView';
import LandingPage from './components/LandingPage';
import TrafficScene from './components/3D/TrafficScene';
import CalibrationStep from './components/CalibrationStep';
import { fetchGlobalStats, uploadVideoFile, startProcessingAndPoll } from './services/api';

function AppRouter() {
  const [videoFile, setVideoFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadData, setUploadData] = useState(null);
  const [results, setResults] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleUpload = async (file) => {
    setVideoFile(file);
    setIsUploading(true);

    try {
      const data = await uploadVideoFile(file);
      setUploadData(data);
      setIsUploading(false);
    } catch (err) {
      setIsUploading(false);
      alert("Error uploading video: " + err.message);
      console.error(err);
    }
  };

  const handleCalibrationComplete = async (pixelsPerMeter, countingLine, countDirection) => {
    setIsProcessing(true);
    const data = uploadData;
    setUploadData(null);
    try {
      const result = await startProcessingAndPoll(
        data.job_id, data.file_path, data.metadata.total_frames, pixelsPerMeter, countingLine, countDirection, (prog) => {
            // handle progress
        }
      );
      setIsProcessing(false);
      setResults({ ...result.stats, videoUrl: result.videoUrl, isCalibrated: pixelsPerMeter !== 20.0 });
      navigate('/results');
    } catch (err) {
      setIsProcessing(false);
      alert("Error processing video: " + err.message);
    }
  };

  if (location.pathname === '/') {
    return <LandingPage onStart={() => navigate('/dashboard')} />;
  }

  const activeTab = location.pathname.substring(1) || 'dashboard';

  return (
    <div className="min-h-screen bg-transparent text-dark-100 flex pb-10">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-950/40 backdrop-blur-xl border-r border-white/5 fixed h-full select-none z-10 flex flex-col hidden sm:flex">
        <div className="p-6 border-b border-white/5 cursor-pointer" onClick={() => navigate('/')}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-purple-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white">Vtrack</h1>
          </div>
          <p className="text-sm text-dark-100/60 mt-3 font-medium">Real-time Video Analytics</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 relative">
          <NavItem
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Dashboard"
            active={activeTab === 'dashboard'}
            onClick={() => navigate('/dashboard')}
          />
          <NavItem
            icon={<TrendingUp className="w-5 h-5" />}
            label="Results"
            active={activeTab === 'results'}
            onClick={() => { if (results) navigate('/results'); }}
            disabled={!results}
          />
        </nav>


      </aside>

      {/* Main Content */}
      <main className="flex-1 sm:ml-64 relative">
        <header className="h-16 border-b border-white/5 bg-dark-900/50 backdrop-blur-md sticky top-0 z-20 flex items-center px-8">
          <h2 className="text-lg font-bold font-display tracking-tight text-white capitalize">{activeTab.replace('-', ' ')}</h2>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/dashboard" element={<DashboardContent isProcessing={isProcessing} isUploading={isUploading} uploadData={uploadData} handleUpload={handleUpload} handleCalibrationComplete={handleCalibrationComplete} videoFile={videoFile} />} />
              <Route path="/results" element={results ? <ResultsView results={results} /> : <Navigate to="/dashboard" />} />
            </Routes>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function DashboardContent({ isProcessing, isUploading, uploadData, handleUpload, handleCalibrationComplete, videoFile }) {
  const [stats, setStats] = useState({ total_processed: 0, total_vehicles: 0, system_load: 0 });

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      try {
          const statsData = await fetchGlobalStats();
        
        if (mounted) {
          if (statsData) setStats(statsData);
        }
      } catch (e) {
        console.error("Dashboard refresh error:", e);
      }
    };

    loadData();
    const interval = setInterval(loadData, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, staggerChildren: 0.1 }}
      className="space-y-8"
    >
      {/* Header section */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h3 className="text-2xl font-bold font-sans tracking-tight text-white">Welcome Back</h3>
          <p className="text-slate-400 text-sm mt-1">Upload a video to get started with traffic analysis</p>
        </div>
      </motion.div>

      {/* Top Row: Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardStatCard 
          title="Videos Analyzed" 
          value={stats.total_processed} 
          icon={<Video className="w-5 h-5 text-teal-400" />} 
          color="teal" 
          delay={0.1} 
        />
        <DashboardStatCard 
          title="Vehicles Detected" 
          value={stats.total_vehicles >= 1000 ? (stats.total_vehicles / 1000).toFixed(1) + 'k' : stats.total_vehicles} 
          icon={<Car className="w-5 h-5 text-cyan-400" />} 
          color="cyan" 
          delay={0.2} 
        />
        <DashboardStatCard 
          title="CPU Usage" 
          value={`${stats.system_load}%`} 
          icon={<Activity className="w-5 h-5 text-blue-400" />} 
          color="blue" 
          delay={0.3} 
          progress={stats.system_load} 
        />
      </div>

      {/* Lower Row: Upload & Activity Split */}
      {/* Upload Zone Container */}
      <div className="max-w-4xl mx-auto w-full">
        {/* Upload Zone */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.4 }}
          className="bg-dark-900/60 backdrop-blur-md border border-white/10 rounded-sm p-2 flex flex-col min-h-[400px] relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="relative z-10 w-full h-full flex flex-col justify-center flex-1">
            {uploadData ? (
              <CalibrationStep videoFile={videoFile} onComplete={handleCalibrationComplete} />
            ) : !isProcessing && !isUploading ? (
              <div className="flex-1 flex flex-col justify-center pb-6">
                <VideoUpload onUpload={handleUpload} />
              </div>
            ) : (
              <div className="py-12"><ProcessingStatus /></div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function DashboardStatCard({ title, value, icon, color, delay, progress }) {
  const colorMap = {
    teal: 'border-l-teal-500 text-teal-400',
    cyan: 'border-l-cyan-500 text-cyan-400',
    blue: 'border-l-blue-500 text-blue-400'
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -2 }} 
      className={`bg-dark-900/60 backdrop-blur-md border-y border-r border-white/10 border-l-4 rounded-sm p-6 shadow-sm transition-colors hover:bg-dark-800/80 flex flex-col justify-center ${colorMap[color].split(' ')[0]}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">{title}</p>
          <h4 className="text-3xl font-bold tracking-tight text-white">{value}</h4>
        </div>
        <div className={`p-2 bg-dark-800 rounded-sm border border-white/5 ${colorMap[color].split(' ')[1]}`}>
          {icon}
        </div>
      </div>
      {typeof progress === 'number' && (
        <div className="w-full bg-dark-800 h-1 rounded-sm mt-5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full bg-${color}-500`}
          ></motion.div>
        </div>
      )}
    </motion.div>
  );
}

function NavItem({ icon, label, active, onClick, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium
        ${active
          ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
          : 'text-dark-100 hover:bg-dark-800 hover:text-white border border-transparent'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
      `}
    >
      {icon}
      {label}
    </button>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TrafficScene />
      <AppRouter />
    </BrowserRouter>
  );
}
