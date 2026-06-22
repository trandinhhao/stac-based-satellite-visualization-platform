import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Loader2, MapPin, Compass } from 'lucide-react';
import { useMapStore } from '../store/useMapStore';
import { geocodingApi } from '../services/api';

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
}

export default function SearchLocation() {
  const { setCenter, setZoom, setSearchPin } = useMapStore();
  
  // Choose Search Method
  const [searchMethod, setSearchMethod] = useState<'name' | 'coords'>('name');
  
  // Section 1 State: Place Name Search
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Section 2 State: Coordinate Search
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [coordError, setCoordError] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Debounce for Search Query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [query]);

  // Use React Query for caching search suggestions
  const { data: suggestions = [], isLoading, isError } = useQuery<Suggestion[]>({
    queryKey: ['geocoding', debouncedQuery],
    queryFn: async () => {
      const trimmed = debouncedQuery.trim();
      if (trimmed.length < 2) return [];

      const response = await geocodingApi.get('/search', {
        params: {
          q: trimmed,
          format: 'json',
          limit: 5,
          'accept-language': 'vi,en',
        },
      });
      return response.data;
    },
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 10 * 60 * 1000, // Cache results for 10 minutes
  });

  // Open suggestions popover if user starts typing a valid query
  useEffect(() => {
    if (query.trim().length >= 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [query]);

  const handleSelect = (item: Suggestion) => {
    const lng = parseFloat(item.lon);
    const lat = parseFloat(item.lat);
    
    if (!isNaN(lng) && !isNaN(lat)) {
      setCenter([lng, lat]);
      setZoom(16);
      setQuery(item.display_name);
      setIsOpen(false);
      setSearchPin([lng, lat]);
    }
  };

  const handleClear = () => {
    setQuery('');
    setDebouncedQuery('');
    setIsOpen(false);
    setSearchPin(null);
  };

  const handleCoordinateSearch = () => {
    setCoordError(null);
    const lat = parseFloat(latInput.trim());
    const lng = parseFloat(lngInput.trim());

    if (isNaN(lat) || Math.abs(lat) > 90) {
      setCoordError('Vĩ độ không hợp lệ (phải từ -90 đến 90)');
      return;
    }
    if (isNaN(lng) || Math.abs(lng) > 180) {
      setCoordError('Kinh độ không hợp lệ (phải từ -180 đến 180)');
      return;
    }

    setCenter([lng, lat]);
    setZoom(16);
    setSearchPin([lng, lat]);
  };

  const handleCoordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCoordinateSearch();
    }
  };

  const handlePlaceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      handleSelect(suggestions[0]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Method Selector */}
      <div className="flex bg-slate-950/60 p-1 border border-slate-800/80 rounded-xl">
        <button
          onClick={() => setSearchMethod('name')}
          className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
            searchMethod === 'name'
              ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Địa danh</span>
        </button>
        <button
          onClick={() => setSearchMethod('coords')}
          className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
            searchMethod === 'coords'
              ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Tọa độ</span>
        </button>
      </div>

      {searchMethod === 'name' ? (
        /* SECTION 1: Tìm kiếm theo địa danh */
        <div className="space-y-2">
          <div ref={containerRef} className="relative w-full">
            <div className="relative flex items-center">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
                onKeyDown={handlePlaceKeyDown}
                placeholder="Nhập địa điểm cần tìm kiếm..."
                className="w-full h-11 pl-10 pr-10 bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 focus:border-sky-500/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 outline-none transition-all duration-200 shadow-inner"
              />
              
              {/* Search Icon (Left) */}
              <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </div>

              {/* Clear or Loading Spinner (Right) */}
              <div className="absolute right-3.5 flex items-center space-x-1">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                ) : query ? (
                  <button
                    onClick={handleClear}
                    className="text-slate-400 hover:text-white rounded-lg p-0.5 transition-colors duration-150 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
            </div>

            {/* Auto-suggest Popover Dropdown */}
            {isOpen && (
              <div className="absolute top-13 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {isError ? (
                  <div className="p-4 text-center text-xs text-red-400">
                    Có lỗi xảy ra khi tải dữ liệu gợi ý
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 italic">
                    {isLoading ? 'Đang tìm kiếm...' : 'Không tìm thấy địa điểm nào'}
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-800/40 max-h-64 overflow-y-auto">
                    {suggestions.map((item) => (
                      <li key={item.place_id}>
                        <button
                          onClick={() => handleSelect(item)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-800/60 flex items-start space-x-3 transition-colors duration-150 cursor-pointer"
                        >
                          <div className="mt-0.5 p-1 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-lg flex-shrink-0">
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col space-y-0.5 min-w-0">
                            <span className="text-xs font-semibold text-slate-200 truncate">
                              {item.display_name.split(',')[0]}
                            </span>
                            <span className="text-[10px] text-slate-400 line-clamp-1">
                              {item.display_name.split(',').slice(1).join(',').trim()}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* SECTION 2: Tìm kiếm theo tọa độ */
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 block px-1">Vĩ độ (Latitude)</span>
              <input
                type="text"
                value={latInput}
                onChange={(e) => setLatInput(e.target.value)}
                onKeyDown={handleCoordKeyDown}
                placeholder="-90 đến 90"
                className="w-full h-10 px-3 bg-slate-950/50 border border-slate-800/85 hover:border-slate-700 focus:border-sky-500/80 rounded-xl text-xs text-slate-200 placeholder-slate-600 outline-none transition-all duration-200"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 block px-1">Kinh độ (Longitude)</span>
              <input
                type="text"
                value={lngInput}
                onChange={(e) => setLngInput(e.target.value)}
                onKeyDown={handleCoordKeyDown}
                placeholder="-180 đến 180"
                className="w-full h-10 px-3 bg-slate-950/50 border border-slate-800/85 hover:border-slate-700 focus:border-sky-500/80 rounded-xl text-xs text-slate-200 placeholder-slate-600 outline-none transition-all duration-200"
              />
            </div>
          </div>

          {coordError && (
            <p className="text-[10px] text-rose-400 px-1 font-semibold">{coordError}</p>
          )}

          <button
            onClick={handleCoordinateSearch}
            className="w-full h-10 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-sky-950/40 cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Chuyển đến tọa độ</span>
          </button>
        </div>
      )}
    </div>
  );
}
