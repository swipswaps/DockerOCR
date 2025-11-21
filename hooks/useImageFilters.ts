import { useState, useCallback } from 'react';
import { ImageFilters } from '../types';
import { DEFAULT_FILTERS } from '../constants';

/**
 * Custom hook for managing image filters
 */
export const useImageFilters = () => {
  const [filters, setFilters] = useState<ImageFilters>(DEFAULT_FILTERS);

  const updateFilter = useCallback((key: keyof ImageFilters, value: number | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const rotateRight = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }));
  }, []);

  const rotateLeft = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      rotation: prev.rotation - 90 < 0 ? 270 : prev.rotation - 90
    }));
  }, []);

  const toggleFlipH = useCallback(() => {
    setFilters(prev => ({ ...prev, flipH: !prev.flipH }));
  }, []);

  const toggleFlipV = useCallback(() => {
    setFilters(prev => ({ ...prev, flipV: !prev.flipV }));
  }, []);

  const toggleInvert = useCallback(() => {
    setFilters(prev => ({ ...prev, invert: !prev.invert }));
  }, []);

  return {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    rotateRight,
    rotateLeft,
    toggleFlipH,
    toggleFlipV,
    toggleInvert,
  };
};

