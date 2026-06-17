import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import unittest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from api.jobs import create_job, JobCreate

class TestJobsAPI(unittest.TestCase):
    def setUp(self):
        # Mock database session
        self.mock_db = MagicMock()

    def test_create_job_invalid_type(self):
        """Test that creating a job with an invalid type raises HTTP 400."""
        data = JobCreate(
            job_type="invalid_task_type",
            aoi_id=None,
            payload={}
        )
        with self.assertRaises(HTTPException) as context:
            create_job(data, self.mock_db)
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("Loại job không hợp lệ", context.exception.detail)

    def test_create_job_invalid_aoi_uuid(self):
        """Test that invalid non-UUID aoi_id values raise HTTP 400."""
        data = JobCreate(
            job_type="aoi_extraction",
            aoi_id="non-uuid-string",
            payload={}
        )
        with self.assertRaises(HTTPException) as context:
            create_job(data, self.mock_db)
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("aoi_id không hợp lệ", context.exception.detail)

    @patch('api.jobs.process_aoi_task.apply_async')
    def test_create_job_aoi_extraction_success(self, mock_apply_async):
        """Test successful creation and dispatching of aoi_extraction task."""
        aoi_uuid_str = "e2d5c808-8e6f-4c54-9494-1a9ea8e9e1c2"
        data = JobCreate(
            job_type="aoi_extraction",
            aoi_id=aoi_uuid_str,
            payload={"datetime": "2025-01-01"}
        )
        
        # Mock DB response (insert)
        self.mock_db.execute.return_value = MagicMock()
        
        res = create_job(data, self.mock_db)
        self.assertEqual(res["status"], "queued")
        self.assertTrue(len(res["job_id"]) > 0)
        
        # Verify DB calls
        self.mock_db.execute.assert_called_once()
        self.mock_db.commit.assert_called_once()
        
        # Verify Celery dispatch
        mock_apply_async.assert_called_once_with(
            args=[res["job_id"], {"datetime": "2025-01-01"}],
            task_id=res["job_id"]
        )

    @patch('api.jobs.process_detection_task.apply_async')
    def test_create_job_object_detection_success(self, mock_apply_async):
        """Test successful creation and dispatching of object_detection task."""
        aoi_uuid_str = "e2d5c808-8e6f-4c54-9494-1a9ea8e9e1c2"
        data = JobCreate(
            job_type="object_detection",
            aoi_id=aoi_uuid_str,
            payload={"collection": "sentinel-2"}
        )
        
        # Mock DB response (insert)
        self.mock_db.execute.return_value = MagicMock()
        
        res = create_job(data, self.mock_db)
        self.assertEqual(res["status"], "queued")
        
        # Verify DB calls
        self.mock_db.execute.assert_called_once()
        self.mock_db.commit.assert_called_once()
        
        # Verify Celery dispatch
        mock_apply_async.assert_called_once_with(
            args=[res["job_id"], aoi_uuid_str, "sentinel-2"],
            task_id=res["job_id"]
        )

if __name__ == "__main__":
    unittest.main()
