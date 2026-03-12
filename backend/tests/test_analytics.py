import pytest
from src.analytics.counter import VehicleCounter

def test_counter():
    counter = VehicleCounter()
    detections = [
        {"track_id": 1, "class_name": "car"},
        {"track_id": 2, "class_name": "car"},
        {"track_id": 3, "class_name": "bus"}
    ]
    counter.update(detections)
    assert counter.get_total() == 3
    assert counter.get_counts()["car"] == 2
