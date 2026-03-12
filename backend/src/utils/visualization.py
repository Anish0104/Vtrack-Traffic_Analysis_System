import cv2
import numpy as np

def draw_bounding_boxes(frame, detections, speeds=None):
    if speeds is None:
        speeds = {}
        
    for det in detections:
        box = det["box"]
        track_id = det["track_id"]
        class_name = det["class_name"]
        
        x1, y1, x2, y2 = map(int, box)
        
        speed = speeds.get(track_id, 0.0)
        
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        label = f"{class_name} #{track_id} | {speed:.1f}km/h"
        cv2.putText(frame, label, (x1, max(10, y1 - 10)), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

def draw_trajectories(frame, trajectories_data, max_points=30):
    for track_id, points in trajectories_data.items():
        if len(points) > 2:
            pts = np.array(points[-max_points:], np.int32)
            pts = pts.reshape((-1, 1, 2))
            cv2.polylines(frame, [pts], False, (0, 255, 255), 2)

def draw_stats(frame, vehicle_counts, fps=None):
    y_offset = 30
    if fps is not None:
        cv2.putText(frame, f"FPS: {fps}", (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        y_offset += 30
        
    cv2.putText(frame, "Vehicle Count:", (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    for k, v in vehicle_counts.items():
        y_offset += 30
        cv2.putText(frame, f"{k}: {v}", (30, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

def draw_counting_line(frame, counting_line, direction='both'):
    if not counting_line or len(counting_line) != 2:
        return
        
    p1 = (int(counting_line[0][0]), int(counting_line[0][1]))
    p2 = (int(counting_line[1][0]), int(counting_line[1][1]))
    
    # Draw main line
    cv2.line(frame, p1, p2, (0, 165, 255), 3) # Orange
    
    # Draw direction indicator
    cx = (p1[0] + p2[0]) // 2
    cy = (p1[1] + p2[1]) // 2
    
    if direction == 'both':
        cv2.circle(frame, (cx, cy), 15, (0, 165, 255), 2)
    elif direction == 'entering':
        cv2.arrowedLine(frame, (cx, cy), (cx, cy - 30), (0, 165, 255), 3, tipLength=0.3)
    elif direction == 'exiting':
        cv2.arrowedLine(frame, (cx, cy), (cx, cy + 30), (0, 165, 255), 3, tipLength=0.3)
