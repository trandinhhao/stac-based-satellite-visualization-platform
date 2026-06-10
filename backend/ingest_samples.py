import psycopg2
import json
import os
import sys

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgis:5432/postgis")

COLLECTIONS = [
    {
        "id": "sentinel-2-l2a",
        "stac_version": "1.0.0",
        "description": "Copernicus Sentinel-2 Level-2A imagery",
        "license": "proprietary",
        "extent": {
            "spatial": {"bbox": [[-45.0, -24.0, -44.0, -22.0]]},
            "temporal": {"interval": [["2025-01-01T00:00:00Z", "2025-12-31T23:59:59Z"]]}
        },
        "links": []
    },
    {
        "id": "sentinel-1-grd",
        "stac_version": "1.0.0",
        "description": "Copernicus Sentinel-1 Synthetic Aperture Radar (SAR)",
        "license": "proprietary",
        "extent": {
            "spatial": {"bbox": [[-118.0, 33.0, -117.0, 34.0]]},
            "temporal": {"interval": [["2025-01-01T00:00:00Z", "2025-12-31T23:59:59Z"]]}
        },
        "links": []
    },
    {
        "id": "landsat-8-c2-l2",
        "stac_version": "1.0.0",
        "description": "Landsat 8 Collection 2 Level-2 imagery",
        "license": "proprietary",
        "extent": {
            "spatial": {"bbox": [[-118.0, 33.0, -117.0, 34.0]]},
            "temporal": {"interval": [["2025-01-01T00:00:00Z", "2025-12-31T23:59:59Z"]]}
        },
        "links": []
    },
    {
        "id": "planetscope-ortho",
        "stac_version": "1.0.0",
        "description": "PlanetScope high-resolution orthorectified imagery",
        "license": "proprietary",
        "extent": {
            "spatial": {"bbox": [[-45.0, -24.0, -44.0, -22.0]]},
            "temporal": {"interval": [["2025-01-01T00:00:00Z", "2025-12-31T23:59:59Z"]]}
        },
        "links": []
    }
]

ITEMS = [
    {
        "id": "sentinel-2-rio-2025",
        "type": "Feature",
        "stac_version": "1.0.0",
        "collection": "sentinel-2-l2a",
        "bbox": [-44.84032, -23.104184, -44.66872, -22.932584],
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [-44.84032, -23.104184],
                [-44.66872, -23.104184],
                [-44.66872, -22.932584],
                [-44.84032, -22.932584],
                [-44.84032, -23.104184]
            ]]
        },
        "properties": {
            "datetime": "2025-03-15T03:22:00Z",
            "eo:cloud_cover": 8.2,
            "platform": "sentinel-2"
        },
        "assets": {
            "visual": {
                "href": "/data/samples/sentinel2.tif",
                "type": "image/tiff; application=geotiff; profile=cloud-optimized",
                "title": "True Color RGB"
            },
            "thumbnail": {
                "href": "/cog/preview.png?url=/data/samples/sentinel2.tif",
                "type": "image/png",
                "title": "Thumbnail preview"
            }
        },
        "links": []
    },
    {
        "id": "planetscope-rio-2025",
        "type": "Feature",
        "stac_version": "1.0.0",
        "collection": "planetscope-ortho",
        "bbox": [-44.84032, -23.104184, -44.66872, -22.932584],
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [-44.84032, -23.104184],
                [-44.66872, -23.104184],
                [-44.66872, -22.932584],
                [-44.84032, -22.932584],
                [-44.84032, -23.104184]
            ]]
        },
        "properties": {
            "datetime": "2025-05-20T14:10:00Z",
            "eo:cloud_cover": 1.5,
            "platform": "planetscope"
        },
        "assets": {
            "visual": {
                "href": "/data/samples/planetscope.tif",
                "type": "image/tiff; application=geotiff; profile=cloud-optimized",
                "title": "Visual RGB"
            },
            "thumbnail": {
                "href": "/cog/preview.png?url=/data/samples/planetscope.tif",
                "type": "image/png",
                "title": "Thumbnail preview"
            }
        },
        "links": []
    },
    {
        "id": "sentinel-1-california-2025",
        "type": "Feature",
        "stac_version": "1.0.0",
        "collection": "sentinel-1-grd",
        "bbox": [-117.64204279334717, 33.891546129503816, -117.6289845627537, 33.90243533203516],
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [-117.64204279334717, 33.891546129503816],
                [-117.6289845627537, 33.891546129503816],
                [-117.6289845627537, 33.90243533203516],
                [-117.64204279334717, 33.90243533203516],
                [-117.64204279334717, 33.891546129503816]
            ]]
        },
        "properties": {
            "datetime": "2025-04-10T12:00:00Z",
            "eo:cloud_cover": 0.0,
            "platform": "sentinel-1"
        },
        "assets": {
            "visual": {
                "href": "/data/samples/sentinel1.tif",
                "type": "image/tiff; application=geotiff; profile=cloud-optimized",
                "title": "SAR Backscatter Intensity"
            },
            "thumbnail": {
                "href": "/cog/preview.png?url=/data/samples/sentinel1.tif&colormap_name=bone",
                "type": "image/png",
                "title": "Thumbnail preview"
            }
        },
        "links": []
    },
    {
        "id": "landsat-8-california-2025",
        "type": "Feature",
        "stac_version": "1.0.0",
        "collection": "landsat-8-c2-l2",
        "bbox": [-117.64204279334717, 33.891546129503816, -117.6289845627537, 33.90243533203516],
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [-117.64204279334717, 33.891546129503816],
                [-117.6289845627537, 33.891546129503816],
                [-117.6289845627537, 33.90243533203516],
                [-117.64204279334717, 33.90243533203516],
                [-117.64204279334717, 33.891546129503816]
            ]]
        },
        "properties": {
            "datetime": "2025-06-18T18:30:00Z",
            "eo:cloud_cover": 5.0,
            "platform": "landsat-8"
        },
        "assets": {
            "visual": {
                "href": "/data/samples/landsat8.tif",
                "type": "image/tiff; application=geotiff; profile=cloud-optimized",
                "title": "Multispectral Bands"
            },
            "thumbnail": {
                "href": "/cog/preview.png?url=/data/samples/landsat8.tif&colormap_name=terrain",
                "type": "image/png",
                "title": "Thumbnail preview"
            }
        },
        "links": []
    }
]

def main():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # 1. Ingest Collections
        for coll in COLLECTIONS:
            print(f"Creating collection {coll['id']}...")
            cur.execute("SELECT pgstac.create_collection(%s::jsonb);", (json.dumps(coll),))
            
        # 2. Ingest Items
        for item in ITEMS:
            print(f"Creating item {item['id']} in collection {item['collection']}...")
            cur.execute("SELECT pgstac.create_item(%s::jsonb);", (json.dumps(item),))
            
        conn.commit()
        print("Ingestion completed successfully!")
        
    except Exception as e:
        print(f"Error during ingestion: {e}")
        sys.exit(1)
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()
