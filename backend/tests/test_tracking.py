import pytest
from src.tracking.tracker import VehicleTracker
from src.detection.detector import VehicleDetector

def test_tracker_init():
    detector = VehicleDetector()
    tracker = VehicleTracker(detector)
    assert tracker is not None
