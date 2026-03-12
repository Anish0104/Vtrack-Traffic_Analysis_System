import math

class SpeedEstimator:
    def __init__(self, fps, pixels_per_meter=30.0):
        self.fps = fps
        self.pixels_per_meter = pixels_per_meter
        self.speeds = {}  # track_id -> speed
        
    def estimate_speed(self, track_id, p1, p2):
        """
        p1, p2: (x, y) tuples from consecutive frames
        Returns estimated speed in km/h
        """
        if not p1 or not p2:
            return 0.0
            
        dx = p2[0] - p1[0]
        dy = p2[1] - p1[1]
        pixel_distance = math.sqrt(dx**2 + dy**2)
        
        # distance in meters
        distance_meters = pixel_distance / self.pixels_per_meter
        
        # speed in m/s = distance / time_per_frame
        # time_per_frame = 1.0 / fps
        speed_mps = distance_meters * self.fps
        
        # convert to km/h
        speed_kmh = speed_mps * 3.6
        
        self.speeds[track_id] = speed_kmh
        return speed_kmh
        
    def get_average_speed(self):
        if not self.speeds:
            return 0.0
        return sum(self.speeds.values()) / len(self.speeds)
