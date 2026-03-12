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

os.makedirs("outputs", exist_ok=True)
os.makedirs("videos", exist_ok=True)

db = DatabaseClient()

@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    file_path = os.path.join("videos", f"{uuid.uuid4()}_{file.filename}")
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
    
    video_id = db.insert_video(file.filename, duration, int(fps), file_size_mb, resolution)
    if not video_id:
        raise HTTPException(status_code=500, detail="Failed to save video metadata to database")
    
    # We also create a job immediately for simplicity or let the client call process
    job_id = db.create_job(video_id, total_frames)
    if not job_id:
        raise HTTPException(status_code=500, detail="Failed to create processing job")
    
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
        output_path = os.path.join("outputs", f"processed_{os.path.basename(file_path)}")
        start_time = time.time()
        
        def progress_callback(prog, msg):
            current_frame = int(prog * total_frames)
            elapsed = time.time() - start_time
            processing_fps = current_frame / elapsed if elapsed > 0 else 0
            db.update_job_progress(job_id, current_frame, int(prog * 100), processing_fps)
            
        processor = VideoProcessor("yolov8s.pt")
        out_path, stats, trajectories = processor.process(file_path, output_path, progress_callback, pixels_per_meter=pixels_per_meter, counting_line=counting_line, count_direction=count_direction)
        
        processing_time = time.time() - start_time
        db.complete_job_and_insert_results(job_id, stats, processing_time)
        
        # In a real app we'd upload this file to object storage and save the URL.
        # But for here, we just use local path.
        if db.enabled and job_id != "dummy_job_uuid":
            db.supabase.table("results").update({"output_video_url": out_path}).eq("job_id", job_id).execute()
            
    except Exception as e:
        print(f"Background processing error: {e}")
        # update job status to failed if possible
        if db.enabled and job_id != "dummy_job_uuid":
            db.supabase.table("processing_jobs").update({"status": "failed", "error_message": str(e)}).eq("id", job_id).execute()

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
            
    background_tasks.add_task(process_video_background, job_id, file_path, total_frames, pixels_per_meter, line_coords, count_direction)
    return {"status": "processing_started", "job_id": job_id}

@app.get("/api/status/{job_id}")
async def get_status(job_id: str):
    if not db.enabled:
        return {"status": "Database disabled"}
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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/results/{job_id}")
async def get_results(job_id: str):
    if not db.enabled:
        return {"status": "Database disabled"}
    try:
        response = db.supabase.table("results").select("*").eq("job_id", job_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Results not found")
        return response.data[0]
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e) + " | " + traceback.format_exc())

@app.get("/api/download/{job_id}")
async def download_video(job_id: str):
    if not db.enabled:
        return {"status": "Database disabled"}
    try:
        response = db.supabase.table("results").select("output_video_url").eq("job_id", job_id).execute()
        if not response.data or not response.data[0].get("output_video_url"):
            raise HTTPException(status_code=404, detail="Results or video not found")
            
        file_path = response.data[0].get("output_video_url")
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found on server")
            
        return FileResponse(file_path, media_type="video/mp4", filename=os.path.basename(file_path))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/global-stats")
async def get_global_stats():
    if not db.enabled:
        return {"total_processed": 0, "total_vehicles": 0, "system_load": psutil.cpu_percent()}
    
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
        return {"total_processed": 0, "total_vehicles": 0, "system_load": psutil.cpu_percent(), "error": str(e)}

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
        output_dir = "outputs"
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
