import os
import urllib.request

def download_file(url, filepath):
    try:
        print(f"Downloading {url} to {filepath}...")
        # Add a standard user agent to prevent download blocks
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response, open(filepath, 'wb') as out_file:
            out_file.write(response.read())
        print("Download completed successfully.")
    except Exception as e:
        print(f"Failed to download {url}. Error: {e}")

def main():
    samples_dir = os.path.join("datasets", "samples")
    os.makedirs(samples_dir, exist_ok=True)

    files_to_download = {
        "sentinel2.tif": "https://raw.githubusercontent.com/OSGeo/gdal/master/autotest/gcore/data/rgbsmall.tif",
        "sentinel1.tif": "https://raw.githubusercontent.com/OSGeo/gdal/master/autotest/gcore/data/byte.tif",
        "landsat8.tif": "https://raw.githubusercontent.com/OSGeo/gdal/master/autotest/gcore/data/byte.tif",
        "planetscope.tif": "https://raw.githubusercontent.com/OSGeo/gdal/master/autotest/gcore/data/rgbsmall.tif"
    }

    for filename, url in files_to_download.items():
        filepath = os.path.join(samples_dir, filename)
        download_file(url, filepath)

if __name__ == "__main__":
    main()
