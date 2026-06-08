import { Globe, Compass, Layers, Info } from 'lucide-react';
import MapViewer from '../components/MapViewer';
import { useMapStore } from '../store/useMapStore';

export default function MainLayout() {
  const { center, zoom } = useMapStore();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* 1. Fullscreen Map Component */}
      <div className="absolute inset-0 z-0">
        <MapViewer />
      </div>

      {/* 2. Floating Header Overlay */}
      <header className="absolute top-4 left-4 z-10 w-[calc(100%-2rem)] md:w-96 bg-slate-900/85 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 shadow-2xl transition-all duration-300">
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

      {/* 3. Floating Responsive Sidebar */}
      <aside className="absolute top-24 left-4 z-10 w-96 max-h-[calc(100vh-8rem)] hidden md:flex flex-col bg-slate-900/85 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-200">Bảng điều khiển</h2>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700/50 rounded-full font-mono font-semibold">
            Sprint 1
          </span>
        </div>

        {/* Sidebar Content Placeholders */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Section 1: Search Placeholder */}
          <div className="p-3 bg-slate-950/40 border border-slate-800/50 rounded-xl">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Tìm kiếm địa điểm (Epic 5)
            </h3>
            <div className="h-10 bg-slate-800/30 border border-slate-700/30 rounded-lg flex items-center justify-center text-slate-500 text-xs italic">
              Đang chờ tích hợp ở Epic 5...
            </div>
          </div>

          {/* Section 2: Layers Placeholder */}
          <div className="p-3 bg-slate-950/40 border border-slate-800/50 rounded-xl">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Quản lý lớp bản đồ (Epic 3 & 4)
            </h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <input type="radio" checked readOnly className="accent-sky-500" />
                <span className="font-medium">OpenFreeMap (Mặc định)</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-500 italic">
                <span>Các lớp bản đồ bổ sung đang chờ tích hợp...</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-3 bg-slate-950/50 border-t border-slate-800/50 flex items-center space-x-2 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
          <span>Vẽ AOI, đo đạc diện tích sẽ hiển thị tại đây.</span>
        </div>
      </aside>

      {/* 4. Floating Real-time Status Bar */}
      <footer className="absolute bottom-4 right-4 z-10 flex items-center space-x-4 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 px-4 py-2 rounded-xl shadow-2xl font-mono text-[11px] text-slate-300">
        <div className="flex items-center space-x-1.5 border-r border-slate-800 pr-3">
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold">Vĩ độ (Lat):</span>
          <span className="text-white font-medium">{center[1].toFixed(5)}</span>
        </div>
        <div className="flex items-center space-x-1.5 border-r border-slate-800 pr-3">
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold">Kinh độ (Lng):</span>
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
