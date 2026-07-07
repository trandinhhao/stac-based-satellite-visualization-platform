import { useEffect, useRef, lazy, Suspense } from 'react';
import { Compass, Layers, Search, Hexagon, Ruler, Cpu, Loader2, ChevronLeft, Globe, X } from 'lucide-react';
import * as turf from '@turf/turf';
import { useMeasurementStore } from '../store/useMeasurementStore';
import MapViewer from '../components/MapViewer';
import SearchLocation from '../components/SearchLocation';
import { useMapStore } from '../store/useMapStore';
import { useAOIStore } from '../store/useAOIStore';
import { useWebSocketStore } from '../store/useWebSocketStore';
import { NotificationToast } from '../components/NotificationToast';
import MapLayersSwitcher from '../components/MapLayersSwitcher';
import { useSTACStore } from '../store/useSTACStore';
import { useDetectionStore } from '../store/useDetectionStore';

import FloatingJobsWidget from '../components/FloatingJobsWidget';

// Lazy-loaded components for panel tabs to reduce initial bundle size (Sprint 9 Code Splitting)
const STACSearchPanel = lazy(() => import('../components/STACSearchPanel'));
const AOIManagerPanel = lazy(() => import('../components/AOIManagerPanel'));
const MeasurementPanel = lazy(() => import('../components/MeasurementPanel'));
const DetectionPanel = lazy(() => import('../components/DetectionPanel'));



export default function MainLayout() {
  const { center, zoom } = useMapStore();
  const { activeTab, setActiveTab, isDrawerOpen, setIsDrawerOpen, aois, selectedAOIIds, selectedAOIId, fetchAOIs, selectAOI } = useAOIStore();
  const selectedAOINames = aois
    .filter((a) => selectedAOIIds.includes(a.id))
    .map((a) => a.name)
    .join(', ');
  
  const selectedSTACItems = useSTACStore((state) => state.selectedSTACItems);
  const setSelectedSTACItems = useSTACStore((state) => state.setSelectedSTACItems);
  const selectedItem = useSTACStore((state) => state.selectedItem);
  const setSelectedItem = useSTACStore((state) => state.setSelectedItem);

  const currentMeasurement = useMeasurementStore((state) => state.currentMeasurement);
  const stopMeasuring = useMeasurementStore((state) => state.stopMeasuring);

  // Formatters & helpers for measurement
  const formatDistance = (meters: any) => {
    const val = parseFloat(meters);
    if (isNaN(val)) return '0.0 m';
    if (val >= 1000) {
      return `${(val / 1000).toFixed(3)} km`;
    }
    return `${val.toFixed(1)} m`;
  };

  const formatArea = (sqMeters: any) => {
    const val = parseFloat(sqMeters);
    if (isNaN(val)) return '0.0 m²';
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(4)} km²`;
    }
    return `${val.toFixed(1)} m²`;
  };

  const getSegments = (coordinates: any, type: 'distance' | 'area', isDrawing?: boolean) => {
    const segments: { label: string; length: number }[] = [];
    
    if (type === 'area') {
      const coords = coordinates[0];
      if (!coords || coords.length < 4) return segments;
      
      const limit = coords.length - 1;
      for (let i = 0; i < limit; i++) {
        const pt1 = coords[i];
        const pt2 = coords[i + 1];
        if (!pt1 || !pt2) continue;
        const distInKm = turf.distance(pt1, pt2, { units: 'kilometers' });
        
        let label = '';
        if (i === limit - 1) {
          label = `Đoạn ${i + 1} - 1`;
        } else {
          label = `Đoạn ${i + 1} - ${i + 2}`;
        }
        
        segments.push({
          label,
          length: distInKm * 1000,
        });
      }
    } else {
      const coords = coordinates;
      if (!coords || coords.length < 2) return segments;
      
      const limit = isDrawing ? coords.length - 2 : coords.length - 1;
      for (let i = 0; i < limit; i++) {
        const pt1 = coords[i];
        const pt2 = coords[i + 1];
        if (!pt1 || !pt2) continue;
        const distInKm = turf.distance(pt1, pt2, { units: 'kilometers' });
        segments.push({
          label: `Đoạn ${i + 1} - ${i + 2}`,
          length: distInKm * 1000,
        });
      }
    }
    return segments;
  };

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
  


  const prevTabRef = useRef(activeTab);
  const prevSelectedAOIIdRef = useRef(selectedAOIId);

  // Automatically open the drawer whenever activeTab changes programmatically & manage AOI selection
  useEffect(() => {
    if (activeTab !== prevTabRef.current) {
      setIsDrawerOpen(true);
      
      // If selectedAOIId changed to a non-null value at the same time as the tab switch,
      // it means it was triggered programmatically (e.g. clicking "Hiển thị" in background jobs widget).
      // Otherwise, we clear the selected AOI to clean up the map when manually switching tabs.
      const aoiChangedProgrammatically = selectedAOIId !== null && selectedAOIId !== prevSelectedAOIIdRef.current;
      
      if (!aoiChangedProgrammatically) {
        selectAOI(null);
      }
      
      prevTabRef.current = activeTab;
    }
    prevSelectedAOIIdRef.current = selectedAOIId;
  }, [activeTab, selectedAOIId, selectAOI]);

  useEffect(() => {
    if (!isDrawerOpen) {
      selectAOI(null); // Automatically clear selected AOIs when closing the drawer
    }
  }, [isDrawerOpen]);

  // Clean up AI detections when switching away from AI tab or closing the drawer
  useEffect(() => {
    if (activeTab !== 'ai' || !isDrawerOpen) {
      useDetectionStore.getState().clearDetections();
    }
  }, [activeTab, isDrawerOpen]);

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
      <div className="absolute top-4 left-4 z-10 hidden md:flex items-start h-[calc(100vh-6.5rem)] max-h-[82vh] pointer-events-none">
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
                  {activeTab === 'search' && 'Tìm kiếm ảnh vệ tinh (STAC)'}
                  {activeTab === 'aoi' && 'Quản lý vùng quan tâm (AOI)'}
                  {activeTab === 'measure' && 'Đo khoảng cách & diện tích'}
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

        {/* Current Measurement Card */}
        {currentMeasurement && (
          <div className="w-80 bg-slate-900/90 backdrop-blur-md border border-slate-800/85 rounded-2xl shadow-2xl p-4 text-xs text-slate-200 space-y-3 animate-in slide-in-from-top-2 duration-200 pointer-events-auto">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
              <div className="flex items-center space-x-2">
                {currentMeasurement.type === 'distance' ? (
                  <Ruler className="w-4 h-4 text-sky-400 animate-pulse" />
                ) : (
                  <Hexagon className="w-4 h-4 text-sky-400 animate-pulse" />
                )}
                <h4 className="text-xs font-bold text-sky-300">
                  {currentMeasurement.type === 'distance' ? 'Đang đo khoảng cách...' : 'Đang đo diện tích...'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => stopMeasuring()}
                className="text-slate-450 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 space-y-2 text-[11px]">
              {currentMeasurement.type === 'distance' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-bold text-white border-b border-slate-800/40 pb-1.5 mb-1.5">
                    <span className="text-slate-400">Tổng khoảng cách:</span>
                    <span className="text-xs text-sky-400 font-extrabold">
                      {formatDistance(currentMeasurement.value)}
                    </span>
                  </div>
                  {/* List of individual segments */}
                  <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1 select-none custom-scrollbar">
                    {getSegments(currentMeasurement.geometry?.coordinates || [], currentMeasurement.type, currentMeasurement.isDrawing).map((seg, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[10px] py-0.5 border-b border-slate-900/50 last:border-0">
                        <span className="text-slate-500 font-medium">{seg.label}:</span>
                        <span className="text-slate-300 font-semibold">{formatDistance(seg.length)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-bold text-white border-b border-slate-800/40 pb-1.5 mb-1.5">
                    <span className="text-slate-400">Diện tích:</span>
                    <span className="text-xs text-sky-400 font-extrabold">
                      {formatArea(currentMeasurement.value)}
                    </span>
                  </div>
                  {/* List of individual segments */}
                  <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1 select-none custom-scrollbar">
                    {getSegments(currentMeasurement.geometry?.coordinates || [], currentMeasurement.type, currentMeasurement.isDrawing).map((seg, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[10px] py-0.5 border-b border-slate-900/50 last:border-0">
                        <span className="text-slate-500 font-medium">{seg.label}:</span>
                        <span className="text-slate-300 font-semibold">{formatDistance(seg.length)}</span>
                      </div>
                    ))}
                  </div>
                  {currentMeasurement.perimeter !== undefined && (
                    <div className="flex items-center justify-between border-t border-slate-800/40 pt-1.5">
                      <span className="text-slate-400">Chu vi:</span>
                      <span className="text-xs font-bold text-slate-350">
                        {formatDistance(currentMeasurement.perimeter)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. Global Real-time Neon/Glassmorphic Notifications */}
      <NotificationToast />

      {/* Floating Layers Switcher (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-10">
        <MapLayersSwitcher />
      </div>

      {/* Floating Jobs Manager Widget (Positioned to the left of map navigation/rotate controls to avoid overlap) */}
      <div className="absolute bottom-[50px] right-12 z-10">
        <FloatingJobsWidget />
      </div>


    </div>
  );
}
