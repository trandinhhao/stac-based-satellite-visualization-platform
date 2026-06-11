import urllib.request
import urllib.parse
import json

BASE_URL = "http://localhost:8000/api/aois"

# Test coordinates for a simple square around Hanoi (approx. 110m x 110m = 12100 sq m)
TEST_GEOMETRY = {
    "type": "Polygon",
    "coordinates": [[
        [105.8000, 21.0000],
        [105.8010, 21.0000],
        [105.8010, 21.0010],
        [105.8000, 21.0010],
        [105.8000, 21.0000]
    ]]
}

def make_request(url, method="GET", data=None, files=None):
    req_data = None
    headers = {}
    
    if data is not None:
        req_data = json.dumps(data).encode('utf-8')
        headers = {'Content-Type': 'application/json'}
        
    if files is not None:
        # Simple multipart form-data encoder for testing
        boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
        parts = []
        for field_name, (filename, file_content) in files.items():
            parts.append(f"--{boundary}")
            parts.append(f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"')
            parts.append('Content-Type: application/json\r\n')
            parts.append(file_content)
        parts.append(f"--{boundary}--")
        parts.append("")
        req_data = "\r\n".join(parts).encode('utf-8')
        headers = {'Content-Type': f'multipart/form-data; boundary={boundary}'}

    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode('utf-8')
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_content = e.read().decode('utf-8')
        print(f"HTTP ERROR {e.code} for {method} {url}: {err_content}")
        raise e

def run_tests():
    print("=== STARTING AOI API TESTS ===")
    
    # 1. Create AOI
    print("\n1. Testing Create AOI...")
    create_payload = {
        "name": "Hanoi Test Square",
        "description": "A 100m x 100m test square in Hanoi",
        "geometry": TEST_GEOMETRY
    }
    status, aoi = make_request(BASE_URL, method="POST", data=create_payload)
    print(f"Created AOI status: {status}")
    print(f"ID: {aoi.get('id')}")
    print(f"Calculated Area (sq m): {aoi.get('area')}")
    print(f"Calculated Perimeter (m): {aoi.get('perimeter')}")
    assert aoi.get("area") > 0, "Area calculation failed."
    assert aoi.get("perimeter") > 0, "Perimeter calculation failed."
    aoi_id = aoi["id"]

    # 2. List AOIs
    print("\n2. Testing List AOIs...")
    status, aois = make_request(BASE_URL, method="GET")
    print(f"List status: {status}, Total count: {len(aois)}")
    assert any(item["id"] == aoi_id for item in aois), "Created AOI not found in list."

    # 3. Update AOI
    print("\n3. Testing Update AOI...")
    update_payload = {
        "description": "Updated test square description"
    }
    status, updated_aoi = make_request(f"{BASE_URL}/{aoi_id}", method="PUT", data=update_payload)
    print(f"Update status: {status}")
    print(f"New Description: {updated_aoi.get('description')}")
    assert updated_aoi.get("description") == "Updated test square description", "Update failed."

    # 4. Export AOI GeoJSON
    print("\n4. Testing Export AOI...")
    status, geojson = make_request(f"{BASE_URL}/{aoi_id}/export", method="GET")
    print(f"Export status: {status}")
    print(f"GeoJSON Type: {geojson.get('type')}")
    print(f"Properties Name: {geojson.get('properties', {}).get('name')}")
    assert geojson.get("type") == "Feature", "Exported GeoJSON type is incorrect."
    
    # 5. Import AOI GeoJSON
    print("\n5. Testing Import AOI...")
    geojson_str = json.dumps(geojson)
    files = {
        "file": ("imported_aoi.geojson", geojson_str)
    }
    status, imported_aoi = make_request(f"{BASE_URL}/import", method="POST", files=files)
    print(f"Import status: {status}")
    print(f"Imported AOI ID: {imported_aoi.get('id')}")
    print(f"Imported AOI Name: {imported_aoi.get('name')}")
    imported_id = imported_aoi["id"]

    # 6. Delete both AOIs
    print("\n6. Testing Delete AOIs...")
    status, res1 = make_request(f"{BASE_URL}/{aoi_id}", method="DELETE")
    print(f"Delete original status: {status}, Message: {res1.get('message')}")
    
    status, res2 = make_request(f"{BASE_URL}/{imported_id}", method="DELETE")
    print(f"Delete imported status: {status}, Message: {res2.get('message')}")

    print("\n=== ALL TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    run_tests()
