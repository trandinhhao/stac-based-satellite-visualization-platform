import { useEffect, useRef, lazy, Suspense, useState } from 'react';
import { Compass, Layers, Search, Hexagon, Ruler, Cpu, Loader2, ChevronLeft, Globe, Info, MapPin, X } from 'lucide-react';
import MapViewer from '../components/MapViewer';
import SearchLocation from '../components/SearchLocation';
import { useMapStore } from '../store/useMapStore';
import { useAOIStore } from '../store/useAOIStore';
import { useWebSocketStore } from '../store/useWebSocketStore';
import { NotificationToast } from '../components/NotificationToast';
import MapLayersSwitcher from '../components/MapLayersSwitcher';
import { useSTACStore } from '../store/useSTACStore';

import FloatingJobsWidget from '../components/FloatingJobsWidget';

// Lazy-loaded components for panel tabs to reduce initial bundle size (Sprint 9 Code Splitting)
const STACSearchPanel = lazy(() => import('../components/STACSearchPanel'));
const AOIManagerPanel = lazy(() => import('../components/AOIManagerPanel'));
const MeasurementPanel = lazy(() => import('../components/MeasurementPanel'));
const DetectionPanel = lazy(() => import('../components/DetectionPanel'));



export default function MainLayout() {
  const { center, zoom } = useMapStore();
  const { activeTab, setActiveTab, isDrawerOpen, setIsDrawerOpen, aois, selectedAOIIds, fetchAOIs, selectAOI } = useAOIStore();
  const selectedAOINames = aois
    .filter((a) => selectedAOIIds.includes(a.id))
    .map((a) => a.name)
    .join(', ');
  
  const selectedSTACItems = useSTACStore((state) => state.selectedSTACItems);
  const setSelectedSTACItems = useSTACStore((state) => state.setSelectedSTACItems);
  const selectedItem = useSTACStore((state) => state.selectedItem);
  const setSelectedItem = useSTACStore((state) => state.setSelectedItem);

  const formatSTACDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };
  
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [helpType, setHelpType] = useState<'location' | 'stac' | 'aoi' | 'measure' | null>(null);

  const toggleHelp = (type: 'location' | 'stac' | 'aoi' | 'measure') => {
    if (helpType === type) {
      setShowHelpPanel(!showHelpPanel);
    } else {
      setHelpType(type);
      setShowHelpPanel(true);
    }
  };

  const prevTabRef = useRef(activeTab);

  // Automatically open the drawer whenever activeTab changes programmatically
  useEffect(() => {
    if (activeTab !== prevTabRef.current) {
      setIsDrawerOpen(true);
      prevTabRef.current = activeTab;
      setShowHelpPanel(false);
      setHelpType(null);
      selectAOI(null); // Automatically clear selected AOIs when switching tabs
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isDrawerOpen) {
      setShowHelpPanel(false);
      setHelpType(null);
      selectAOI(null); // Automatically clear selected AOIs when closing the drawer
    }
  }, [isDrawerOpen]);

  // Support closing help modal via Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowHelpPanel(false);
      }
    };
    if (showHelpPanel) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showHelpPanel]);

  const handleTabClick = (tab: 'location' | 'search' | 'aoi' | 'measure' | 'ai') => {
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
    // Fetch initial AOIs
    fetchAOIs();
    return () => {
      // Disconnect socket connection on unmount
      disconnect();
    };
  }, [connect, disconnect, fetchAOIs]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      {/* 1. Fullscreen Map Component */}
      <div className="absolute inset-0 z-0">
        <MapViewer />
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

              {/* Measurement */}
              <button
                onClick={() => handleTabClick('measure')}
                title="Đo đạc"
                className={`w-full py-2.5 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center relative group ${
                  activeTab === 'measure' && isDrawerOpen
                    ? 'bg-sky-500/10 text-sky-400 font-bold border border-transparent'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-800/40'
                }`}
              >
                <Ruler className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1">Đo đạc</span>
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
          className={`bg-slate-900/90 backdrop-blur-md border border-slate-800/85 rounded-2xl shadow-2xl flex flex-col pointer-events-auto transition-all duration-300 ease-in-out h-full overflow-hidden ${
            isDrawerOpen ? 'w-80 opacity-100 translate-x-0 ml-3' : 'w-0 opacity-0 -translate-x-4 border-none pointer-events-none ml-0'
          }`}
        >
          {/* Inner fixed-width container preventing content warping during resizing animation */}
          <div className="w-80 h-full flex flex-col min-h-0">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-700/60 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-2">
                {activeTab === 'location' && <Search className="w-4 h-4 text-sky-400" />}
                {activeTab === 'search' && <Globe className="w-4 h-4 text-sky-400" />}
                {activeTab === 'aoi' && <Hexagon className="w-4 h-4 text-sky-400" />}
                {activeTab === 'measure' && <Ruler className="w-4 h-4 text-sky-400" />}
                {activeTab === 'ai' && <Cpu className="w-4 h-4 text-sky-400" />}
                <h2 className="text-sm font-semibold text-slate-200">
                  {activeTab === 'location' && 'Tìm kiếm địa điểm & tọa độ'}
                  {activeTab === 'search' && 'Tìm kiếm vệ tinh (STAC)'}
                  {activeTab === 'aoi' && 'Quản lý vùng quan tâm (AOI)'}
                  {activeTab === 'measure' && 'Công cụ đo đạc địa lý'}
                  {activeTab === 'ai' && 'Nhận diện đối tượng AI'}
                </h2>
                
                {['location', 'search', 'aoi', 'measure'].includes(activeTab) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === 'location') toggleHelp('location');
                      else if (activeTab === 'search') toggleHelp('stac');
                      else if (activeTab === 'aoi') toggleHelp('aoi');
                      else if (activeTab === 'measure') toggleHelp('measure');
                    }}
                    className={`p-1 rounded-lg hover:bg-slate-800/60 transition-all cursor-pointer flex items-center justify-center ${
                      showHelpPanel && (
                        (activeTab === 'location' && helpType === 'location') || 
                        (activeTab === 'search' && helpType === 'stac') ||
                        (activeTab === 'aoi' && helpType === 'aoi') ||
                        (activeTab === 'measure' && helpType === 'measure')
                      )
                        ? 'text-sky-400 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Xem hướng dẫn nhanh"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                )}
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
                  <SearchLocation />
                )}

                {activeTab === 'search' && (
                  <STACSearchPanel />
                )}

                {activeTab === 'aoi' && (
                  <AOIManagerPanel />
                )}

                {activeTab === 'measure' && (
                  <MeasurementPanel />
                )}





                {activeTab === 'ai' && (
                  <DetectionPanel />
                )}
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Floating Real-time Status Bar & Selected AOI Indicator */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end space-y-2">
        {/* Status Bar */}
        <footer className="flex items-center space-x-4 bg-slate-900/90 backdrop-blur-md border border-slate-800/85 px-4 py-2 rounded-xl shadow-2xl font-mono text-[11px] text-slate-300 font-medium">
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

        {/* Selected AOI Indicator */}
        {activeTab === 'aoi' && selectedAOIIds.length > 0 && (
          <div 
            className="flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur-md border border-sky-500/30 hover:border-sky-500/50 px-3 py-1.5 rounded-lg shadow-xl text-[10px] text-sky-400 animate-in slide-in-from-top-2 duration-200 font-mono max-w-[400px]"
            title={selectedAOINames}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse flex-shrink-0"></span>
            <span className="font-semibold text-slate-400 flex-shrink-0">AOI ({selectedAOIIds.length}):</span>
            <span className="text-white font-bold truncate">
              {selectedAOINames}
            </span>
          </div>
        )}

        {/* Selected STAC Indicators */}
        {selectedSTACItems.map((item) => {
          const platform = item.properties.platform || 'Sentinel';
          const infoText = `${platform} | ${formatSTACDate(item.properties.datetime)}`;
          
          const isMapOverlayActive = selectedItem?.id === item.id;
          return (
            <div 
              key={item.id}
              onClick={() => {
                if (isMapOverlayActive) {
                  setSelectedItem(null);
                } else {
                  setSelectedItem(item);
                }
              }}
              className={`flex items-center justify-between space-x-2 backdrop-blur-md border pl-3 pr-2 py-1.5 rounded-lg text-[10px] animate-in slide-in-from-top-2 duration-200 font-mono max-w-[400px] cursor-pointer transition-all duration-300 ${
                isMapOverlayActive
                  ? 'border-sky-400 bg-gradient-to-r from-sky-950/80 to-blue-900/70 text-sky-200 shadow-[0_0_15px_rgba(56,189,248,0.4)] scale-[1.02]'
                  : 'border-slate-800/80 hover:border-sky-500/30 bg-slate-900/80 hover:bg-slate-900/90 text-slate-400'
              }`}
              title={item.id}
            >
              <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isMapOverlayActive 
                    ? 'bg-sky-400 shadow-[0_0_6px_#38bdf8] animate-pulse' 
                    : 'bg-slate-600'
                }`}></span>
                <span className={`flex-shrink-0 ${isMapOverlayActive ? 'font-black text-sky-300' : 'font-semibold text-slate-500'}`}>STAC:</span>
                <span className={`truncate ${isMapOverlayActive ? 'text-white font-extrabold' : 'text-slate-300'}`}>
                  {infoText}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSTACItems(selectedSTACItems.filter(i => i.id !== item.id));
                  if (isMapOverlayActive) {
                    setSelectedItem(null);
                  }
                }}
                className="flex-shrink-0 text-slate-400 hover:text-red-400 hover:bg-slate-800 p-0.5 rounded transition-all cursor-pointer flex items-center justify-center"
                title="Bỏ chọn"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* 5. Global Real-time Neon/Glassmorphic Notifications */}
      <NotificationToast />

      {/* Floating Layers Switcher (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-10">
        <MapLayersSwitcher />
      </div>

      {/* Floating Jobs Manager Widget (Bottom-Right, left of map controls) */}
      <div className="absolute bottom-4 right-16 z-10">
        <FloatingJobsWidget />
      </div>

      {/* Help Modal Overlay (Sprint 10 Centered Modal) */}
      {showHelpPanel && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4 pointer-events-auto"
          onClick={() => setShowHelpPanel(false)}
        >
          <div 
            className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-700/60 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-sky-400" />
                <h2 className="text-sm font-semibold text-slate-200">
                  {helpType === 'location' && 'Hướng dẫn Tìm kiếm Vị trí'}
                  {helpType === 'stac' && 'Hướng dẫn Tìm kiếm STAC'}
                  {helpType === 'aoi' && 'Hướng dẫn Quản lý AOI'}
                  {helpType === 'measure' && 'Hướng dẫn Đo đạc địa lý'}
                </h2>
              </div>
              <button
                onClick={() => setShowHelpPanel(false)}
                className="p-1.5 hover:bg-slate-800/60 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="Đóng hướng dẫn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto min-h-0">
              {helpType === 'location' && (
                <div className="space-y-4 text-[11px] leading-relaxed">
                  <div className="p-3.5 bg-slate-950/50 border border-slate-850 rounded-xl space-y-2">
                    <h4 className="font-bold text-sky-400 flex items-center space-x-1.5">
                      <MapPin className="w-4 h-4 text-sky-400" />
                      <span>Tìm kiếm theo Địa điểm</span>
                    </h4>
                    <p className="text-slate-300">
                      Định vị nhanh bản đồ dựa trên tên địa danh (địa chỉ, thành phố, danh lam thắng cảnh).
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-400">
                      <li>Nhập từ khóa tìm kiếm (tối thiểu 2 ký tự).</li>
                      <li>Hệ thống hiển thị danh sách kết quả gợi ý.</li>
                      <li>Click vào kết quả gợi ý để bản đồ tự động di chuyển đến vị trí và cắm ghim.</li>
                    </ul>
                  </div>

                  <div className="p-3.5 bg-slate-950/50 border border-slate-850 rounded-xl space-y-2">
                    <h4 className="font-bold text-sky-400 flex items-center space-x-1.5">
                      <Compass className="w-4 h-4 text-sky-400" />
                      <span>Tìm kiếm theo Tọa độ</span>
                    </h4>
                    <p className="text-slate-300">
                      Định vị chính xác điểm trên bản đồ bằng vĩ độ và kinh độ (WGS84).
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-400">
                      <li><strong>Vĩ độ (Lat):</strong> Từ -90 đến 90.</li>
                      <li><strong>Kinh độ (Lng):</strong> Từ -180 đến 180.</li>
                      <li>Ví dụ: Hà Nội có Vĩ độ <code>21.028</code>, Kinh độ <code>105.834</code>.</li>
                      <li>Nhập tọa độ rồi bấm <strong>Chuyển đến</strong> để định vị bản đồ.</li>
                    </ul>
                  </div>
                </div>
              )}

              {helpType === 'stac' && (
                <div className="space-y-4 text-[11px] leading-relaxed">
                  <div className="p-3.5 bg-slate-950/50 border border-slate-850 rounded-xl space-y-2">
                    <h4 className="font-bold text-sky-400 flex items-center space-x-1.5">
                      <Globe className="w-4 h-4 text-sky-400" />
                      <span>Tìm kiếm ảnh vệ tinh (STAC)</span>
                    </h4>
                    <p className="text-slate-300">
                      Tìm kiếm và tải dữ liệu ảnh từ các kho lưu trữ chuẩn STAC (SpatioTemporal Asset Catalog).
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-950/50 border border-slate-850 rounded-xl space-y-2">
                    <h5 className="font-bold text-slate-200">1. Chọn bộ sưu tập & Thời gian</h5>
                    <p className="text-slate-400">
                      Chọn Collection vệ tinh phù hợp (Sentinel-2, Planet...) và khoảng thời gian chụp ảnh cần lọc.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-950/50 border border-slate-850 rounded-xl space-y-2">
                    <h5 className="font-bold text-slate-200">2. Xác định vùng quét (Spatial Scope)</h5>
                    <p className="text-slate-450">
                      <strong>Tạo mới vùng:</strong> Chọn vẽ Đa giác, Hình chữ nhật, hoặc Hình tròn.
                    </p>
                    <ul className="list-disc pl-4 mt-1 space-y-1 text-[10px] text-slate-400">
                      <li><strong>Click chuột phải</strong> vào bản đồ để hủy vẽ/sửa nhanh.</li>
                      <li><strong>Kéo tâm đỏ</strong> để di chuyển hình tròn; <strong>kéo đường viền</strong> để thay đổi bán kính.</li>
                    </ul>
                    <p className="text-slate-400 mt-2">
                      <strong>Vùng AOI:</strong> Chọn sử dụng một hoặc nhiều ranh giới vùng quan tâm đã được lưu trong tài khoản.
                    </p>
                  </div>
                </div>
              )}

              {helpType === 'aoi' && (
                <div className="space-y-4 text-[11px] leading-relaxed">
                  <div className="p-3.5 bg-slate-950/50 border border-slate-850 rounded-xl space-y-2">
                    <h4 className="font-bold text-sky-400 flex items-center space-x-1.5">
                      <Hexagon className="w-4 h-4 text-sky-400" />
                      <span>Quản lý Vùng quan tâm (AOI)</span>
                    </h4>
                    <p className="text-slate-300">
                      Tạo và quản lý các Vùng quan tâm (Area of Interest - AOI) để tìm kiếm ảnh vệ tinh hoặc phân tích AI.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-950/50 border border-slate-850 rounded-xl space-y-2">
                    <h5 className="font-bold text-slate-200">1. Tạo mới vùng AOI</h5>
                    <p className="text-slate-400">
                      Vẽ Đa giác, Hình chữ nhật, hoặc Hình tròn trực tiếp trên bản đồ. Hoặc sử dụng chức năng nhập tệp để tải lên file GeoJSON (`.geojson`) ranh giới của bạn.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-950/50 border border-slate-850 rounded-xl space-y-2">
                    <h5 className="font-bold text-slate-200">2. Quản lý danh sách</h5>
                    <p className="text-slate-400">
                      Các vùng đã tạo sẽ được hiển thị dạng danh sách gọn gàng. Click hộp chọn để hiển thị ranh giới trên bản đồ. Double click hoặc nhấn nút tìm kiếm tương ứng để truy vấn dữ liệu ảnh STAC.
                    </p>
                  </div>
                </div>
              )}

              {helpType === 'measure' && (
                <div className="space-y-4 text-[11px] leading-relaxed">
                  <div className="p-3.5 bg-slate-950/50 border border-slate-850 rounded-xl space-y-2">
                    <h4 className="font-bold text-sky-400 flex items-center space-x-1.5">
                      <Ruler className="w-4 h-4 text-sky-400" />
                      <span>Đo đạc khoảng cách và diện tích</span>
                    </h4>
                    <p className="text-slate-300">
                      Tính toán khoảng cách đường đi hoặc diện tích vùng đa giác trực tiếp trên bản đồ nền.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-950/50 border border-slate-850 rounded-xl space-y-2">
                    <h5 className="font-bold text-slate-200">1. Chọn chế độ đo</h5>
                    <p className="text-slate-400">
                      Chọn <strong>Đo khoảng cách</strong> hoặc <strong>Đo diện tích</strong> ở panel bên trái để bắt đầu vẽ.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-950/50 border border-slate-850 rounded-xl space-y-2">
                    <h5 className="font-bold text-slate-200">2. Thao tác vẽ và đo đạc</h5>
                    <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-400">
                      <li>Nhấp chuột trái trên bản đồ để thêm các điểm mốc đo.</li>
                      <li>Double-click (hoặc nhấp lại điểm đầu tiên) để kết thúc và lưu phép đo.</li>
                      <li>Click chuột phải để hủy điểm đo hiện tại.</li>
                      <li>Kết quả đo sẽ hiển thị nhãn số liệu trực tiếp trên bản đồ và lưu lại trong danh sách lịch sử.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
