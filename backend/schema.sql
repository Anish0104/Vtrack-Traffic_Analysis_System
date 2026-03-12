-- Schema for Vtrack system
-- Initialize basic structure for metadata storage

CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  duration_seconds FLOAT,
  fps INTEGER,
  resolution TEXT,
  file_size_mb FLOAT,
  pixels_per_meter FLOAT DEFAULT 20.0,
  counting_line JSONB,
  count_direction TEXT,
  upload_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  current_frame INTEGER DEFAULT 0,
  total_frames INTEGER DEFAULT 0,
  processing_fps FLOAT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES processing_jobs(id) ON DELETE CASCADE,
  total_vehicles INTEGER,
  total_cars INTEGER,
  total_trucks INTEGER,
  total_buses INTEGER,
  total_motorcycles INTEGER,
  directional_entering INTEGER DEFAULT 0,
  directional_exiting INTEGER DEFAULT 0,
  avg_speed_kmh FLOAT,
  max_speed_kmh FLOAT,
  processing_time_seconds FLOAT,
  output_video_url TEXT,
  heatmap_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS detections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  result_id UUID REFERENCES results(id) ON DELETE CASCADE,
  frame_number INTEGER,
  timestamp_seconds FLOAT,
  vehicle_count INTEGER,
  detections_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  result_id UUID REFERENCES results(id) ON DELETE CASCADE,
  track_id INTEGER,
  vehicle_type TEXT,
  first_seen_frame INTEGER,
  last_seen_frame INTEGER,
  total_frames INTEGER,
  avg_speed_kmh FLOAT,
  trajectory_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS share_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  result_id UUID REFERENCES results(id) ON DELETE CASCADE,
  share_code TEXT UNIQUE,
  views INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
