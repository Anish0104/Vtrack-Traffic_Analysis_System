import os
import json
import time
import uuid
import traceback
import cv2
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import gradio as gr
import psutil

from src.pipeline.processor import VideoProcessor
from src.utils.database import DatabaseClient

app = FastAPI(title="Vtrack API")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = "/tmp" if os.environ.get("VERCEL") else "."
os.makedirs(os.path.join(BASE_DIR, "outputs"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "videos"), exist_ok=True)

db = DatabaseClient()
local_jobs: dict[str, dict] = {}
local_results: dict[str, dict] = {}

@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    file_path = os.path.join(BASE_DIR, "videos", f"{uuid.uuid4()}_{file.filename}")
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
        
    # Get video metadata
    cap = cv2.VideoCapture(file_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps else 0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    
    resolution = f"{width}x{height}"
    file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
    
    if db.enabled:
        video_id = db.insert_video(file.filename, duration, int(fps), file_size_mb, resolution)
        # We also create a job immediately for simplicity or let the client call process
        job_id = db.create_job(video_id, total_frames) if video_id else None
    else:
        video_id = None
        job_id = None

    if not video_id or not job_id:
        video_id = str(uuid.uuid4())
        job_id = str(uuid.uuid4())
        local_jobs[job_id] = {
            "id": job_id,
            "video_id": video_id,
            "status": "uploaded",
            "progress": 0,
            "current_frame": 0,
            "total_frames": total_frames,
            "created_at": time.time(),
            "file_path": file_path,
        }
    
    return {
        "video_id": video_id,
        "job_id": job_id,
        "file_path": file_path,
        "metadata": {
            "fps": fps,
            "duration": duration,
            "resolution": resolution,
            "total_frames": total_frames
        }
    }

def process_video_background(job_id: str, file_path: str, total_frames: int, pixels_per_meter: float = 20.0, counting_line: list | None = None, count_direction: str = "both"):
    try:
        output_path = os.path.join(BASE_DIR, "outputs", f"processed_{os.path.basename(file_path)}")
        start_time = time.time()
        
        def progress_callback(prog, msg):
            current_frame = int(prog * total_frames)
            elapsed = time.time() - start_time
            processing_fps = current_frame / elapsed if elapsed > 0 else 0
            if db.enabled:
                db.update_job_progress(job_id, current_frame, int(prog * 100), processing_fps)
            elif job_id in local_jobs:
                local_jobs[job_id].update({
                    "status": "processing",
                    "current_frame": current_frame,
                    "progress": int(prog * 100),
                    "processing_fps": processing_fps,
                })
            
        processor = VideoProcessor("yolov8s.pt")
        out_path, stats, trajectories = processor.process(file_path, output_path, progress_callback, pixels_per_meter=pixels_per_meter, counting_line=counting_line, count_direction=count_direction)
        
        processing_time = time.time() - start_time
        if db.enabled:
            db.complete_job_and_insert_results(job_id, stats, processing_time)
        else:
            local_results[job_id] = {
                "job_id": job_id,
                "total_vehicles": int(stats.get("total", 0)),
                "total_cars": int(stats.get("counts", {}).get("car", 0)),
                "total_trucks": int(stats.get("counts", {}).get("truck", 0)),
                "total_buses": int(stats.get("counts", {}).get("bus", 0)),
                "total_motorcycles": int(stats.get("counts", {}).get("motorcycle", 0)),
                "avg_speed_kmh": float(stats.get("avg_speed", 0.0)),
                "processing_time_seconds": float(processing_time),
                "output_video_url": out_path,
            }
            if job_id in local_jobs:
                local_jobs[job_id].update({"status": "completed", "progress": 100, "completed_at": time.time()})
        
        # In a real app we'd upload this file to object storage and save the URL.
        # But for here, we just use local path.
        if db.enabled and job_id != "dummy_job_uuid":
            db.supabase.table("results").update({"output_video_url": out_path}).eq("job_id", job_id).execute()
            
    except Exception as e:
        print(f"Background processing error: {e}")
        traceback.print_exc()
        # update job status to failed if possible
        if db.enabled and job_id != "dummy_job_uuid":
            db.supabase.table("processing_jobs").update({"status": "failed", "error_message": str(e)}).eq("id", job_id).execute()
        elif job_id in local_jobs:
            local_jobs[job_id].update({"status": "failed", "error_message": str(e)})

@app.post("/api/process")
async def start_processing(job_id: str, file_path: str, total_frames: int, background_tasks: BackgroundTasks, pixels_per_meter: float = 20.0, counting_line: str | None = None, count_direction: str = "both"):
    line_coords = None
    if counting_line:
        try:
            line_coords = json.loads(counting_line)
        except:
            pass
            
    if db.enabled:
        try:
            job_res = db.supabase.table("processing_jobs").select("video_id").eq("id", job_id).execute()
            if job_res.data:
                db.set_video_counting_line(job_res.data[0]["video_id"], line_coords, count_direction)
        except:
            pass
    elif job_id in local_jobs:
        local_jobs[job_id].update({"status": "processing", "progress": 1})
            
    background_tasks.add_task(process_video_background, job_id, file_path, total_frames, pixels_per_meter, line_coords, count_direction)
    return {"status": "processing_started", "job_id": job_id}

@app.get("/api/status/{job_id}")
async def get_status(job_id: str):
    if not db.enabled:
        job_data = local_jobs.get(job_id)
        if not job_data:
            raise HTTPException(status_code=404, detail="Job not found")
        return job_data
    try:
        response = db.supabase.table("processing_jobs").select("*").eq("id", job_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Job not found")
            
        job_data = response.data[0]
        
        # Guard against Supabase Read-Replica sync lag:
        # If the job claims to be completed, verify the results are actually queryable.
        if job_data.get("status") == "completed":
            res_check = db.supabase.table("results").select("id").eq("job_id", job_id).execute()
            if not res_check.data:
                # Results haven't synced to this node yet! Fake it as processing for now.
                job_data["status"] = "processing"
                job_data["progress"] = 99
                
        return job_data
    except Exception as e:
        job_data = local_jobs.get(job_id)
        if job_data:
            return job_data
        raise HTTPException(status_code=404, detail="Job not found")

@app.get("/api/results/{job_id}")
async def get_results(job_id: str):
    if not db.enabled:
        result = local_results.get(job_id)
        if not result:
            raise HTTPException(status_code=404, detail="Results not found")
        return result
    try:
        response = db.supabase.table("results").select("*").eq("job_id", job_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Results not found")
        return response.data[0]
    except Exception as e:
        result = local_results.get(job_id)
        if result:
            return result
        raise HTTPException(status_code=404, detail="Results not found")

@app.get("/api/download/{job_id}")
async def download_video(job_id: str):
    if not db.enabled:
        result = local_results.get(job_id)
        if not result:
            raise HTTPException(status_code=404, detail="Results not found")
        file_path = result.get("output_video_url")
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found on server")
        return FileResponse(file_path, media_type="video/mp4", filename=os.path.basename(file_path))
    try:
        response = db.supabase.table("results").select("output_video_url").eq("job_id", job_id).execute()
        if not response.data or not response.data[0].get("output_video_url"):
            raise HTTPException(status_code=404, detail="Results or video not found")
            
        file_path = response.data[0].get("output_video_url")
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found on server")
            
        return FileResponse(file_path, media_type="video/mp4", filename=os.path.basename(file_path))
    except Exception as e:
        result = local_results.get(job_id)
        if result:
            file_path = result.get("output_video_url")
            if file_path and os.path.exists(file_path):
                return FileResponse(file_path, media_type="video/mp4", filename=os.path.basename(file_path))
        raise HTTPException(status_code=404, detail="Results or video not found")


@app.get("/api/global-stats")
async def get_global_stats():
    if not db.enabled:
        return {
            "total_processed": len(local_results),
            "total_vehicles": sum(r.get("total_vehicles", 0) for r in local_results.values()),
            "system_load": psutil.cpu_percent()
        }
    
    try:
        # Get total videos
        videos_res = db.supabase.table("videos").select("id", count="exact").execute()
        total_videos = videos_res.count if hasattr(videos_res, 'count') and videos_res.count is not None else (len(videos_res.data) if videos_res.data else 0)
        
        # Get total vehicles
        results_res = db.supabase.table("results").select("total_vehicles").execute()
        total_vehicles = sum(r.get("total_vehicles", 0) for r in results_res.data if isinstance(r.get("total_vehicles"), int))
        
        return {
            "total_processed": total_videos,
            "total_vehicles": total_vehicles,
            "system_load": psutil.cpu_percent()
        }
    except Exception as e:
        print(f"Error fetching global stats: {e}")
        return {
            "total_processed": len(local_results),
            "total_vehicles": sum(r.get("total_vehicles", 0) for r in local_results.values()),
            "system_load": psutil.cpu_percent()
        }

@app.get("/api/recent-activity")
async def get_recent_activity():
    if not db.enabled:
        return []
    try:
        # Fetch the most recent 5 completed or processing jobs
        res = db.supabase.table("processing_jobs").select("id, status, progress, created_at, videos(filename, duration_seconds)").order("created_at", desc=True).limit(5).execute()
        return res.data
    except Exception as e:
        print(f"Error fetching recent activity: {e}")
        return []


# --- GRADIO UI ---

def process_video(video_path, progress=gr.Progress()):
    if not video_path:
        return None, "Error: No video uploaded"
        
    try:
        # Define output paths
        output_dir = os.path.join(BASE_DIR, "outputs")
        os.makedirs(output_dir, exist_ok=True)
        filename = os.path.basename(video_path)
        output_path = os.path.join(output_dir, "processed_" + filename)
        
        # Get video metadata
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps else 0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
        
        resolution = f"{width}x{height}"
        file_size_mb = os.path.getsize(video_path) / (1024 * 1024)
        
        # Insert initial records
        video_id = db.insert_video(filename, duration, fps, file_size_mb, resolution)
        job_id = db.create_job(video_id, total_frames)
        
        start_time = time.time()
        
        def progress_callback(prog, msg):
            progress(prog, desc=msg)
            current_frame = int(prog * total_frames)
            elapsed = time.time() - start_time
            processing_fps = current_frame / elapsed if elapsed > 0 else 0
            
            db.update_job_progress(job_id, current_frame, int(prog * 100), processing_fps)
            
        progress(0, desc="Initializing YOLOv8 model...")
        processor = VideoProcessor("yolov8n.pt")
        
        progress(0.1, desc="Starting video processing pipeline...")
        out_path, stats, trajectories = processor.process(video_path, output_path, progress_callback)
        
        progress(1.0, desc="Processing complete!")
        processing_time = time.time() - start_time
        
        db.complete_job_and_insert_results(job_id, stats, processing_time)
        
        stats_str = json.dumps(stats, indent=2)
        
        return out_path, stats_str
        
    except Exception as e:
        return None, f"Error processing video: {str(e)}\n{traceback.format_exc()}"

def create_ui():
    with gr.Blocks(title="Vtrack - Real-time Video Analytics", theme=gr.themes.Soft()) as gradio_app:
        gr.Markdown("# Vtrack Data Analytics Dashboard")
        gr.Markdown("Upload a traffic video to detect vehicles, track trajectories, and generate analytics.")
        
        with gr.Row():
            with gr.Column(scale=1):
                video_input = gr.Video(label="Upload Traffic Video", sources=["upload"])
                process_btn = gr.Button("Process Video", variant="primary")
                stats_output = gr.Code(label="Analytics JSON Summary", language="json")
            
            with gr.Column(scale=2):
                video_output = gr.Video(label="Processed Video (Annotated)", interactive=False)
                
        process_btn.click(
            fn=process_video,
            inputs=video_input,
            outputs=[video_output, stats_output],
            api_name="process"
        )
        
    return gradio_app

gradio_app = create_ui()
app = gr.mount_gradio_app(app, gradio_app, path="/gradio")

# To run: uvicorn app:app --host 0.0.0.0 --port 7860
