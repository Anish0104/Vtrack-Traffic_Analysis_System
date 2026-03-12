from ultralytics import YOLO

class VehicleDetector:
    def __init__(self, model_path="yolov8s.pt", device=None):
        self.model = YOLO(model_path)
        # Filter classes: 2: car, 3: motorcycle, 5: bus, 7: truck (COCO dataset)
        self.target_classes = [2, 3, 5, 7]
        self.device = device

    def detect(self, frame):
        # Base detection method (if separate from tracking)
        results = self.model(frame, classes=self.target_classes, verbose=False, device=self.device)
        return results
