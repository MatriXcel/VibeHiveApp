import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  ScrollView,
} from 'react-native';
import BottomSheet, { 
  BottomSheetView, 
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps 
} from '@gorhom/bottom-sheet';
import Animated, { 
  FadeIn, 
  FadeOut, 
  LinearTransition,
  SlideInRight,
  SlideOutRight,
  Easing,
  useAnimatedStyle,
  interpolate,
  useSharedValue,
  useDerivedValue,
  runOnJS
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import FilterCategory from './FilterCategory';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { BottomSheetPosition, ActivityFilters } from '../../hooks/Filters/useActivityFilters';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '../../constants/Colors';
import Slider from '@react-native-community/slider';
import { useGestureEventsHandlersDefault } from '@gorhom/bottom-sheet';
import { Gesture } from 'react-native-gesture-handler';
import { GESTURE_SOURCE } from '@gorhom/bottom-sheet';
import { GestureEventPayloadType } from '@gorhom/bottom-sheet/lib/typescript/types';

// Extract distance value from filter string (e.g. "< 10 miles" -> 10)
const getDistanceFromString = (distanceStr: string): number => {
  const match = distanceStr.match(/< (\d+)/);
  return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
};

interface FilterBottomSheetProps {
  position: BottomSheetPosition;
  setPosition: (position: BottomSheetPosition) => void;
  activeFilters: ActivityFilters;
  setActiveFilters: (filters: ActivityFilters) => void;
  onApplyFilters: () => void;
}

const { height, width } = Dimensions.get('window');

// Distance presets for the slider - updated to use numeric values
const DISTANCE_OPTIONS = [
  { value: 1, label: '1mi', displayText: '< 1 mile' },
  { value: 5, label: '5mi', displayText: '< 5 miles' },
  { value: 10, label: '10mi', displayText: '< 10 miles' },
  { value: 25, label: '25mi', displayText: '< 25 miles' },
  { value: Number.MAX_SAFE_INTEGER, label: 'Any', displayText: 'Anywhere' }
];

// Group size presets for the slider
const GROUP_SIZE_OPTIONS = [
  { value: 5, label: '5', displayText: '≤ 5 people' },
  { value: 10, label: '10', displayText: '≤ 10 people' },
  { value: 20, label: '20', displayText: '≤ 20 people' },
  { value: 50, label: '50', displayText: '≤ 50 people' },
  { value: Number.MAX_SAFE_INTEGER, label: 'Any', displayText: 'No Max' }
];

// Define section information
const FILTER_SECTIONS = [
  { id: 'activityType', name: 'Activity Type', index: 0 },
  { id: 'timeFrame', name: 'Time Frame', index: 1 },
  { id: 'distance', name: 'Distance', index: 2 },
  { id: 'groupSize', name: 'Group Size', index: 3 },
  { id: 'additionalOptions', name: 'Additional Options', index: 4 }
];

// Convert position to snap index
const getSnapIndex = (position: BottomSheetPosition): number => {
  switch (position) {
    case 'collapsed': return 0;
    case 'halfExpanded': return 1;
    case 'fullyExpanded': return 2;
    default: return 0;
  }
};

// Convert snap index to position
const getPositionFromIndex = (index: number): BottomSheetPosition => {
  switch (index) {
    case 0: return 'collapsed';
    case 1: return 'halfExpanded';
    case 2: return 'fullyExpanded';
    default: return 'collapsed';
  }
};

let debounce = false;

// FilterBottomSheet component
const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({ 
  position, 
  setPosition, 
  activeFilters, 
  setActiveFilters,
  onApplyFilters,
}) => {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);
  
  // Track expanded sections - multiple can be expanded at a time
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [isDraggingExpanded, setIsDraggingExpanded] = useState(false);
  
  // Create refs for each section
  const sectionRefs = {
    activityType: useRef<View>(null),
    timeFrame: useRef<View>(null),
    distance: useRef<View>(null),
    groupSize: useRef<View>(null),
    additionalOptions: useRef<View>(null)
  };
  
  // Get the current color scheme
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  // Define snap points - heights as percentages or absolute values
  const snapPoints = useMemo(() => {
    const collapsedHeight = 15;
    const halfExpandedPercent = 60; // 50% of screen height
    const fullyExpandedPercent = 75; // 70% of screen height
    
    return [`${collapsedHeight}%`, 
      `${halfExpandedPercent}%`, 
      `${fullyExpandedPercent}%`
    ];
  }, []);


  const animatedPosition = useSharedValue(0);
  const hasExpandedOnce = useSharedValue(false);

  // Track position changes to detect drag start
  useDerivedValue(() => {
    // You can detect when dragging starts by monitoring position changes
    const positionY = animatedPosition.value;

    if (positionY < 650) {
      if (!hasExpandedOnce.value) {
        hasExpandedOnce.value = true;
        const allSections = ['activityType', 'timeFrame', 'distance', 'groupSize', 'additionalOptions'];
        runOnJS(setExpandedSections)(allSections);  
        runOnJS(setIsDraggingExpanded)(true);
      }
    } else {
      if(hasExpandedOnce.value) {
        hasExpandedOnce.value = false;
        runOnJS(setExpandedSections)([]);
        runOnJS(setIsDraggingExpanded)(false);
      }
    }

    // Custom logic to detect drag start based on position changes
    // This will run on every position update during dragging
  }, [animatedPosition]);

  
  // const useCustomGestureHandler = () => {
  //   // Get the default gesture handlers
  //   const defaultHandlers = useGestureEventsHandlersDefault();
    
  //   const hasExpandedOnce = useSharedValue(false);
  
  //   const handleOnChange = (source: GESTURE_SOURCE, payload: GestureEventPayloadType) => {
  //     'worklet';
  //     defaultHandlers.handleOnChange(source, payload);
  //     console.log(payload.absoluteY);
  //     if (payload.absoluteY < 720) {
  //       if (!hasExpandedOnce.value) {
  //         hasExpandedOnce.value = true;
  //         const allSections = ['activityType', 'timeFrame', 'distance', 'groupSize', 'additionalOptions'];
  //         runOnJS(setExpandedSections)(allSections);  
  //         runOnJS(setIsDraggingExpanded)(true);
  //       }
  //     } else {
  //       if(hasExpandedOnce.value) {
  //         hasExpandedOnce.value = false;
  //         runOnJS(setExpandedSections)([]);
  //         runOnJS(setIsDraggingExpanded)(false);
  //       }
  //     }
  //   };

  //   const handleOnEnd = (source: GESTURE_SOURCE, payload: GestureEventPayloadType) => {
  //     'worklet';
  //     defaultHandlers.handleOnEnd(source, payload);
  //     if(position === 'collapsed') {
  //       hasExpandedOnce.value = false;
  //       runOnJS(setExpandedSections)([]);
  //       runOnJS(setIsDraggingExpanded)(false);
  //     }
  //   };

  //   return {
  //     handleOnStart: defaultHandlers.handleOnStart,
  //     // Include other default handlers
  //     handleOnChange: handleOnChange,
  //     handleOnEnd: handleOnEnd,
  //     handleOnFinalize: defaultHandlers.handleOnFinalize
  //   };
  // };

  // Handle snap point changes
  const handleSheetChanges = useCallback((index: number) => {
    const newPosition = getPositionFromIndex(index);
    setPosition(newPosition);
    
    
    // Auto-expand sections when moving to expanded states
    // if (index > 0) { // halfExpanded or fullyExpanded
    //   const allSections = ['activityType', 'timeFrame', 'distance', 'groupSize', 'additionalOptions'];
    //   setExpandedSections(allSections);
    // } else { // collapsed
    //   setExpandedSections([]);
    // }
    
    // Reset isDraggingExpanded when the sheet snaps to a position
    // setIsDraggingExpanded(index > 0);

    __DEV__ && console.log(`Bottom sheet changed to index: ${index}, position: ${newPosition}`);
  }, [setPosition]);
  
  // Custom backdrop component
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={1} // Start showing backdrop from index 1
        disappearsOnIndex={0}
        opacity={0.5}
        enableTouchThrough={false}
      />
    ),
    []
  );
  
  // Handle expanding/collapsing a section
  const handleSectionToggle = (sectionName: string, isExpanded: boolean) => {
    if (isExpanded) {
      // Add this section to expanded sections
      const newExpandedSections = [...expandedSections, sectionName];
      setExpandedSections(newExpandedSections);
      
      // When expanding, ensure we're in expanded mode
      if (position === 'collapsed') {
        bottomSheetRef.current?.snapToIndex(1); // Move to halfExpanded
      }
    } else {
      // Remove this section from expanded sections
      const newExpandedSections = expandedSections.filter(name => name !== sectionName);
      setExpandedSections(newExpandedSections);
    }
  };
  
  // Helper function to get icon for activity type
  const getActivityIcon = (activityType: string): any => {
    const iconMap: {[key: string]: any} = {
      'Sports': 'futbol-o',
      'Art & Culture': 'paint-brush',
      'Food & Drink': 'cutlery',
      'Outdoor': 'tree',
      'Nightlife': 'glass',
      'Other': 'star'
    };
    
    return iconMap[activityType] || 'star';
  };
  
  // Count the total number of applied filters across all categories
  const getFilterCount = () => {
    return Object.values(activeFilters).reduce((count, filterArray) => {
      return count + (filterArray?.length || 0);
    }, 0);
  };
  
  // Handle filter updates
  const updateFilterCategory = (category: string, values: string[]) => {
    __DEV__ && console.log(`Updating category ${category} with values:`, values);
    const newFilters = { ...activeFilters } as ActivityFilters;
    
    // Type-safe assignment
    newFilters[category as keyof ActivityFilters] = values;
    
    // Clean up empty arrays
    Object.keys(newFilters).forEach(key => {
      const typedKey = key as keyof ActivityFilters;
      if (newFilters[typedKey]?.length === 0) {
        delete newFilters[typedKey];
      }
    });
    
    // Update filters
    setActiveFilters(newFilters);
    
    Haptics.selectionAsync();
  };
  
  // Handle clearing all filters
  const handleClearAll = () => {
    setActiveFilters({});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Helper for distance slider
  const getDistanceIndex = (distanceOption: string): number => {
    // Handle "Anywhere" as a special case
    if (distanceOption === 'Anywhere') {
      return DISTANCE_OPTIONS.length - 1;
    }
    
    // Extract the numeric value using the same function used in filtering
    const distanceValue = getDistanceFromString(distanceOption);
    const index = DISTANCE_OPTIONS.findIndex(option => option.value === distanceValue);
    return index >= 0 ? index : DISTANCE_OPTIONS.length - 1; // Default to 'Anywhere' if not found
  };

  // Helper for group size slider
  const getGroupSizeIndex = (groupSizeOption: string): number => {
    // Handle "No Max" as a special case
    if (groupSizeOption === 'No Max') {
      return GROUP_SIZE_OPTIONS.length - 1;
    }
    
    // Extract the numeric value from string like "≤ 10 people"
    const match = groupSizeOption.match(/≤ (\d+)/);
    const groupSizeValue = match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
    
    const index = GROUP_SIZE_OPTIONS.findIndex(option => option.value === groupSizeValue);
    return index >= 0 ? index : GROUP_SIZE_OPTIONS.length - 1; // Default to 'No Max' if not found
  };

  // Handle distance slider change
  const handleDistanceChange = (index: number) => {
    const distanceOption = DISTANCE_OPTIONS[index].displayText;
    updateFilterCategory('distance', [distanceOption]);
    Haptics.selectionAsync(); // Add haptic feedback
  };
  
  // Handle group size slider change
  const handleGroupSizeChange = (index: number) => {
    const groupSizeOption = GROUP_SIZE_OPTIONS[index].displayText;
    updateFilterCategory('groupSize', [groupSizeOption]);
    Haptics.selectionAsync(); // Add haptic feedback
  };

  // Get filter summary for collapsed view with icons
  const getFilterSummary = () => {
    if (getFilterCount() === 0) return null;

    const summaryItems = [];
    
    // Add activity types with count
    if (activeFilters.activityType?.length) {
      summaryItems.push(`${activeFilters.activityType.length} ${activeFilters.activityType.length === 1 ? 'activity' : 'activities'}`);
    }
    
    // Add time frame
    if (activeFilters.timeFrame?.length) {
      summaryItems.push(activeFilters.timeFrame[0]);
    }
    
    // Add distance
    if (activeFilters.distance?.length) {
      summaryItems.push(activeFilters.distance[0]);
    }
    
    // Add group size
    if (activeFilters.groupSize?.length) {
      summaryItems.push(activeFilters.groupSize[0]);
    }
    
    // Add additional options
    if (activeFilters.additionalOptions?.length) {
      summaryItems.push(`${activeFilters.additionalOptions.length} option${activeFilters.additionalOptions.length !== 1 ? 's' : ''}`);
    }
    
    return summaryItems;
  };

  // Render collapsed content
  const renderCollapsedContent = () => (
    <View style={styles.collapsedContent}>
      <Text style={[styles.filterCountHeader, { color: colors.filterText }]}>
        {getFilterCount()} Filters Applied
      </Text>
      
      <View style={styles.summarySectionIcons}>
        {/* Simplified summary display with bullet separators */}
        <Text style={[styles.filterSummary, { color: colors.filterHighlight }]}>
          {getFilterSummary()?.map((item, index) => (
            <Text key={index}>
              {index > 0 ? ' • ' : ''}
              {item}
            </Text>
          ))}
        </Text>
      </View>
      
      <Text style={[styles.filterHint, { color: colors.filterSecondaryText }]}>
        Swipe up to see all filters
      </Text>
    </View>
  );

  // Render expanded content with all filter categories
  const renderExpandedContent = () => {
    // Check which sections are expanded
    const isActivityTypeExpanded = expandedSections.includes('activityType');
    const isTimeFrameExpanded = expandedSections.includes('timeFrame');
    const isDistanceExpanded = expandedSections.includes('distance');
    const isGroupSizeExpanded = expandedSections.includes('groupSize');
    const isAdditionalOptionsExpanded = expandedSections.includes('additionalOptions');
    
    return (
      <BottomSheetScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header shown when expanded */}
        <Animated.View 
          style={styles.header}
          entering={FadeIn.duration(150).easing(Easing.out(Easing.back(1.2)))}
          layout={LinearTransition.duration(200).easing(Easing.out(Easing.back(1.1)))}
        >
          <Animated.View layout={LinearTransition.duration(150).easing(Easing.out(Easing.back(1.1)))}>
            <Text style={[styles.title, { color: colors.filterText }]}>
              Filters
              {getFilterCount() > 0 && (
                <Animated.Text 
                  style={[styles.filterCountHeader, { color: colors.filterHighlight }]}
                  entering={SlideInRight.duration(120).easing(Easing.out(Easing.back(1.5)))}
                  exiting={SlideOutRight.duration(80).easing(Easing.in(Easing.back(1.5)))}
                  layout={LinearTransition.duration(150).easing(Easing.out(Easing.back(1.2)))}
                > · {getFilterCount()}</Animated.Text>
              )}
            </Text>
          </Animated.View>
          
          {getFilterCount() > 0 && (
            <Animated.View
              entering={SlideInRight.duration(150).easing(Easing.out(Easing.back(1.3)))}
              exiting={SlideOutRight.duration(100).easing(Easing.in(Easing.back(1.3)))}
              layout={LinearTransition.duration(180).easing(Easing.out(Easing.back(1.1)))}
            >
              <TouchableOpacity 
                style={[
                  styles.clearButtonContainer, 
                  { 
                    backgroundColor: colorScheme === 'dark' ? 'rgba(60, 65, 75, 0.5)' : 'rgba(240, 245, 250, 0.6)' 
                  }
                ]} 
                onPress={handleClearAll}
                activeOpacity={0.7}
              >
                <Text style={[styles.clearButton, { color: colors.filterHighlight }]}>Reset</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>

        {/* Activity Type */}
        <View ref={sectionRefs.activityType}>
          <FilterCategory
            title="Activity Type"
            isMultiSelect={true}
            options={[
              'Sports',
              'Art & Culture',
              'Food & Drink',
              'Outdoor',
              'Nightlife',
              'Other'
            ]}
            selectedOptions={activeFilters.activityType || []}
            onSelectionChanged={(selection) => updateFilterCategory('activityType', selection)}
            defaultExpanded={isActivityTypeExpanded}
            onToggle={(isExpanded) => handleSectionToggle('activityType', isExpanded)}
          />
        </View>
        
        <View style={[styles.divider, { backgroundColor: colorScheme === 'dark' ? 'rgba(70, 75, 85, 0.5)' : 'rgba(230, 235, 240, 0.8)' }]} />
        
        {/* Time Frame */}
        <View ref={sectionRefs.timeFrame}>
          <FilterCategory
            title="Time Frame"
            isMultiSelect={false}
            options={[
              'Today',
              'Tomorrow',
              'This Week',
              'This Weekend',
              'Next Week',
              'Custom'
            ]}
            selectedOptions={activeFilters.timeFrame || []}
            onSelectionChanged={(selection) => updateFilterCategory('timeFrame', selection)}
            defaultExpanded={isTimeFrameExpanded}
            onToggle={(isExpanded) => handleSectionToggle('timeFrame', isExpanded)}
          />
        </View>
        
        <View style={[styles.divider, { backgroundColor: colorScheme === 'dark' ? 'rgba(70, 75, 85, 0.5)' : 'rgba(230, 235, 240, 0.8)' }]} />
        
        {/* Distance with custom slider */}
        <View ref={sectionRefs.distance} style={styles.categorySection}>
          <TouchableOpacity 
            style={styles.categoryHeader}
            onPress={() => handleSectionToggle('distance', !isDistanceExpanded)}
            activeOpacity={0.7}
          >
            <Text style={[styles.categoryTitle, { color: colors.filterText }]}>Distance</Text>
            <View style={styles.categoryHeaderRight}>
              {activeFilters.distance && activeFilters.distance.length > 0 && (
                <Animated.Text 
                  style={[styles.categorySelectedValue, { color: colors.filterHighlight }]}
                  entering={FadeIn.duration(120).easing(Easing.out(Easing.back(1.2)))}
                  exiting={FadeOut.duration(80).easing(Easing.in(Easing.back(1.2)))}
                  layout={LinearTransition.duration(150).easing(Easing.out(Easing.back(1.1)))}
                >
                  {activeFilters.distance[0]}
                </Animated.Text>
              )}
              <Animated.View style={{
                transform: [{ rotate: isDistanceExpanded ? '180deg' : '0deg' }]
              }}>
                <Ionicons name="chevron-down" size={20} color={colors.filterSecondaryText} />
              </Animated.View>
            </View>
          </TouchableOpacity>
          
          {isDistanceExpanded && (
            <Animated.View 
              style={styles.categoryContent}
              entering={FadeIn.duration(150).easing(Easing.out(Easing.back(1.1)))}
              exiting={FadeOut.duration(100).easing(Easing.in(Easing.back(1.2)))}
              layout={LinearTransition.duration(180).easing(Easing.out(Easing.back(1.1)))}
            >
              <Text style={[styles.sliderValue, { color: colors.filterHighlight }]}>
                {activeFilters.distance?.[0] || 'Anywhere'}
              </Text>
              
              <Slider
                style={styles.communitySlider}
                minimumValue={0}
                maximumValue={DISTANCE_OPTIONS.length - 1}
                step={1}
                value={getDistanceIndex(activeFilters.distance?.[0] || 'Anywhere')}
                onValueChange={(value) => handleDistanceChange(Math.round(value))}
                onSlidingComplete={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                minimumTrackTintColor={colors.filterHighlight}
                maximumTrackTintColor={colors.filterSliderTrack}
                thumbTintColor={colors.filterHighlight}
              />
              
              <View style={styles.sliderLabels}>
                {DISTANCE_OPTIONS.map((option, index) => (
                  <Text 
                    key={`label-${index}`}
                    style={[
                      styles.sliderLabel,
                      { color: colors.filterSecondaryText },
                      index === getDistanceIndex(activeFilters.distance?.[0] || 'Anywhere') ? 
                        { color: colors.filterHighlight, fontWeight: '600' } : null
                    ]}
                  >
                    {option.label}
                  </Text>
                ))}
              </View>
            </Animated.View>
          )}
        </View>
        
        <View style={[styles.divider, { backgroundColor: colorScheme === 'dark' ? 'rgba(70, 75, 85, 0.5)' : 'rgba(230, 235, 240, 0.8)' }]} />
        
        {/* Group Size with custom slider */}
        <View ref={sectionRefs.groupSize} style={styles.categorySection}>
          <TouchableOpacity 
            style={styles.categoryHeader}
            onPress={() => handleSectionToggle('groupSize', !isGroupSizeExpanded)}
            activeOpacity={0.7}
          >
            <Text style={[styles.categoryTitle, { color: colors.filterText }]}>Group Size</Text>
            <View style={styles.categoryHeaderRight}>
              {activeFilters.groupSize && activeFilters.groupSize.length > 0 && (
                <Animated.Text 
                  style={[styles.categorySelectedValue, { color: colors.filterHighlight }]}
                  entering={FadeIn.duration(120).easing(Easing.out(Easing.back(1.2)))}
                  exiting={FadeOut.duration(80).easing(Easing.in(Easing.back(1.2)))}
                  layout={LinearTransition.duration(150).easing(Easing.out(Easing.back(1.1)))}
                >
                  {activeFilters.groupSize[0]}
                </Animated.Text>
              )}
              <Animated.View style={{
                transform: [{ rotate: isGroupSizeExpanded ? '180deg' : '0deg' }]
              }}>
                <Ionicons name="chevron-down" size={20} color={colors.filterSecondaryText} />
              </Animated.View>
            </View>
          </TouchableOpacity>
          
          {isGroupSizeExpanded && (
            <Animated.View 
              style={styles.categoryContent}
              entering={FadeIn.duration(150).easing(Easing.out(Easing.back(1.1)))}
              exiting={FadeOut.duration(100).easing(Easing.in(Easing.back(1.2)))}
              layout={LinearTransition.duration(180).easing(Easing.out(Easing.back(1.1)))}
            >
              <Text style={[styles.sliderValue, { color: colors.filterHighlight }]}>
                {activeFilters.groupSize?.[0] || 'No Max'}
              </Text>
              
              <Slider
                style={styles.communitySlider}
                minimumValue={0}
                maximumValue={GROUP_SIZE_OPTIONS.length - 1}
                step={1}
                value={getGroupSizeIndex(activeFilters.groupSize?.[0] || 'No Max')}
                onValueChange={(value) => handleGroupSizeChange(Math.round(value))}
                onSlidingComplete={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                minimumTrackTintColor={colors.filterHighlight}
                maximumTrackTintColor={colors.filterSliderTrack}
                thumbTintColor={colors.filterHighlight}
              />
              
              <View style={styles.sliderLabels}>
                {GROUP_SIZE_OPTIONS.map((option, index) => (
                  <Text 
                    key={`group-size-label-${index}`}
                    style={[
                      styles.sliderLabel,
                      { color: colors.filterSecondaryText },
                      index === getGroupSizeIndex(activeFilters.groupSize?.[0] || 'No Max') ? 
                        { color: colors.filterHighlight, fontWeight: '600' } : null
                    ]}
                  >
                    {option.label}
                  </Text>
                ))}
              </View>
            </Animated.View>
          )}
        </View>
        
        <View style={[styles.divider, { backgroundColor: colorScheme === 'dark' ? 'rgba(70, 75, 85, 0.5)' : 'rgba(230, 235, 240, 0.8)' }]} />
        
        {/* Additional Options */}
        <View ref={sectionRefs.additionalOptions}>
          <FilterCategory
            title="Additional Options"
            isMultiSelect={true}
            options={[
              'Free events only',
              'Accessible',
              'Family friendly',
              'Pet friendly'
            ]}
            selectedOptions={activeFilters.additionalOptions || []}
            onSelectionChanged={(selection) => updateFilterCategory('additionalOptions', selection)}
            defaultExpanded={isAdditionalOptionsExpanded}
            onToggle={(isExpanded) => handleSectionToggle('additionalOptions', isExpanded)}
          />
        </View>
        
        {/* Bottom padding */}
        <View style={{ height: insets.bottom + 20 }} />
      </BottomSheetScrollView>
    );
  };

  // Effect to sync external position changes with bottom sheet
  useEffect(() => {
    const targetIndex = getSnapIndex(position);
    bottomSheetRef.current?.snapToIndex(targetIndex);
  }, [position]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={getSnapIndex(position)}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      onChange={handleSheetChanges}
      animatedPosition={animatedPosition}
      // gestureEventsHandlersHook={useCustomGestureHandler}
      onAnimate={(fromIndex: number, toIndex: number, fromPosition: number, toPosition: number) => {
        if(toIndex === 0) {
          setExpandedSections([]);
          setIsDraggingExpanded(false);
        } else {
          const allSections = ['activityType', 'timeFrame', 'distance', 'groupSize', 'additionalOptions'];
          setExpandedSections(allSections);
          setIsDraggingExpanded(true);
        }
      }}
      // backdropComponent={renderBackdrop}
      enablePanDownToClose={false}
      handleIndicatorStyle={[
        styles.handle, 
        { backgroundColor: colors.filterHandle }
      ]}
      backgroundStyle={[
        styles.backgroundStyle,
        { 
          backgroundColor: colorScheme === 'dark' ? 'rgba(25, 28, 36, 0.95)' : 'rgba(255, 255, 255, 0.97)',
          shadowColor: '#000',
          shadowOpacity: colorScheme === 'dark' ? 0.5 : 0.25,
          shadowOffset: {
            width: 0,
            height: -3,
          },
          shadowRadius: 12,
          elevation: 24,
          borderTopWidth: colorScheme === 'dark' ? 1 : 0.5,
          borderLeftWidth: colorScheme === 'dark' ? 1 : 0.5,
          borderRightWidth: colorScheme === 'dark' ? 1 : 0.5,
          borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
        }
      ]}
    >
      <BottomSheetView style={styles.container}>
        {!isDraggingExpanded 
          ? renderCollapsedContent() 
          : renderExpandedContent()}
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  backgroundStyle: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 36,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingTop: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  filterCountHeader: {
    fontSize: 18,
    fontWeight: '600',
  },
  clearButtonContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  clearButton: {
    fontWeight: '500',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  collapsedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 10,
  },
  filterSummary: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  filterHint: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(241,245,249,0.8)',
    marginVertical: 0,
  },
  categorySection: {
    marginVertical: 0,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
    paddingVertical: 0,
  },
  categoryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  categorySelectedValue: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    marginRight: 8,
  },
  categoryContent: {
    paddingVertical: 8,
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    marginBottom: 12,
  },
  communitySlider: {
    width: '100%',
    height: 40,
    marginVertical: 8,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    marginTop: 2,
  },
  sliderLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  summarySectionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
});

export default FilterBottomSheet; 