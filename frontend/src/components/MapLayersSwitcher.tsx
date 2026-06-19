import { useState, useRef, useEffect } from 'react';
import { useMapStore } from '../store/useMapStore';

// Custom high-quality vector SVGs for each map thumbnail
const MapThumbnail = ({ type }: { type: string }) => {
  if (type === 'openfreemap') {
    return (
      <svg className="w-full h-full object-cover" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="80" height="80" fill="#E2E8F0" />
        <path d="M 0,20 Q 30,10 40,40 T 80,30 L 80,80 L 0,80 Z" fill="#F1F5F9" />
        <path d="M 30,0 Q 50,15 60,0 Z" fill="#D1FAE5" />
        <path d="M 0,60 Q 20,50 40,80 Z" fill="#D1FAE5" />
        <path d="M 0,0 Q 20,20 10,40 T 40,80 L 0,80 Z" fill="#BAE6FD" opacity="0.6" />
        <path d="M -10,30 L 90,50" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
        <path d="M -10,30 L 90,50" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
        <path d="M 50,-10 L 40,90" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
        <path d="M 50,-10 L 40,90" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 20,-10 L 70,90" stroke="#FEF08A" strokeWidth="3" strokeLinecap="round" />
        <path d="M 20,-10 L 70,90" stroke="#EAB308" strokeWidth="1" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'osm') {
    return (
      <svg className="w-full h-full object-cover" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="80" height="80" fill="#F4F3F0" />
        <path d="M 10,0 Q 30,30 20,60 T 50,80 L 0,80 L 0,0 Z" fill="#AAD3DF" />
        <path d="M 50,20 Q 70,30 80,10 L 80,50 Z" fill="#D0F0C0" />
        <path d="M 0,45 L 80,45" stroke="#FFFFFF" strokeWidth="5" />
        <path d="M 0,45 L 80,45" stroke="#FDB863" strokeWidth="2.5" />
        <path d="M 35,0 L 35,80" stroke="#FFFFFF" strokeWidth="4" />
        <path d="M 35,0 L 35,80" stroke="#FDB863" strokeWidth="2" />
        <path d="M 10,-10 L 80,60" stroke="#FEE2E2" strokeWidth="3" />
        <path d="M 10,-10 L 80,60" stroke="#EF4444" strokeWidth="1" />
      </svg>
    );
  }
  if (type === 'google-satellite') {
    return (
      <svg className="w-full h-full object-cover" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="80" height="80" fill="#143414" />
        <path d="M 10,20 Q 30,5 50,25 T 70,40 L 80,80 L 0,80 Z" fill="#0A250A" />
        <path d="M 0,0 Q 15,20 5,35 T 25,60 L 0,60 Z" fill="#0F2A4A" />
        <rect x="40" y="50" width="15" height="15" fill="#2D5E2D" stroke="#1D4E1D" strokeWidth="1" />
        <rect x="55" y="45" width="20" height="18" fill="#3D6E3D" stroke="#1D4E1D" strokeWidth="1" />
        <circle cx="65" cy="20" r="10" fill="#FFFFFF" opacity="0.15" />
        <circle cx="70" cy="23" r="7" fill="#FFFFFF" opacity="0.2" />
      </svg>
    );
  }
  if (type === 'sentinel-2') {
    return (
      <svg className="w-full h-full object-cover" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="80" height="80" fill="#064E3B" />
        <path d="M 15,0 L 80,65 L 80,80 L 0,80 Z" fill="#065F46" />
        <rect x="10" y="10" width="20" height="20" fill="#047857" opacity="0.8" />
        <rect x="30" y="10" width="15" height="20" fill="#10B981" opacity="0.6" />
        <rect x="10" y="30" width="20" height="15" fill="#059669" opacity="0.7" />
        <path d="M 0,70 Q 30,60 50,80" stroke="#0284C7" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M 80,10 Q 60,30 80,45" stroke="#0284C7" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  if (type === 'planet-basemap') {
    return (
      <svg className="w-full h-full object-cover" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="80" height="80" fill="#020617" />
        <circle cx="40" cy="40" r="30" fill="#0F172A" stroke="#1E293B" strokeWidth="1" />
        <path d="M 20,40 Q 40,25 60,40 T 20,40 Z" fill="#047857" opacity="0.5" />
        <path d="M 25,35 Q 40,55 55,35" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />
        <circle cx="45" cy="30" r="3" fill="#38BDF8" />
        <path d="M 10,20 Q 30,10 70,60" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3,3" fill="none" />
        <rect x="35" y="35" width="10" height="10" rx="1" fill="#E2E8F0" transform="rotate(45 40 40)" />
      </svg>
    );
  }
  return <div className="w-full h-full bg-slate-800" />;
};

const LAYER_CATEGORIES = [
  {
    id: 'base',
    title: 'Địa lý',
    layers: [
      { id: 'openfreemap', name: 'OFreeMap' },
      { id: 'osm', name: 'OStreetMap' },
    ],
  },
  {
    id: 'satellite-base',
    title: 'Vệ tinh',
    layers: [
      { id: 'google-satellite', name: 'Google Satellite' },
    ],
  },
  {
    id: 'remotesensing',
    title: 'Viễn thám',
    layers: [
      { id: 'sentinel-2', name: 'Sentinel-2' },
      { id: 'planet-basemap', name: 'Planet Map' },
    ],
  },
];

export default function MapLayersSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { selectedLayer, setSelectedLayer } = useMapStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close the expanded panel when clicking outside the component
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  // Find layer display name for collapsed text
  const getAllLayers = () => LAYER_CATEGORIES.flatMap(cat => cat.layers);
  const activeLayerInfo = getAllLayers().find(l => l.id === selectedLayer) || { name: 'Layers' };

  return (
    <div ref={containerRef} className="flex items-end space-x-3 pointer-events-auto select-none">
      {/* 1. Collapsed Trigger Button (Styled like Google Maps Layers button) */}
      <button
        onClick={handleToggle}
        title={`Lớp bản đồ: ${activeLayerInfo.name}`}
        className={`relative w-[76px] h-[76px] rounded-2xl overflow-hidden shadow-2xl cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0 group ${
          isOpen 
            ? 'border-2 border-sky-500 scale-105 shadow-sky-500/20' 
            : 'border-2 border-black hover:border-slate-800'
        }`}
      >
        <MapThumbnail type={selectedLayer} />
        {/* Layer Text Overlay at the bottom */}
        <div className="absolute bottom-0 inset-x-0 bg-slate-900/90 py-1.5 px-1 flex flex-col items-center justify-center border-t border-slate-800/40">
          <div className="flex flex-col items-center text-white">
            <span className="text-[9.5px] font-black tracking-widest leading-none uppercase">Layers</span>
          </div>
        </div>
      </button>

      {/* 2. Expanded Menu (Google Maps style horizontal slider) */}
      {isOpen && (
        <div 
          className="bg-slate-900/90 backdrop-blur-md border-2 border-black rounded-2xl py-1.5 px-3 flex items-center space-x-3 shadow-2xl animate-layers-panel h-[76px] overflow-x-auto overflow-y-hidden scrollbar-thin"
        >
          {LAYER_CATEGORIES.map((category, catIdx) => (
            <div key={category.id} className="flex items-center space-x-3">
              {/* Category Group Container */}
              <div className="flex flex-col space-y-0.5">
                {/* Category Title */}
                <span className="text-[8.5px] font-black text-white opacity-85 uppercase tracking-widest px-0.5 leading-none">
                  {category.title}
                </span>
                
                {/* Layers in this Category */}
                <div className="flex items-center space-x-2 mt-0.5">
                  {category.layers.map((layer) => {
                    const isActive = selectedLayer === layer.id;
                    return (
                      <button
                        key={layer.id}
                        onClick={() => {
                          setSelectedLayer(layer.id);
                        }}
                        className="flex flex-col items-center cursor-pointer group"
                      >
                        {/* Layer Mini-Thumbnail */}
                        <div 
                          className={`w-[36px] h-[36px] rounded-lg overflow-hidden border-2 transition-all duration-150 ${
                            isActive
                              ? 'border-sky-500 scale-105 shadow-md shadow-sky-500/10'
                              : 'border-slate-800 group-hover:border-slate-600 group-hover:scale-[1.02]'
                          }`}
                        >
                          <MapThumbnail type={layer.id} />
                        </div>
                        {/* Layer Text Label */}
                        <span 
                          className={`text-[8.5px] font-black text-center mt-0.5 max-w-[62px] truncate leading-none transition-colors duration-150 ${
                            isActive ? 'text-sky-400 font-extrabold' : 'text-slate-200 group-hover:text-white'
                          }`}
                        >
                          {layer.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vertical Divider between categories (except the last one) */}
              {catIdx < LAYER_CATEGORIES.length - 1 && (
                <div className="w-[1.5px] h-[38px] bg-slate-800 self-center mx-0.5 rounded-full" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
