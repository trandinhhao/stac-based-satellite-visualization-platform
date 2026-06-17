import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import unittest
from pydantic import ValidationError
from api.stac import normalize_datetime, SearchRequest

class TestSTACAPI(unittest.TestCase):
    def test_normalize_datetime_single_date(self):
        """Test normalization of a single YYYY-MM-DD date."""
        self.assertEqual(
            normalize_datetime("2025-01-01"),
            "2025-01-01T00:00:00Z/2025-01-01T23:59:59Z"
        )
        
    def test_normalize_datetime_date_range(self):
        """Test normalization of YYYY-MM-DD/YYYY-MM-DD date range."""
        self.assertEqual(
            normalize_datetime("2025-01-01/2025-01-31"),
            "2025-01-01T00:00:00Z/2025-01-31T23:59:59Z"
        )
        
    def test_normalize_datetime_already_normalized(self):
        """Test that already-normalized datetime strings are left unmodified."""
        self.assertEqual(
            normalize_datetime("2025-01-01T12:00:00Z/2025-01-31T18:30:00Z"),
            "2025-01-01T12:00:00Z/2025-01-31T18:30:00Z"
        )
        
    def test_normalize_datetime_empty(self):
        """Test empty/None values are preserved."""
        self.assertIsNone(normalize_datetime(None))
        self.assertEqual(normalize_datetime(""), "")

    def test_search_request_validation_valid(self):
        """Test SearchRequest validator with valid input parameters."""
        req = SearchRequest(
            collections=["sentinel-2"],
            bbox=[105.7, 20.9, 106.0, 21.3],
            datetime="2026-01-01/2026-12-31",
            limit=10
        )
        self.assertEqual(req.collections, ["sentinel-2"])
        self.assertEqual(req.limit, 10)

    def test_search_request_validation_default(self):
        """Test SearchRequest default values."""
        req = SearchRequest()
        self.assertEqual(req.limit, 50)
        self.assertIsNone(req.bbox)
        self.assertIsNone(req.datetime)

if __name__ == "__main__":
    unittest.main()
