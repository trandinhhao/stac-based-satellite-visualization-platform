import os
import urllib.request
import json

STAC_API_URL = os.getenv("STAC_API_URL", "http://stac-fastapi:8080")

class STACClient:
    def __init__(self):
        self.base_url = STAC_API_URL.rstrip('/')

    def get(self, endpoint: str):
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            print(f"STAC API GET error on {url}: {e}")
            raise e

    def post(self, endpoint: str, data: dict):
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
            print(f"STAC API POST error on {url} with body {data}: {e}")
            raise e

stac_client = STACClient()
