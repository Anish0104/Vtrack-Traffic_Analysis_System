# Tracking utility functions
def filter_small_boxes(detections, min_area=100):
    return [d for d in detections if (d["box"][2] - d["box"][0]) * (d["box"][3] - d["box"][1]) > min_area]
