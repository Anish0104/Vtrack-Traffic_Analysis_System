import cv2
import numpy as np

from src.detection.detector import VehicleDetector
from src.tracking.tracker import VehicleTracker
from src.analytics.counter import VehicleCounter
from src.analytics.trajectory import TrajectoryTracker
from src.analytics.heatmap import HeatmapGenerator
from src.analytics.speed import SpeedEstimator
from src.pipeline.video_handler import VideoHandler
import src.utils.visualization as viz
import time
import wandb

class VideoProcessor:
    def __init__(self, model_path="yolov8n.pt", device=None):
        self.detector = VehicleDetector(model_path, device)
        self.tracker = VehicleTracker(self.detector)

    def process(self, video_path, output_path, progress_callback=None, pixels_per_meter=20.0, counting_line=None, count_direction="both"):
        start_time = time.time()
        video_handler = VideoHandler(video_path, output_path)
        props = video_handler.open()
        
        fps = props["fps"]
        total_frames = props["total_frames"]
        width = props["width"]
        height = props["height"]
        
        counter = VehicleCounter(counting_line=counting_line)
        traj_tracker = TrajectoryTracker()
        heatmap_gen = HeatmapGenerator(width, height)
        speed_est = SpeedEstimator(fps=fps, pixels_per_meter=pixels_per_meter)
        
        frame_idx = 0
        
        while True:
            ret, frame = video_handler.read_frame()
            if not ret:
                break
                
            frame_idx += 1
            if progress_callback and frame_idx % 30 == 0:
                progress = frame_idx / total_frames
                progress_callback(progress, f"Processing frame {frame_idx}/{total_frames}")
                
            # Run detection and tracking
            detections = self.tracker.track(frame, tracker_config="bytetrack.yaml")
            
            # Update analytics
            counter.update(detections)
            traj_tracker.update(detections)
            
            for det in detections:
                track_id = det["track_id"]
                box = det["box"]
                x1, y1, x2, y2 = map(int, box)
                cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                
                # Update heatmap
                heatmap_gen.add_point(cx, cy, weight=0.5)
                
                # Estimate speed
                points = traj_tracker.get_points(track_id)
                if len(points) >= 5:
                    p1 = points[-5]
                    p2 = points[-1]
                    speed_est.estimate_speed(track_id, p1, p2)
                    speed_est.speeds[track_id] = speed_est.speeds[track_id] / 5.0 # Adjusted for 5 frames gap
            
            # Visualizations
            # Disabled heatmap on every frame for massive performance boost
            frame_with_hm = frame.copy()
            
            viz.draw_trajectories(frame_with_hm, traj_tracker.get_all_trajectories())
            viz.draw_bounding_boxes(frame_with_hm, detections, speeds=speed_est.speeds)
            viz.draw_stats(frame_with_hm, counter.get_counts(), fps=fps)
            if counting_line:
                viz.draw_counting_line(frame_with_hm, counting_line, count_direction)
            
            video_handler.write_frame(frame_with_hm)
            
        video_handler.release()
        
        processing_time = time.time() - start_time
        
        stats = {
            "total": int(counter.get_total()),
            "fps": float(fps),
            "duration": float(total_frames / fps if fps > 0 else 0),
            "counts": dict(counter.get_counts()),
            "directional": dict(counter.directional_counts),
            "avg_speed": float(speed_est.get_average_speed()),
            "model": "yolov8s"
        }
        
        # Log to wandb if enabled
        try:
            wandb.log({
                "video_fps": fps,
                "total_vehicles": stats["total"],
                "avg_speed": stats["avg_speed"],
                "processing_time": processing_time,
                "cars": stats["counts"].get("car", 0),
                "trucks": stats["counts"].get("truck", 0)
            })
            wandb.finish()
        except:
            pass
        
        return output_path, stats, traj_tracker.get_all_trajectories()
