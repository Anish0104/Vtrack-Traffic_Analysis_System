import numpy as np
import cv2

class HeatmapGenerator:
    def __init__(self, width, height):
        self.width = width
        self.height = height
        # Accumulator for heatmap
        self.heatmap = np.zeros((height, width), dtype=np.float32)
        
    def add_point(self, x, y, weight=1.0):
        if 0 <= x < self.width and 0 <= y < self.height:
            self.heatmap[y, x] += weight
            
    def get_heatmap_image(self, bg_image=None):
        if np.max(self.heatmap) == 0:
            if bg_image is not None:
                return bg_image
            return np.zeros((self.height, self.width, 3), dtype=np.uint8)
            
        # Normalize
        norm_heatmap = cv2.normalize(self.heatmap, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        
        # Apply colormap
        colored_heatmap = cv2.applyColorMap(norm_heatmap, cv2.COLORMAP_JET)
        
        if bg_image is not None:
            # Blend
            result = cv2.addWeighted(bg_image, 0.6, colored_heatmap, 0.4, 0)
            return result
        return colored_heatmap
