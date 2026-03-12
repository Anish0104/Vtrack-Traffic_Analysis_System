class VehicleTracker:
    def __init__(self, detector):
        self.detector = detector

    def track(self, frame, tracker_config="bytetrack.yaml"):
        # We leverage YOLOv8's built-in tracking which uses ByteTrack natively
        results = self.detector.model.track(
            frame, 
            persist=True, 
            tracker=tracker_config, 
            classes=self.detector.target_classes,
            verbose=False,
            device=self.detector.device,
            imgsz=320 # Hardcoded for speed on CPU
        )
        
        detections = []
        if results and len(results) > 0 and results[0].boxes and results[0].boxes.id is not None:
            boxes = results[0].boxes.xyxy.cpu().numpy()
            track_ids = results[0].boxes.id.int().cpu().numpy()
            clss = results[0].boxes.cls.cpu().numpy()
            
            for box, track_id, cls in zip(boxes, track_ids, clss):
                class_name = self.detector.model.names[int(cls)]
                detections.append({
                    "box": box, # [x1, y1, x2, y2]
                    "track_id": track_id,
                    "class_name": class_name,
                    "class_id": int(cls)
                })
                
        return detections
