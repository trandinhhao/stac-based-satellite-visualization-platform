import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, Calendar, Image as ImageIcon, Info, Cloud, Cpu, ArrowRight, Eye, RefreshCw } from 'lucide-react';
import { useSTACStore } from '../store/useSTACStore';
import type { STACCollection, STACItem } from '../store/useSTACStore';
import { useAOIStore } from '../store/useAOIStore';
import { useCompareStore } from '../features/comparison/store/useCompareStore';
import { api } from '../services/api';

export default function STACSearchPanel() {
  const {
    collections,
    searchResults,
    selectedItem,
    filters,
    bbox,
    setCollections,
    setSearchResults,
    setSelectedItem,
    setFilters,
  } = useSTACStore();

  const selectedAOIIds = useAOIStore((state) => state.selectedAOIIds);
  const aois = useAOIStore((state) => state.aois);
  const selectedAOIs = aois.filter((aoi) => selectedAOIIds.includes(aoi.id));
  const setActiveTab = useAOIStore((state) => state.setActiveTab);
  const { selectImageA, selectImageB } = useCompareStore();

  const [spatialScope, setSpatialScope] = useState<'viewport' | 'aoi'>('viewport');

  // Sync spatial scope selection when selected AOI updates
  useEffect(() => {
    if (selectedAOIs.length > 0) {
      setSpatialScope('aoi');
    } else if (spatialScope === 'aoi') {
      setSpatialScope('viewport');
    }
  }, [selectedAOIIds]);

  // 1. Query Collections List
  const { isLoading: isLoadingCollections } = useQuery<STACCollection[]>({
    queryKey: ['stac-collections'],
    queryFn: async () => {
      const response = await api.get('/stac/collections');
      setCollections(response.data);
      return response.data;
    },
    staleTime: 30 * 60 * 1000, // Cache collections list for 30 minutes
  });

  // 2. Search Mutation
  const searchMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post('/stac/search', payload);
      return response.data.features || [];
    },
    onSuccess: (data: STACItem[]) => {
      setSearchResults(data);
    },
  });

  const handleSearch = () => {
    const datetimeStr = filters.startDate && filters.endDate
      ? `${filters.startDate}/${filters.endDate}`
      : filters.startDate
      ? `${filters.startDate}/..`
      : filters.endDate
      ? `../${filters.endDate}`
      : undefined;

    const payload: any = {
      collections: [filters.selectedCollection],
      datetime: datetimeStr,
    };

    if (spatialScope === 'viewport') {
      if (!bbox) return;
      payload.bbox = bbox;
    } else if (spatialScope === 'aoi') {
      if (selectedAOIs.length === 0) return;
      if (selectedAOIs.length === 1) {
        payload.intersects = selectedAOIs[0].geometry;
      } else {
        payload.intersects = {
          type: 'MultiPolygon',
          coordinates: selectedAOIs.map(aoi => aoi.geometry.coordinates)
        };
      }
    }

    searchMutation.mutate(payload);
  };



  const formatDate = (dateStr: string) => {
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

  return (
    <div className="space-y-4 text-slate-200">
      {/* Search Filter Controls */}
      <div className="space-y-3.5">
        {/* Collection Dropdown */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-0.5">
            Bộ sưu tập dữ liệu (STAC Collection)
          </label>
          <div className="relative">
            {isLoadingCollections ? (
              <div className="w-full h-10 px-3 flex items-center bg-slate-950/40 border border-slate-800/80 rounded-xl text-xs text-slate-500">
                <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin text-sky-400" />
                Đang tải danh sách...
              </div>
            ) : (
              <select
                value={filters.selectedCollection}
                onChange={(e) => setFilters({ selectedCollection: e.target.value })}
                className="w-full h-10 px-3 bg-slate-950/60 border border-slate-800/80 focus:border-sky-500/80 rounded-xl text-xs text-slate-300 outline-none cursor-pointer appearance-none transition-all"
              >
                {collections.map((col) => (
                  <option key={col.id} value={col.id} className="bg-slate-900 text-slate-300">
                    {col.title}
                  </option>
                ))}
              </select>
            )}
            <div className="absolute right-3.5 top-3.5 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Date Filter (Range) */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-0.5">
            Thời gian chụp ảnh vệ tinh (Từ ngày - Đến ngày)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative flex items-center">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ startDate: e.target.value })}
                className="w-full h-10 pl-9 pr-2 bg-slate-950/40 border border-slate-800/80 focus:border-sky-500/80 rounded-xl text-[11px] text-slate-300 outline-none transition-all"
                title="Từ ngày"
              />
              <Calendar className="absolute left-3 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
            <div className="relative flex items-center">
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ endDate: e.target.value })}
                className="w-full h-10 pl-9 pr-2 bg-slate-950/40 border border-slate-800/80 focus:border-sky-500/80 rounded-xl text-[11px] text-slate-300 outline-none transition-all"
                title="Đến ngày"
              />
              <Calendar className="absolute left-3 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Spatial Scope Selector */}
        <div className="space-y-1.5 py-1 px-0.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Phạm vi không gian (Spatial Scope)
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setSpatialScope('viewport')}
              className={`h-8 px-2 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                spatialScope === 'viewport'
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-400'
                  : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 text-slate-400'
              }`}
            >
              Khung nhìn
            </button>
            <button
              type="button"
              disabled={selectedAOIs.length === 0}
              onClick={() => setSpatialScope('aoi')}
              className={`h-8 px-2 rounded-lg text-[10px] font-bold transition-all border cursor-pointer flex items-center justify-center space-x-1 ${
                spatialScope === 'aoi'
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-400'
                  : selectedAOIs.length === 0
                  ? 'bg-slate-950/20 border-slate-900/20 text-slate-600 cursor-not-allowed opacity-40'
                  : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 text-slate-400'
              }`}
              title={selectedAOIs.length === 0 ? "Chọn một AOI trong Quản lý AOI để kích hoạt" : selectedAOIs.length === 1 ? `Vùng AOI: ${selectedAOIs[0].name}` : `Đã chọn ${selectedAOIs.length} vùng AOI`}
            >
              <span>Vùng AOI</span>
              {selectedAOIs.length > 0 && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />}
            </button>
          </div>
          {spatialScope === 'aoi' && selectedAOIs.length > 0 && (
            <div className="text-[10px] text-emerald-400 px-0.5 mt-1.5 flex items-center space-x-1 animate-in fade-in duration-200">
              <span>✓ Đang áp dụng AOI:</span>
              <span className="font-bold underline">
                {selectedAOIs.length === 1 ? selectedAOIs[0].name : `Đã chọn ${selectedAOIs.length} vùng`}
              </span>
            </div>
          )}
        </div>

        {/* Search Action Button */}
        <button
          onClick={handleSearch}
          disabled={searchMutation.isPending}
          className="w-full h-11 bg-sky-500 hover:bg-sky-400 active:scale-[0.98] disabled:bg-sky-500/50 rounded-xl text-xs font-bold text-white shadow-lg shadow-sky-500/10 cursor-pointer flex items-center justify-center space-x-2 transition-all duration-150"
        >
          {searchMutation.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Đang tìm kiếm...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Tìm kiếm ảnh vệ tinh</span>
            </>
          )}
        </button>
      </div>

      {/* Search Results list */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5 px-0.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Kết quả ({searchResults.length})
          </span>
        </div>

        {searchResults.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 italic bg-slate-950/20 border border-slate-800/30 rounded-xl">
            {searchMutation.isPending ? 'Đang tải danh sách kết quả...' : 'Chưa có kết quả tìm kiếm nào'}
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {searchResults.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              const cloudCover = item.properties['eo:cloud_cover'] ?? 0;
              const platform = item.properties.platform || 'Sentinel';
              
              // Find thumbnail asset URL
              const thumbUrl = item.assets.thumbnail?.href || '';

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(isSelected ? null : item)}
                  className={`w-full flex items-start space-x-3 p-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-sky-500/10 border-sky-500/50 text-white shadow-lg'
                      : 'bg-slate-950/20 border-slate-850 hover:bg-slate-800/20 hover:border-slate-800 text-slate-300'
                  }`}
                >
                  {/* Thumbnail Image Container */}
                  <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                    {thumbUrl ? (
                      <img src={thumbUrl} alt="Visual thumb" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-700" />
                    )}
                  </div>

                  {/* Metadata Summary */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="text-xs font-bold truncate text-slate-200">
                      {item.id}
                    </div>
                    <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-semibold">
                      <span className="flex items-center">
                        <Cpu className="w-3 h-3 text-sky-400 mr-1" />
                        {platform}
                      </span>
                      {item.properties['eo:cloud_cover'] !== undefined && (
                        <span className="flex items-center">
                          <Cloud className="w-3 h-3 text-sky-400 mr-1" />
                          {cloudCover}% mây
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {formatDate(item.properties.datetime)}
                    </div>
                  </div>
                  
                  {/* Indicator Icon */}
                  <div className="flex-shrink-0 self-center">
                    <ArrowRight className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isSelected ? 'rotate-90 text-sky-400' : ''}`} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Metadata Detail Drawer (Epic 7) */}
      {selectedItem && (
        <div className="p-3.5 bg-slate-950/60 border border-sky-500/20 rounded-xl space-y-3 shadow-inner animate-in fade-in slide-in-from-bottom-2 duration-250">
          <div className="flex items-center space-x-1.5 pb-1.5 border-b border-slate-800/80">
            <Info className="w-4 h-4 text-sky-400" />
            <h4 className="text-xs font-bold text-slate-200">Chi tiết ảnh (Metadata)</h4>
          </div>

          <div className="space-y-2 text-[10px] font-medium text-slate-300">
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 font-semibold">ID:</span>
              <span className="col-span-2 text-slate-200 break-all font-mono">{selectedItem.id}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 font-semibold">Ngày chụp:</span>
              <span className="col-span-2 text-slate-200">{formatDate(selectedItem.properties.datetime)}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 font-semibold">Platform:</span>
              <span className="col-span-2 text-slate-200 uppercase">{selectedItem.properties.platform || 'N/A'}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 font-semibold">Tỉ lệ mây:</span>
              <span className="col-span-2 text-slate-200">
                {selectedItem.properties['eo:cloud_cover'] !== undefined ? `${selectedItem.properties['eo:cloud_cover']}%` : '0%'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 font-semibold">Tọa độ BBOX:</span>
              <span className="col-span-2 text-slate-200 font-mono text-[9px] leading-relaxed">
                [{selectedItem.bbox.map(n => n.toFixed(3)).join(', ')}]
              </span>
            </div>
          </div>

          {/* Action buttons inside drawer */}
          <div className="pt-1.5 flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <a
                href={`/cog/preview.png?url=${selectedItem.assets.visual.href}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-8 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Xem Ảnh Gốc</span>
              </a>
              
              {selectedItem.assets.visual.href && (
                <a
                  href={selectedItem.assets.visual.href}
                  download
                  className="px-2.5 h-8 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-lg text-[10px] font-bold text-sky-400 hover:text-sky-300 flex items-center justify-center transition-all cursor-pointer"
                  title="Tải ảnh vệ tinh TIFF"
                >
                  Tải TIF
                </a>
              )}
            </div>

            <div className="pt-2 border-t border-slate-900 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  selectImageA(selectedItem);
                  setActiveTab('comparison');
                }}
                className="h-8 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-lg text-[10px] font-bold text-emerald-300 hover:text-emerald-200 transition-all cursor-pointer flex items-center justify-center space-x-1"
              >
                <span>Chọn Ảnh A (T1)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  selectImageB(selectedItem);
                  setActiveTab('comparison');
                }}
                className="h-8 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-lg text-[10px] font-bold text-emerald-300 hover:text-emerald-200 transition-all cursor-pointer flex items-center justify-center space-x-1"
              >
                <span>Chọn Ảnh B (T2)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
