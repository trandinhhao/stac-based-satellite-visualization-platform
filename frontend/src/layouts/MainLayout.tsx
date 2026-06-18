import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Compass, Layers, Search, Hexagon, Ruler, Columns, Clock, Cpu, Loader2, ChevronLeft, Globe } from 'lucide-react';
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
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const prevTabRef = useRef(activeTab);

  // Automatically open the drawer whenever activeTab changes programmatically
  useEffect(() => {
    if (activeTab !== prevTabRef.current) {
      setIsDrawerOpen(true);
      prevTabRef.current = activeTab;
    }
  }, [activeTab]);

  const handleTabClick = (tab: 'location' | 'search' | 'aoi' | 'measure' | 'comparison' | 'jobs' | 'ai') => {
    if (activeTab === tab) {
      setIsDrawerOpen(!isDrawerOpen);
    } else {
      setActiveTab(tab);
      setIsDrawerOpen(true);
    }
  };

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
      {/* 3. Floating GIS-Style Sidebar Menu & Collapsible Drawer */}
      <div className="absolute top-4 left-4 z-10 hidden md:flex items-start h-[calc(100vh-10rem)] max-h-[75vh] pointer-events-none">
        {/* Navigation Rail */}
        <div className="flex flex-col items-center justify-between py-4 w-16 bg-slate-900/90 backdrop-blur-md border border-slate-800/85 rounded-2xl shadow-2xl pointer-events-auto h-fit space-y-4 flex-shrink-0">
          <div className="flex flex-col items-center space-y-4 w-full">
            {/* Logo Icon */}
            <div className="p-1.5 bg-slate-950/60 border border-slate-800/60 rounded-xl mb-2">
              <Layers className="w-5 h-5 text-sky-400" />
            </div>
            
            {/* Vertically Stacked Menu Buttons */}
            <div className="flex flex-col space-y-3 w-full px-2">
              {/* Location Search */}
              <button
                onClick={() => handleTabClick('location')}
                title="Tìm kiếm địa điểm & tọa độ"
                className={`w-full py-2.5 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center relative group ${
                  activeTab === 'location' && isDrawerOpen
                    ? 'bg-sky-500/10 text-sky-400 font-bold border border-transparent'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-800/40'
                }`}
              >
                <Search className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1">Tìm kiếm</span>
              </button>

              {/* STAC Search */}
              <button
                onClick={() => handleTabClick('search')}
                title="Tìm kiếm STAC"
                className={`w-full py-2.5 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center relative group ${
                  activeTab === 'search' && isDrawerOpen
                    ? 'bg-sky-500/10 text-sky-400 font-bold border border-transparent'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-800/40'
                }`}
              >
                <Globe className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1">STAC</span>
              </button>

              {/* AOI Manager */}
              <button
                onClick={() => handleTabClick('aoi')}
                title="Vùng quan tâm"
                className={`w-full py-2.5 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center relative group ${
                  activeTab === 'aoi' && isDrawerOpen
                    ? 'bg-sky-500/10 text-sky-400 font-bold border border-transparent'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-800/40'
                }`}
              >
                <Hexagon className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1">AOI</span>
              </button>

              {/* Measurement */}
              <button
                onClick={() => handleTabClick('measure')}
                title="Đo đạc"
                className={`w-full py-2.5 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center relative group ${
                  activeTab === 'measure' && isDrawerOpen
                    ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-transparent'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-800/40'
                }`}
              >
                <Ruler className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1">Đo đạc</span>
              </button>

              {/* Comparison */}
              <button
                onClick={() => handleTabClick('comparison')}
                title="So sánh"
                className={`w-full py-2.5 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center relative group ${
                  activeTab === 'comparison' && isDrawerOpen
                    ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-transparent'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-800/40'
                }`}
              >
                <Columns className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1">So sánh</span>
              </button>

              {/* Job Dashboard */}
              <button
                onClick={() => handleTabClick('jobs')}
                title="Tác vụ"
                className={`w-full py-2.5 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center relative group ${
                  activeTab === 'jobs' && isDrawerOpen
                    ? 'bg-sky-500/10 text-sky-400 font-bold border border-transparent'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-800/40'
                }`}
              >
                <Clock className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1">Tác vụ</span>
              </button>

              {/* AI Detection */}
              <button
                onClick={() => handleTabClick('ai')}
                title="AI Detection"
                className={`w-full py-2.5 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center relative group ${
                  activeTab === 'ai' && isDrawerOpen
                    ? 'bg-sky-500/10 text-sky-400 font-bold border border-transparent'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-800/40'
                }`}
              >
                <Cpu className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1">AI</span>
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Drawer Panel */}
        <div
          className={`bg-slate-900/85 backdrop-blur-md border border-slate-800/85 rounded-2xl shadow-2xl flex flex-col pointer-events-auto transition-all duration-300 ease-in-out h-full overflow-hidden ${
            isDrawerOpen ? 'w-96 opacity-100 translate-x-0 ml-3' : 'w-0 opacity-0 -translate-x-4 border-none pointer-events-none ml-0'
          }`}
        >
          {/* Inner fixed-width container preventing content warping during resizing animation */}
          <div className="w-96 h-full flex flex-col min-h-0">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800/85 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-2">
                {activeTab === 'location' && <Search className="w-4 h-4 text-sky-400" />}
                {activeTab === 'search' && <Globe className="w-4 h-4 text-sky-400" />}
                {activeTab === 'aoi' && <Hexagon className="w-4 h-4 text-sky-400" />}
                {activeTab === 'measure' && <Ruler className="w-4 h-4 text-emerald-400" />}
                {activeTab === 'comparison' && <Columns className="w-4 h-4 text-emerald-400" />}
                {activeTab === 'jobs' && <Clock className="w-4 h-4 text-sky-400" />}
                {activeTab === 'ai' && <Cpu className="w-4 h-4 text-sky-400" />}
                <h2 className="text-sm font-semibold text-slate-200">
                  {activeTab === 'location' && 'Tìm kiếm địa điểm & tọa độ'}
                  {activeTab === 'search' && 'Tìm kiếm vệ tinh (STAC)'}
                  {activeTab === 'aoi' && 'Quản lý vùng quan tâm (AOI)'}
                  {activeTab === 'measure' && 'Công cụ đo đạc địa lý'}
                  {activeTab === 'comparison' && 'Đối chiếu ảnh vệ tinh'}
                  {activeTab === 'jobs' && 'Tiến trình tác vụ nền'}
                  {activeTab === 'ai' && 'Nhận diện đối tượng AI'}
                </h2>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 hover:bg-slate-800/60 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="Đóng bảng điều khiển"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto min-h-0">
              <Suspense fallback={
                <div className="p-6 text-center flex flex-col items-center justify-center space-y-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                  <span className="text-xs font-medium">Đang tải bảng điều khiển...</span>
                </div>
              }>
                {activeTab === 'location' && (
                  <div className="p-3.5 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-2">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1">
                      Tìm kiếm địa điểm & tọa độ
                    </h3>
                    <SearchLocation />
                  </div>
                )}

                {activeTab === 'search' && (
                  <div className="p-3.5 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-2">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1">
                      Tìm kiếm ảnh vệ tinh (STAC)
                    </h3>
                    <STACSearchPanel />
                  </div>
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
          </div>
        </div>
      </div>

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
