import json
import random
import logging

logger = logging.getLogger(__name__)

def get_aoi_bbox(geojson_geom: dict) -> list[float]:
    """
    Calculate bounding box [xmin, ymin, xmax, ymax] from GeoJSON Polygon coordinates.
    Fallback to a default bounding box in Hanoi if parsing fails.
    """
    try:
        coords = geojson_geom.get("coordinates", [])
        if not coords or not coords[0]:
            return [105.80, 21.02, 105.81, 21.03] # Default Hanoi fallback
        
        # Polygon coordinates is a list of loops, outer ring is first
        outer_ring = coords[0]
        lngs = [p[0] for p in outer_ring]
        lats = [p[1] for p in outer_ring]
        
        return [min(lngs), min(lats), max(lngs), max(lats)]
    except Exception as e:
        logger.error(f"Error calculating AOI bounding box: {e}")
        return [105.80, 21.02, 105.81, 21.03]

def generate_mock_detections(geojson_geom: dict, class_filter: str = None) -> list[dict]:
    """
    Generate realistic-looking mock bounding boxes inside the AOI bounding box bounds.
    """
    bbox = get_aoi_bbox(geojson_geom)
    xmin, ymin, xmax, ymax = bbox
    
    classes = ["aircraft", "vehicle", "ship"]
    if class_filter and class_filter in classes:
        classes = [class_filter]
        
    num_objects = random.randint(5, 14)
    detections = []
    
    for _ in range(num_objects):
        obj_class = random.choice(classes)
        
        # Bounding box center coordinates
        cx = random.uniform(xmin, xmax)
        cy = random.uniform(ymin, ymax)
        
        # Bounding box width/height in degrees (approx 15-40 meters on ground)
        # 1 degree lat is ~111km. 0.0001 deg is ~11m.
        if obj_class == "aircraft":
            w = random.uniform(0.00025, 0.0005)
            h = random.uniform(0.00025, 0.0005)
        elif obj_class == "ship":
            w = random.uniform(0.0003, 0.0006)
            h = random.uniform(0.00015, 0.0003)
        else: # vehicle
            w = random.uniform(0.00008, 0.00015)
            h = random.uniform(0.00008, 0.00015)
            
        detections.append({
            "class": obj_class,
            "confidence": round(random.uniform(0.78, 0.97), 2),
            "bbox": [cx - w/2, cy - h/2, cx + w/2, cy + h/2]
        })
        
    return detections
