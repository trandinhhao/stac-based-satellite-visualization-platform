"""
Module client kết nối tới dịch vụ stac-fastapi cục bộ.
Thực hiện các yêu cầu GET/POST đồng bộ tới máy chủ STAC để quản lý và tìm kiếm dữ liệu ảnh vệ tinh.
"""

import os
import urllib.request
import json

# Lấy URL của dịch vụ stac-fastapi từ biến môi trường
STAC_API_URL = os.getenv("STAC_API_URL", "http://stac-fastapi:8080")

class STACClient:
    """
    Client kết nối và thực hiện các giao dịch HTTP tới dịch vụ stac-fastapi.
    """
    def __init__(self):
        self.base_url = STAC_API_URL.rstrip('/')

    def get(self, endpoint: str):
        """
        Thực hiện yêu cầu HTTP GET tới một endpoint STAC cụ thể.
        """
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            print(f"Lỗi truy vấn STAC API GET tại {url}: {e}")
            raise e

    def post(self, endpoint: str, data: dict):
        """
        Thực hiện yêu cầu HTTP POST gửi dữ liệu JSON tới một endpoint STAC cụ thể.
        """
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        try:
            payload = json.dumps(data).encode('utf-8')
            req = urllib.request.Request(
                url,
                data=payload,
                headers={'Content-Type': 'application/json'}
            )
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            print(f"Lỗi gửi STAC API POST tới {url} với dữ liệu {data}: {e}")
            raise e

# Thực thể client duy nhất cho toàn ứng dụng
stac_client = STACClient()
