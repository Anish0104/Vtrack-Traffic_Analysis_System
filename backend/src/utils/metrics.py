# Utilities for metric calculation

def calculate_density(vehicle_count, area_sq_meters):
    if area_sq_meters <= 0: return 0
    return vehicle_count / area_sq_meters
