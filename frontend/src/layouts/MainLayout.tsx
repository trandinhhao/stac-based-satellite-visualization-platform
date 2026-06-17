import { useEffect, lazy, Suspense } from 'react';
import { Compass, Layers, Info, Search, Hexagon, Ruler, Columns, Clock, Cpu, Loader2 } from 'lucide-react';
import MapViewer from '../components/MapViewer';
import SearchLocation from '../components/SearchLocation';
import CompareViewer from '../features/comparison/components/CompareViewer';
import { useMapStore } from '../store/useMapStore';
import { useAOIStore } from '../store/useAOIStore';
import { useCompareStore } from '../features/comparison/store/useCompareStore';
import { useWebSocketStore } from '../store/useWebSocketStore';
import { NotificationToast } from '../components/NotificationToast';
import MapLayersSwitcher from '../components/MapLayersSwitcher';

// Lazy-loaded components for panel tabs to reduce initial bundle size (Sprint 9 Code Splitting)
const STACSearchPanel = lazy(() => import('../components/STACSearchPanel'));
const AOIManagerPanel = lazy(() => import('../components/AOIManagerPanel'));
const MeasurementPanel = lazy(() => import('../components/MeasurementPanel'));
const ComparePanel = lazy(() => import('../features/comparison/components/ComparePanel'));
const JobDashboard = lazy(() => import('../features/jobs/components/JobDashboard'));
const DetectionPanel = lazy(() => import('../components/DetectionPanel'));



export default function MainLayout() {
  const { center, zoom } = useMapStore();
  const { activeTab, setActiveTab } = useAOIStore();
  const compareMode = useCompareStore((state) => state.compareMode);
  
  const connect = useWebSocketStore((state) => state.connect);
  const disconnect = useWebSocketStore((state) => state.disconnect);

  useEffect(() => {
    // Automatically establish WebSocket connection on layout mount
    connect();
    return () => {
      // Disconnect socket connection on unmount
      disconnect();
    };
  }, [connect, disconnect]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      {/* 1. Fullscreen Map Component */}
      <div className="absolute inset-0 z-0">
        {compareMode !== 'none' ? <CompareViewer /> : <MapViewer />}
      </div>
      {/* 3. Floating Sidebar with Categorized Layers */}
      <aside className="absolute top-4 left-4 z-10 w-96 max-h-[70vh] hidden md:flex flex-col bg-slate-900/85 backdrop-blur-md border border-slate-800/85 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800/85 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-200">Bảng điều khiển</h2>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700/50 rounded-full font-mono font-semibold">
            Sprint 3
          </span>
        </div>

        {/* Sidebar Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Tab Switching Navigation */}
          <div className="flex bg-slate-950/60 p-1 border border-slate-800/80 rounded-xl">
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center ${
                activeTab === 'search'
                  ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Search className="w-3.5 h-3.5 mb-0.5" />
              <span>STAC</span>
            </button>
            <button
              onClick={() => setActiveTab('aoi')}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center ${
                activeTab === 'aoi'
                  ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Hexagon className="w-3.5 h-3.5 mb-0.5" />
              <span>AOI</span>
            </button>
            <button
              onClick={() => setActiveTab('measure')}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center ${
                activeTab === 'measure'
                  ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Ruler className="w-3.5 h-3.5 mb-0.5" />
              <span>Đo đạc</span>
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center ${
                activeTab === 'comparison'
                  ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Columns className="w-3.5 h-3.5 mb-0.5" />
              <span>So sánh</span>
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center ${
                activeTab === 'jobs'
                  ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Clock className="w-3.5 h-3.5 mb-0.5" />
              <span>Tác vụ</span>
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center ${
                activeTab === 'ai'
                  ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 mb-0.5" />
              <span>AI</span>
            </button>
          </div>

          <Suspense fallback={
            <div className="p-6 text-center flex flex-col items-center justify-center space-y-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
              <span className="text-xs font-medium">Đang tải bảng điều khiển...</span>
            </div>
          }>
            {activeTab === 'search' && (
              <>
                {/* Section 1: Search Location */}
                <div className="p-3.5 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-2">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1">
                    Tìm kiếm địa điểm
                  </h3>
                  <SearchLocation />
                </div>

                {/* Section 2: STAC Search Panel */}
                <div className="p-3.5 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-2">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1">
                    Tìm kiếm ảnh vệ tinh (STAC)
                  </h3>
                  <STACSearchPanel />
                </div>
              </>
            )}

            {activeTab === 'aoi' && (
              /* Section 2: AOI Manager Panel */
              <div className="p-3.5 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1">
                  Quản lý Vùng quan tâm (AOI)
                </h3>
                <AOIManagerPanel />
              </div>
            )}

            {activeTab === 'measure' && (
              /* Section 2: Measurement Panel */
              <div className="p-3.5 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-2">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider px-1">
                  Công cụ đo đạc địa lý
                </h3>
                <MeasurementPanel />
              </div>
            )}

            {activeTab === 'comparison' && (
              /* Section 2: Compare Panel */
              <div className="p-3.5 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-2">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider px-1">
                  Đối chiếu ảnh vệ tinh
                </h3>
                <ComparePanel />
              </div>
            )}

            {activeTab === 'jobs' && (
              /* Section 2: Job Dashboard Panel */
              <div className="p-3.5 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-2">
                <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider px-1">
                  Tiến trình Tác vụ Nền
                </h3>
                <JobDashboard />
              </div>
            )}

            {activeTab === 'ai' && (
              /* Section 2: AI Detection Panel */
              <div className="p-3.5 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-2">
                <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider px-1">
                  Nhận diện đối tượng AI
                </h3>
                <DetectionPanel />
              </div>
            )}
          </Suspense>




        </div>

        {/* Sidebar Footer Info */}
        <div className="p-3.5 bg-slate-950/50 border-t border-slate-800/85 flex items-center space-x-2 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 animate-pulse" />
          <span>Chọn lớp viễn thám để render động XYZ tiles từ TiTiler.</span>
        </div>
      </aside>

      {/* 4. Floating Real-time Status Bar */}
      <footer className="absolute top-4 right-4 z-10 flex items-center space-x-4 bg-slate-900/90 backdrop-blur-md border border-slate-800/85 px-4 py-2 rounded-xl shadow-2xl font-mono text-[11px] text-slate-300 font-medium">
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

      {/* 5. Global Real-time Neon/Glassmorphic Notifications */}
      <NotificationToast />

      {/* Floating Layers Switcher (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-10">
        <MapLayersSwitcher />
      </div>
    </div>
  );
}
