import pytest
from src.detection.detector import VehicleDetector

def test_detector_init():
    detector = VehicleDetector()
    assert detector is not None
    assert 2 in detector.target_classes
