import { Globe, Compass, Layers, Info, Check, Eye } from 'lucide-react';
import MapViewer from '../components/MapViewer';
import { useMapStore } from '../store/useMapStore';

const LAYER_CATEGORIES = [
  {
    id: 'base',
    title: 'Bản đồ địa lý',
    layers: [
      { id: 'openfreemap', name: 'OpenFreeMap', desc: 'Vector Style mượt mà, chi tiết' },
      { id: 'osm', name: 'OpenStreetMap', desc: 'Bản đồ raster chuẩn truyền thống' },
    ],
  },
  {
    id: 'satellite-base',
    title: 'Ảnh vệ tinh nền',
    layers: [
      { id: 'google-satellite', name: 'Google Satellite', desc: 'Ảnh chụp vệ tinh toàn cầu của Google' },
    ],
  },
  {
    id: 'remotesensing',
    title: 'Ảnh viễn thám chuyên đề (TiTiler)',
    layers: [
      { id: 'sentinel-2', name: 'Sentinel-2 (Optical)', desc: 'Ảnh quang học độ phân giải 10m từ ESA' },
      { id: 'sentinel-1', name: 'Sentinel-1 (SAR Radar)', desc: 'Ảnh chụp Radar xuyên mây' },
      { id: 'landsat-8', name: 'Landsat-8 (Multispectral)', desc: 'Ảnh đa phổ NASA/USGS' },
      { id: 'planet-scope', name: 'PlanetScope (High-Res)', desc: 'Ảnh độ phân giải cao 3m' },
    ],
  },
];

const SAMPLE_LOCATIONS = [
  { name: 'California (Sentinel-1)', center: [-117.635, 33.897] as [number, number], zoom: 14, layerId: 'sentinel-1' },
  { name: 'California (Landsat-8)', center: [-117.635, 33.897] as [number, number], zoom: 14, layerId: 'landsat-8' },
  { name: 'Rio de Janeiro (PlanetScope)', center: [-44.7545, -23.0183] as [number, number], zoom: 11, layerId: 'planet-scope' },
];

export default function MainLayout() {
  const { center, zoom, selectedLayer, setSelectedLayer, setCenter, setZoom } = useMapStore();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      {/* 1. Fullscreen Map Component */}
      <div className="absolute inset-0 z-0">
        <MapViewer />
      </div>

      {/* 2. Floating Header Overlay */}
      <header className="absolute top-4 left-4 z-10 w-[calc(100%-2rem)] md:w-96 bg-slate-900/85 backdrop-blur-md border border-slate-800/85 rounded-2xl p-4 shadow-2xl transition-all duration-300">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-sky-500/10 border border-sky-500/25 rounded-xl text-sky-400">
            <Globe className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white">
              STAC Satellite Platform
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              High-Performance Visualization
            </p>
          </div>
        </div>
      </header>

      {/* 3. Floating Sidebar with Categorized Layers */}
      <aside className="absolute top-24 left-4 z-10 w-96 max-h-[calc(100vh-8rem)] hidden md:flex flex-col bg-slate-900/85 backdrop-blur-md border border-slate-800/85 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800/85 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-200">Bảng điều khiển</h2>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700/50 rounded-full font-mono font-semibold">
            Sprint 1
          </span>
        </div>

        {/* Sidebar Content */}
        <div className="p-4 space-y-5 overflow-y-auto">
          {/* Section 1: Search Placeholder */}
          <div className="p-3.5 bg-slate-950/40 border border-slate-800/60 rounded-xl">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Tìm kiếm địa điểm (Epic 5)
            </h3>
            <div className="h-10 bg-slate-800/30 border border-slate-700/30 rounded-lg flex items-center justify-center text-slate-500 text-xs italic">
              Đang chờ tích hợp ở Epic 5...
            </div>
          </div>

          {/* Section 2: Layers Switcher (Epic 3 & 4) */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1">
              Lớp bản đồ nền & Vệ tinh
            </h3>
            
            <div className="space-y-4">
              {LAYER_CATEGORIES.map((category) => (
                <div key={category.id} className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide px-1">
                    {category.title}
                  </h4>
                  <div className="space-y-1">
                    {category.layers.map((layer) => {
                      const isActive = selectedLayer === layer.id;
                      return (
                        <button
                          key={layer.id}
                          onClick={() => setSelectedLayer(layer.id)}
                          className={`w-full text-left flex items-start justify-between p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                            isActive
                              ? 'bg-sky-500/10 border-sky-500/50 text-white shadow-lg shadow-sky-500/5'
                              : 'bg-slate-950/30 border-slate-800/40 hover:bg-slate-800/30 hover:border-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          <div className="flex flex-col space-y-0.5 pr-2">
                            <span className="text-xs font-semibold">{layer.name}</span>
                            <span className="text-[10px] text-slate-400 line-clamp-1 group-hover:text-slate-300">{layer.desc}</span>
                          </div>
                          <div className="flex-shrink-0 mt-0.5">
                            {isActive ? (
                              <div className="p-1 bg-sky-500 rounded-lg text-white">
                                <Check className="w-3 h-3" />
                              </div>
                            ) : (
                              <div className="p-1 border border-slate-800 rounded-lg text-slate-600 hover:text-slate-400">
                                <Eye className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Quick Bookmarks for Offline Samples */}
          <div className="p-3.5 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1">
              Phạm vi ảnh cục bộ (Offline Samples)
            </h3>
            <div className="grid grid-cols-1 gap-1.5 text-[10px]">
              {SAMPLE_LOCATIONS.map((loc) => (
                <button
                  key={loc.name}
                  onClick={() => {
                    setSelectedLayer(loc.layerId);
                    setCenter(loc.center);
                    setZoom(loc.zoom);
                  }}
                  className="w-full px-2.5 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-700/40 hover:border-slate-600 rounded-xl text-slate-300 hover:text-white text-left font-semibold truncate cursor-pointer transition-all duration-150 flex items-center space-x-1.5"
                >
                  <span className="text-sky-400">📍</span>
                  <span>{loc.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-3.5 bg-slate-950/50 border-t border-slate-800/85 flex items-center space-x-2 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 animate-pulse" />
          <span>Chọn lớp viễn thám để render động XYZ tiles từ TiTiler.</span>
        </div>
      </aside>

      {/* 4. Floating Real-time Status Bar */}
      <footer className="absolute bottom-4 right-4 z-10 flex items-center space-x-4 bg-slate-900/90 backdrop-blur-md border border-slate-800/85 px-4 py-2 rounded-xl shadow-2xl font-mono text-[11px] text-slate-300 font-medium">
        <div className="flex items-center space-x-1.5 border-r border-slate-800 pr-3">
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold text-slate-400">Vĩ độ (Lat):</span>
          <span className="text-white font-medium">{center[1].toFixed(5)}</span>
        </div>
        <div className="flex items-center space-x-1.5 border-r border-slate-800 pr-3">
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold text-slate-400">Kinh độ (Lng):</span>
          <span className="text-white font-medium">{center[0].toFixed(5)}</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="font-semibold text-sky-400">Zoom:</span>
          <span className="text-white font-medium">{zoom.toFixed(1)}</span>
        </div>
      </footer>
    </div>
  );
}
