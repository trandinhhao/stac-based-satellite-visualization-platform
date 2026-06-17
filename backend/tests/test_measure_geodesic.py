import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import unittest
from unittest.mock import MagicMock
from fastapi import HTTPException
from api.measure import calculate_measurement

class TestMeasureGeodesic(unittest.TestCase):
    def setUp(self):
        # Setup mocked database session
        self.mock_db = MagicMock()

    def test_calculate_measurement_missing_geometry(self):
        """Test that missing geometry returns HTTP 400."""
        payload = {}
        with self.assertRaises(HTTPException) as context:
            calculate_measurement(payload, self.mock_db)
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("geometry", context.exception.detail)

    def test_calculate_measurement_invalid_type(self):
        """Test that invalid geometry types (e.g. Point) return HTTP 400."""
        payload = {
            "geometry": {
                "type": "Point",
                "coordinates": [105.8, 21.0]
            }
        }
        with self.assertRaises(HTTPException) as context:
            calculate_measurement(payload, self.mock_db)
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("LineString", context.exception.detail)

    def test_calculate_measurement_linestring(self):
        """Test distance calculation for a LineString geometry with mocked DB response."""
        payload = {
            "geometry": {
                "type": "LineString",
                "coordinates": [[105.8, 21.0], [105.81, 21.01]]
            }
        }
        
        # Mock DB execute result for ST_Length
        mock_result = MagicMock()
        mock_result.fetchone.return_value = (1500.5,) # 1500.5 meters
        self.mock_db.execute.return_value = mock_result
        
        res = calculate_measurement(payload, self.mock_db)
        self.assertEqual(res["type"], "distance")
        self.assertEqual(res["distance"], 1500.5)
        self.assertEqual(res["unit"], "m")
        self.mock_db.execute.assert_called_once()

    def test_calculate_measurement_polygon(self):
        """Test area and perimeter calculation for a Polygon with mocked DB response."""
        payload = {
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[105.8, 21.0], [105.81, 21.0], [105.81, 21.01], [105.8, 21.01], [105.8, 21.0]]]
            }
        }
        
        # Mock DB execute result for ST_Area and ST_Perimeter
        mock_result = MagicMock()
        mock_result.fetchone.return_value = (12000.0, 440.0) # area=12000m2, perimeter=440m
        self.mock_db.execute.return_value = mock_result
        
        res = calculate_measurement(payload, self.mock_db)
        self.assertEqual(res["type"], "area")
        self.assertEqual(res["area"], 12000.0)
        self.assertEqual(res["perimeter"], 440.0)
        self.assertEqual(res["unit_area"], "m2")
        self.mock_db.execute.assert_called_once()

    def test_calculate_measurement_db_error(self):
        """Test that database query errors are wrapped in HTTP 400 exceptions."""
        payload = {
            "geometry": {
                "type": "LineString",
                "coordinates": [[105.8, 21.0], [105.81, 21.01]]
            }
        }
        self.mock_db.execute.side_effect = Exception("PostGIS calculation failed")
        
        with self.assertRaises(HTTPException) as context:
            calculate_measurement(payload, self.mock_db)
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("PostGIS", context.exception.detail)

if __name__ == "__main__":
    unittest.main()
