import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import unittest
from services.ai.detector import get_aoi_bbox, generate_mock_detections

class TestAIDetector(unittest.TestCase):
    def setUp(self):
        # Sample polygon around Hanoi (approx [105.80, 21.00] to [105.81, 21.01])
        self.sample_geom = {
            "type": "Polygon",
            "coordinates": [[
                [105.8000, 21.0000],
                [105.8100, 21.0000],
                [105.8100, 21.0100],
                [105.8000, 21.0100],
                [105.8000, 21.0000]
            ]]
        }

    def test_get_aoi_bbox_valid(self):
        """Test calculation of bounding box coordinates from a valid Polygon."""
        bbox = get_aoi_bbox(self.sample_geom)
        self.assertEqual(bbox, [105.8000, 21.0000, 105.8100, 21.0100])

    def test_get_aoi_bbox_invalid_fallback(self):
        """Test fallback default bbox when parsing fails or input is invalid."""
        # Test empty geom
        bbox = get_aoi_bbox({})
        self.assertEqual(bbox, [105.80, 21.02, 105.81, 21.03])
        
        # Test None input
        bbox = get_aoi_bbox(None)
        self.assertEqual(bbox, [105.80, 21.02, 105.81, 21.03])

    def test_generate_mock_detections_content(self):
        """Test mock detections outputs: classes, confidence, and boxes."""
        detections = generate_mock_detections(self.sample_geom)
        self.assertTrue(5 <= len(detections) <= 14)
        
        valid_classes = {"aircraft", "vehicle", "ship"}
        for det in detections:
            # Check keys
            self.assertIn("class", det)
            self.assertIn("confidence", det)
            self.assertIn("bbox", det)
            
            # Check class
            self.assertIn(det["class"], valid_classes)
            
            # Check confidence range
            self.assertTrue(0.78 <= det["confidence"] <= 0.97)
            
            # Check bbox bounds within the sample AOI bounding box limit
            xmin, ymin, xmax, ymax = det["bbox"]
            self.assertTrue(xmin >= 105.78) # Allow slight padding from centers
            self.assertTrue(xmax <= 105.83)
            self.assertTrue(ymin >= 20.98)
            self.assertTrue(ymax <= 21.03)

    def test_generate_mock_detections_class_filter(self):
        """Test mock detections using specific class filters."""
        for target_class in ["aircraft", "vehicle", "ship"]:
            detections = generate_mock_detections(self.sample_geom, class_filter=target_class)
            for det in detections:
                self.assertEqual(det["class"], target_class)

if __name__ == "__main__":
    unittest.main()
