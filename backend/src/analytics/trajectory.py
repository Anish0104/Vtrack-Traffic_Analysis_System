class TrajectoryTracker:
    def __init__(self):
        self.trajectories = {}  # track_id -> list of (cx, cy)

    def update(self, detections):
        for det in detections:
            track_id = det["track_id"]
            box = det["box"]
            x1, y1, x2, y2 = map(int, box)
            cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
            
            if track_id not in self.trajectories:
                self.trajectories[track_id] = []
            self.trajectories[track_id].append((cx, cy))
            
    def get_points(self, track_id, max_history=30):
        if track_id in self.trajectories:
            return self.trajectories[track_id][-max_history:]
        return []
        
    def get_all_trajectories(self):
        return self.trajectories
