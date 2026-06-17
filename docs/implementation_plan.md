# Implementation Plan: Google Maps Style Floating Layers Switcher

Move the base map and satellite layers selection from the sidebar control panel to a dedicated floating "Layers" control in the bottom-left corner of the map viewport, styled similarly to Google Maps.

## User Review Required

> [!IMPORTANT]
> The new floating Layers control will be positioned in the bottom-left corner (`absolute bottom-4 left-4 z-10`). 
> Since it uses custom vector SVG thumbnails for each map type, it does not rely on external static image assets, ensuring instant load time and offline capability.
>
> The map categories (Base Maps, Satellite, and Remote Sensing) will be visually separated with vertical dividers inside the expanded horizontal switcher panel to keep the layout organized and recognizable.

## Proposed Changes

### Frontend Components

#### [NEW] [MapLayersSwitcher.tsx](file:///c:/Users/PC/Desktop/stac-based-satellite-visualization-platform/frontend/src/components/MapLayersSwitcher.tsx)
- Create a dedicated component for the floating layers selection.
- Implement inline premium SVG thumbnails for each of the 6 map types (`openfreemap`, `osm`, `google-satellite`, `sentinel-2`, `sentinel-1`, `landsat-8`).
- Add collapsed state displaying the active layer thumbnail with a "Layers" label and stacked layers icon.
- Add expanded horizontal panel with smooth slide-in/fade-in animation (`animate-in slide-in-from-left-4 fade-in duration-200`) containing all layers, styled as circular/rounded cards with active border-sky-500 highlighting.
- Organize layers in 3 sections matching `LAYER_CATEGORIES` separated by clean vertical dividers.

#### [MODIFY] [MainLayout.tsx](file:///c:/Users/PC/Desktop/stac-based-satellite-visualization-platform/frontend/src/layouts/MainLayout.tsx)
- Remove the static "Lớp bản đồ nền & Vệ tinh" section (Section 3) from the sidebar.
- Import and render `<MapLayersSwitcher />` floating component at the bottom-left of the screen (`absolute bottom-4 left-4 z-10`).
- Ensure it overlays correctly on top of both `MapViewer` and `CompareViewer`.

### Style System

#### [MODIFY] [index.css](file:///c:/Users/PC/Desktop/stac-based-satellite-visualization-platform/frontend/src/index.css)
- Add keyframes/utility classes if needed for slide-in/fade-in transitions if Tailwind animations aren't fully imported.
- Ensure the Layers switcher cards have a solid 2px black border around the active and collapsed thumbnails to match the Google Maps design aesthetics.

---

## Verification Plan

### Automated Tests
- Run `npm run build` in the `frontend` folder to verify TypeScript compilation and build bundle output.

### Manual Verification
- Click on the floating collapsed "Layers" button to expand the panel.
- Verify the 6 base layers are grouped correctly with vertical dividers.
- Select different layers (e.g., Google Satellite, OpenFreeMap, Sentinel-2) and verify the map background updates instantly.
- Verify that the collapsed thumbnail updates to show the currently selected layer.
- Verify compatibility: switch to Comparison Mode (Compare tab) and ensure the floating Layers switcher still works and changes styles on both synchronized views.
