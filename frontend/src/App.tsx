import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    if (mapContainer.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://tiles.openfreemap.org/styles/liberty', // OpenFreeMap Liberty style
        center: [105.8542, 21.0285], // Center coordinates for Hanoi [lng, lat]
        zoom: 12,
      });

      // Add zoom and rotation controls to the map
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      
      {/* Sleek Overlay Header to showcase rich aesthetics */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        backgroundColor: 'rgba(15, 23, 42, 0.85)', // Glassmorphism backdrop
        backdropFilter: 'blur(8px)',
        color: '#f8fafc',
        padding: '16px 24px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        zIndex: 1000
      }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600, letterSpacing: '-0.5px' }}>
          Hanoi City View
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
          Satellite & Map Visualization Platform
        </p>
      </div>
    </div>
  );
}

export default App;
