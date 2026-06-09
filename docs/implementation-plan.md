# Revert Remote Sensing Placeholder Layers & Coordinates

Revert the offline/local satellite imagery samples (Sentinel-1, Landsat-8, and PlanetScope) to the lightweight GDAL autotest files (`byte.tif` and `rgbsmall.tif`) and restore the maps and bookmarks to their original working boundaries (California, USA and Rio de Janeiro, Brazil).

## User Review Required

> [!IMPORTANT]
> - **Sentinel-1 & Landsat-8**: Reverting back to `byte.tif` (1-band uint8 grayscale, bounds in California, USA). Colormaps will be restored (`bone` for Sentinel-1 and `terrain` for Landsat-8) without any rescale parameters.
> - **PlanetScope**: Reverting back to `rgbsmall.tif` (3-band RGB, bounds in Rio de Janeiro, Brazil). No colormap is required since it is a true-color image.
> - **Bookmarks**: Reverting coordinates to California (`[-117.635, 33.897]`) and Rio de Janeiro (`[-44.7545, -23.0183]`).

## Proposed Changes

### Scripts

#### [MODIFY] [download_samples.py](file:///c:/Users/PC/Desktop/stac-based-satellite-visualization-platform/scripts/download_samples.py)
- Change URLs inside `files_to_download` to point to:
  - `sentinel1.tif` -> `https://raw.githubusercontent.com/OSGeo/gdal/master/autotest/gcore/data/byte.tif`
  - `landsat8.tif` -> `https://raw.githubusercontent.com/OSGeo/gdal/master/autotest/gcore/data/byte.tif`
  - `planetscope.tif` -> `https://raw.githubusercontent.com/OSGeo/gdal/master/autotest/gcore/data/rgbsmall.tif`
  - `sentinel2.tif` -> `https://raw.githubusercontent.com/OSGeo/gdal/master/autotest/gcore/data/rgbsmall.tif`

### Frontend

#### [MODIFY] [MapViewer.tsx](file:///c:/Users/PC/Desktop/stac-based-satellite-visualization-platform/frontend/src/components/MapViewer.tsx)
- Revert config bounds, URLs, and colormaps for local/offline layers:
  - `sentinel-1`: url `/cog/tiles/{z}/{x}/{y}.png?url=/data/samples/sentinel1.tif&colormap_name=bone`, bounds `[-117.64204279334717, 33.891546129503816, -117.6289845627537, 33.90243533203516]`, zoom limits `minzoom: 11, maxzoom: 18`.
  - `landsat-8`: url `/cog/tiles/{z}/{x}/{y}.png?url=/data/samples/landsat8.tif&colormap_name=terrain`, bounds `[-117.64204279334717, 33.891546129503816, -117.6289845627537, 33.90243533203516]`, zoom limits `minzoom: 11, maxzoom: 18`.
  - `planet-scope`: url `/cog/tiles/{z}/{x}/{y}.png?url=/data/samples/planetscope.tif`, bounds `[-44.84032, -23.104184, -44.66872, -22.932584]`, zoom limits `minzoom: 9, maxzoom: 18`.

#### [MODIFY] [MainLayout.tsx](file:///c:/Users/PC/Desktop/stac-based-satellite-visualization-platform/frontend/src/layouts/MainLayout.tsx)
- Revert sample locations bookmarks on the sidebar to:
  - California (Sentinel-1) center `[-117.635, 33.897]`, zoom `14`
  - California (Landsat-8) center `[-117.635, 33.897]`, zoom `14`
  - Rio de Janeiro (PlanetScope) center `[-44.7545, -23.0183]`, zoom `11`

## Verification Plan

### Automated Tests
1. Run `python scripts/download_samples.py` to download the light-weight placeholder datasets.
2. Query TiTiler API endpoints for tiles to ensure they respond with status code `200`:
   - Sentinel-1: `curl -I "http://localhost:8002/cog/tiles/14/2838/6016.png?url=/data/samples/sentinel1.tif&colormap_name=bone"`
   - Landsat-8: `curl -I "http://localhost:8002/cog/tiles/14/2838/6016.png?url=/data/samples/landsat8.tif&colormap_name=terrain"`
   - PlanetScope: `curl -I "http://localhost:8002/cog/tiles/11/882/1154.png?url=/data/samples/planetscope.tif"`

### Manual Verification
1. Restart the frontend container with `docker restart frontend` to ensure Vite clears cached JS bundle.
2. Open Web Browser and hard reload (Ctrl + F5).
3. Test bookmark clicking and check if maps render the overlay correctly on California and Rio de Janeiro.
