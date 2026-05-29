import { useState, useCallback } from 'react';

export type BottomSheetPosition = 'collapsed' | 'halfExpanded' | 'fullyExpanded';

export interface ActivityFilters {
  activityType?: string[];
  timeFrame?: string[];
  distance?: string[];
  groupSize?: string[];
  additionalOptions?: string[];
}

export default function useActivityFilters() {
  // Start with collapsed position that shows some content - always visible
  const [bottomSheetPosition, setBottomSheetPosition] = useState<BottomSheetPosition>('collapsed');
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<ActivityFilters>({});
  
  const closeFilterSheet = () => {
    setBottomSheetPosition('collapsed');
  };
  
  const applyFilters = useCallback(() => {
    // Create a clean copy of filters
    const cleanedFilters = { ...filters };
    
    // Remove any empty arrays
    Object.keys(cleanedFilters).forEach(key => {
      const typedKey = key as keyof ActivityFilters;
      if (!cleanedFilters[typedKey] || cleanedFilters[typedKey]?.length === 0) {
        delete cleanedFilters[typedKey];
      }
    });
    
    // Succinct logging
    __DEV__ && console.log("Applying filters:", JSON.stringify(cleanedFilters));
    
    // Apply the cleaned filters
    setAppliedFilters(cleanedFilters);
    
    // Return the cleaned filters for immediate use if needed
    return cleanedFilters;
  }, [filters]);
  
  // Create a setFiltersAndApply function that applies filters immediately
  const setFiltersAndApply = useCallback((newFilters: ActivityFilters) => {
    setFilters(newFilters);
    // Use a small timeout to ensure state is updated before applying
    setTimeout(() => {
      const cleanedFilters = { ...newFilters };
      
      // Remove any empty arrays
      Object.keys(cleanedFilters).forEach(key => {
        const typedKey = key as keyof ActivityFilters;
        if (!cleanedFilters[typedKey] || cleanedFilters[typedKey]?.length === 0) {
          delete cleanedFilters[typedKey];
        }
      });
      
      setAppliedFilters(cleanedFilters);
    }, 0);
  }, []);
  
  const clearFilters = useCallback(() => {
    setFilters({});
    setAppliedFilters({});
  }, []);
  
  const getActiveFilterCount = useCallback(() => {
    return Object.values(appliedFilters).reduce((count, filterArray) => {
      return count + (filterArray?.length || 0);
    }, 0);
  }, [appliedFilters]);
  
  return {
    filters,
    setFilters,
    setFiltersAndApply,
    appliedFilters,
    bottomSheetPosition,
    setBottomSheetPosition,
    closeFilterSheet,
    applyFilters,
    clearFilters,
    getActiveFilterCount
  };
} 