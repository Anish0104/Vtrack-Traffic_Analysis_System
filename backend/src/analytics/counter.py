class VehicleCounter:
    def __init__(self, counting_line=None): # counting_line: [(x1,y1), (x2,y2)]
        self.vehicle_counts = {"car": 0, "motorcycle": 0, "bus": 0, "truck": 0}
        self.directional_counts = {"entering": 0, "exiting": 0}
        self.tracked_ids = set()
        self.counting_line = counting_line
        self.previous_positions = {} # track_id -> (x, y)

    def check_intersection(self, p1, p2, p3, p4):
        def ccw(A, B, C):
            return (C[1]-A[1]) * (B[0]-A[0]) > (B[1]-A[1]) * (C[0]-A[0])
        return ccw(p1, p3, p4) != ccw(p2, p3, p4) and ccw(p1, p2, p3) != ccw(p1, p2, p4)

    def update(self, detections):
        for det in detections:
            track_id = det["track_id"]
            class_name = det.get("class_name", "vehicle")
            box = det["box"]
            
            center_x = (box[0] + box[2]) / 2.0
            center_y = (box[1] + box[3]) / 2.0
            current_pos = (center_x, center_y)
            
            if self.counting_line is not None and len(self.counting_line) == 2:
                if track_id in self.previous_positions:
                    prev_pos = self.previous_positions[track_id]
                    if track_id not in self.tracked_ids:
                        line_pt1, line_pt2 = self.counting_line
                        if self.check_intersection(prev_pos, current_pos, line_pt1, line_pt2):
                            self.tracked_ids.add(track_id)
                            self.vehicle_counts[class_name] = self.vehicle_counts.get(class_name, 0) + 1
                            
                            cross_product = (line_pt2[0] - line_pt1[0]) * (current_pos[1] - prev_pos[1]) - (line_pt2[1] - line_pt1[1]) * (current_pos[0] - prev_pos[0])
                            if cross_product > 0:
                                self.directional_counts["entering"] += 1
                            else:
                                self.directional_counts["exiting"] += 1

                self.previous_positions[track_id] = current_pos
            else:
                if track_id not in self.tracked_ids:
                    self.tracked_ids.add(track_id)
                    self.vehicle_counts[class_name] = self.vehicle_counts.get(class_name, 0) + 1

    def get_counts(self):
        return self.vehicle_counts
        
    def get_total(self):
        return sum(self.vehicle_counts.values())
