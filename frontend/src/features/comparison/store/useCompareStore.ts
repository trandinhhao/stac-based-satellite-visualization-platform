import { create } from 'zustand';
import { type STACItem } from '../../../store/useSTACStore';

interface CompareState {
  imageA: STACItem | null;
  imageB: STACItem | null;
  compareMode: 'side-by-side' | 'swipe' | 'none';
  opacity: number; // For swipe mode opacity blending (0.0 to 1.0)
  swipePosition: number; // Split screen percentage (0 to 100)

  selectImageA: (item: STACItem | null) => void;
  selectImageB: (item: STACItem | null) => void;
  setCompareMode: (mode: 'side-by-side' | 'swipe' | 'none') => void;
  setOpacity: (val: number) => void;
  setSwipePosition: (pos: number) => void;
  clearComparison: () => void;
}

export const useCompareStore = create<CompareState>((set) => ({
  imageA: null,
  imageB: null,
  compareMode: 'none',
  opacity: 1.0,
  swipePosition: 50,

  selectImageA: (imageA) => set({ imageA }),
  selectImageB: (imageB) => set({ imageB }),
  setCompareMode: (compareMode) => set({ compareMode }),
  setOpacity: (opacity) => set({ opacity }),
  setSwipePosition: (swipePosition) => set({ swipePosition }),
  clearComparison: () => set({
    imageA: null,
    imageB: null,
    compareMode: 'none',
    opacity: 1.0,
    swipePosition: 50,
  }),
}));
