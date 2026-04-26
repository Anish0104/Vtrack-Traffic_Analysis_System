import os
from datetime import datetime
from typing import Optional, Any
from supabase import create_client, Client

class DatabaseClient:
    def __init__(self):
        url: str = os.getenv("SUPABASE_URL", "")
        key: str = os.getenv("SUPABASE_KEY", "")
        
        if url and key:
            try:
                self.supabase: Client = create_client(url, key)
                # Validate connectivity/schema at startup; otherwise local mode is more reliable.
                self.supabase.table("processing_jobs").select("id").limit(1).execute()
                self.enabled = True
            except Exception as e:
                print(f"⚠️ Failed to initialize Supabase client: {e}")
                print("⚠️ Falling back to local (no-database) mode.")
                self.enabled = False
        else:
            print("⚠️ Supabase credentials not found. Database integration disabled.")
            self.enabled = False
            
    def insert_video(self, filename: str, duration: float, fps: int, file_size_mb: float = 0.0, resolution: str = ""):
        if not self.enabled: return "dummy_video_uuid"
        try:
            print(f"[DB] insert_video called: filename={filename}, duration={duration}, fps={fps}")
            data = self.supabase.table("videos").insert({
                "filename": filename,
                "duration_seconds": duration,
                "fps": fps,
                "resolution": resolution,
                "file_size_mb": file_size_mb
            }).execute()
            video_id = data.data[0]['id']
            print(f"[DB] insert_video SUCCESS: {video_id}")
            return video_id
        except Exception as e:
            print(f"[DB] insert_video FAILED: {e}")
            import traceback
            traceback.print_exc()
            return None

    def set_video_calibration(self, video_id: str, pixels_per_meter: float):
        if not self.enabled or video_id == "dummy_video_uuid": return
        try:
            self.supabase.table("videos").update({"pixels_per_meter": pixels_per_meter}).eq("id", video_id).execute()
        except Exception as e:
            print(f"DB Error (calibration): {e}")

    def set_video_counting_line(self, video_id: str, counting_line: list, direction: str):
        if not self.enabled or video_id == "dummy_video_uuid": return
        try:
            self.supabase.table("videos").update({
                "counting_line": counting_line,
                "count_direction": direction
            }).eq("id", video_id).execute()
        except Exception as e:
            print(f"DB Error (counting_line): {e}")

    def create_job(self, video_id: str, total_frames: int):
        if not self.enabled: return "dummy_job_uuid"
        try:
            data = self.supabase.table("processing_jobs").insert({
                "video_id": video_id,
                "status": "processing",
                "progress": 0,
                "current_frame": 0,
                "total_frames": total_frames,
                "started_at": datetime.utcnow().isoformat()
            }).execute()
            return data.data[0]['id']
        except Exception as e:
            print(f"DB Error (create_job): {e}")
            return None

    def update_job_progress(self, job_id: str, current_frame: int, progress: int, processing_fps: Optional[float] = None):
        if not self.enabled or job_id == "dummy_job_uuid": return
        try:
            updates: dict[str, Any] = {
                "current_frame": current_frame,
                "progress": progress
            }
            if processing_fps:
                updates["processing_fps"] = processing_fps
            self.supabase.table("processing_jobs").update(updates).eq("id", job_id).execute()
        except Exception as e:
            pass

    def complete_job_and_insert_results(self, job_id: str, stats: dict, processing_time_seconds: float):
        if not self.enabled or job_id == "dummy_job_uuid": return
        try:
            # SANITIZATION: Supabase JSONEncoder violently rejects Numpy types
            def sanitize_data(v):
                if isinstance(v, dict):
                    return {k: sanitize_data(val) for k, val in v.items()}
                elif isinstance(v, list):
                    return [sanitize_data(val) for val in v]
                elif isinstance(v, (int, float, str, bool, type(None))):
                    # It's already a safe primitive, but just to be absolutely sure we strip any subclass
                    if isinstance(v, bool): return bool(v)
                    if isinstance(v, int): return int(v)
                    if isinstance(v, float): return float(v)
                    return v
                elif hasattr(v, 'item'):
                    # It's a numpy scalar
                    val = v.item()
                    if isinstance(val, int): return int(val)
                    if isinstance(val, float): return float(val)
                    return val
                else:
                    # Fallback string cast for completely unknown objects
                    return str(v)
            
            clean_stats = sanitize_data(stats)
            
            print(f">>> [DATABASE DEBUG] Attempting insert into results for job: {job_id}")
            res = self.supabase.table("results").insert({
                "job_id": job_id,
                "total_vehicles": int(clean_stats["total"]),
                "total_cars": int(clean_stats["counts"].get("car", 0)),
                "total_trucks": int(clean_stats["counts"].get("truck", 0)),
                "total_buses": int(clean_stats["counts"].get("bus", 0)),
                "total_motorcycles": int(clean_stats["counts"].get("motorcycle", 0)),
                "avg_speed_kmh": float(clean_stats.get("avg_speed", 0.0)),
                "processing_time_seconds": float(processing_time_seconds)
            }).execute()
            
            print(f">>> [DATABASE DEBUG] Result insertion finished! Response Data: {res.data}")

            # Mark job as completed
            self.supabase.table("processing_jobs").update({
                "status": "completed",
                "progress": 100,
                "completed_at": datetime.utcnow().isoformat()
            }).eq("id", job_id).execute()
            print(f">>> [DATABASE DEBUG] Job {job_id} successfully marked as completed.")
            
        except Exception as e:
            print(f">>> [DATABASE DEBUG] FATAL EXCEPTION CAUGHT: {e}")
            import traceback
            traceback.print_exc()
            print(f"DB Error (complete_job): {e}")

    def insert_track(self, result_id: str, track_id: int, vehicle_type: str, first_frame: int, last_frame: int, total_frames: int, avg_speed: float, trajectory: list):
        if not self.enabled or result_id == "dummy_result_uuid": return
        try:
            self.supabase.table("tracks").insert({
                "result_id": result_id,
                "track_id": track_id,
                "vehicle_type": vehicle_type,
                "first_seen_frame": first_frame,
                "last_seen_frame": last_frame,
                "total_frames": total_frames,
                "avg_speed_kmh": avg_speed,
                "trajectory_json": trajectory
            }).execute()
        except Exception as e:
            print(f"DB Error (insert_track): {e}")
            
    def insert_detections(self, result_id: str, frame_number: int, timestamp_seconds: float, vehicle_count: int, detections: list):
        if not self.enabled or result_id == "dummy_result_uuid": return
        try:
            self.supabase.table("detections").insert({
                "result_id": result_id,
                "frame_number": frame_number,
                "timestamp_seconds": timestamp_seconds,
                "vehicle_count": vehicle_count,
                "detections_json": detections
            }).execute()
        except Exception as e:
            print(f"DB Error (insert_detections): {e}")

    def create_share_link(self, result_id: str, share_code: str, expires_at: Optional[str] = None):
        if not self.enabled or result_id == "dummy_result_uuid": return "dummy_share_code"
        try:
            data: dict[str, Any] = {"result_id": result_id, "share_code": share_code}
            if expires_at:
                data["expires_at"] = expires_at
                
            self.supabase.table("share_links").insert(data).execute()
            return share_code
        except Exception as e:
            print(f"DB Error (create_share_link): {e}")
            return None
