import cv2

class VideoHandler:
    def __init__(self, input_path, output_path):
        self.input_path = input_path
        self.output_path = output_path
        self.cap = None
        self.out = None
        self.properties = {}

    def open(self):
        self.cap = cv2.VideoCapture(self.input_path)
        if not self.cap.isOpened():
            raise ValueError(f"Error opening video file: {self.input_path}")
            
        width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = int(self.cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        self.properties = {
            "width": width,
            "height": height,
            "fps": fps,
            "total_frames": total_frames
        }
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v') # use mp4v for mp4
        self.out = cv2.VideoWriter(self.output_path, fourcc, fps, (width, height))
        return self.properties

    def read_frame(self):
        if self.cap is None or not self.cap.isOpened():
            return False, None
        return self.cap.read()

    def write_frame(self, frame):
        if self.out is not None:
            self.out.write(frame)

    def release(self):
        if self.cap:
            self.cap.release()
        if self.out:
            self.out.release()
