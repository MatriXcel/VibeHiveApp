import { useState } from 'react';

export type BottomSheetPosition = 'collapsed' | 'halfExpanded' | 'fullyExpanded';

export interface ActivityFilters {
  activityType?: string[];
  timeFrame?: string[];
  distance?: string[]; // Keep as string[] for backward compatibility in the UI, but extract numeric values when needed
  groupSize?: string[]; // Keep as string[] in the UI, but parsed as max values when filtering
  additionalOptions?: string[];
  [key: string]: string[] | undefined;
}

const useActivityFilters = () => {
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<ActivityFilters>({});
  // Initialize with collapsed to ensure it's visible from the beginning
  const [bottomSheetPosition, setBottomSheetPosition] = useState<BottomSheetPosition>('collapsed');
  
  const applyFilters = () => {
    setAppliedFilters({ ...filters });
  };
  
  const getActiveFilterCount = () => {
    return Object.values(appliedFilters).reduce((count, filterArray) => {
      return count + (filterArray?.length || 0);
    }, 0);
  };
  
  return {
    filters,
    setFilters,
    appliedFilters,
    setAppliedFilters,
    bottomSheetPosition,
    setBottomSheetPosition,
    applyFilters,
    getActiveFilterCount
  };
};

export default useActivityFilters; 