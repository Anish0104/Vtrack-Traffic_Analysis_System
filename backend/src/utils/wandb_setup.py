import wandb
import os
from dotenv import load_dotenv

load_dotenv()

def init_wandb(project_name="vtrack-analytics", config=None):
    if not os.getenv("WANDB_API_KEY"):
        print("⚠️ WANDB_API_KEY not found. Skipping Weights & Biases initialization.")
        return None
        
    try:
        run = wandb.init(
            project=project_name,
            config=config or {},
            job_type="inference",
        )
        print(f"✅ Weights & Biases initialized. run_id: {run.id}")
        return run
    except Exception as e:
        print(f"Error initializing W&B: {e}")
        return None

def log_experiment_stats(run, stats: dict):
    if run:
        wandb.log({
            "fps": stats.get("fps"),
            "processing_duration": stats.get("duration"),
            "total_vehicles": stats.get("total"),
            "avg_speed": stats.get("avg_speed"),
            "car_count": stats["counts"].get("car", 0),
            "truck_count": stats["counts"].get("truck", 0)
        })
