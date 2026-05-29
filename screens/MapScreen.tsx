import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, StyleSheet, StatusBar, Dimensions, TouchableOpacity, ScrollView, Animated, Text } from 'react-native';
import MapView, { Marker, Callout, Region } from 'react-native-maps';
import { Clusterer, isPointCluster } from 'react-native-clusterer';
import { ThemedText } from '../components/ThemedText';
import FilterBottomSheet from '../components/Filters/FilterBottomSheet';
import useActivityFilters from '../hooks/Filters/useActivityFilters';
import { useColorScheme } from '../hooks/useColorScheme';
import { Colors } from '../constants/Colors';
import { FontAwesome } from '@expo/vector-icons';

// Helper functions for formatting distance and group size 
const formatDistance = (distance: number): string => {
  return distance === Number.MAX_SAFE_INTEGER ? 'Anywhere' : `< ${distance} mile${distance !== 1 ? 's' : ''}`;
};

const formatGroupSize = (max: number): string => {
  if (max === Number.MAX_SAFE_INTEGER) {
    return '21+ people';
  } else if (max <= 5) {
    return '1-5 people';
  } else if (max <= 10) {
    return '6-10 people';
  } else if (max <= 20) {
    return '11-20 people';
  }
  return '21+ people';
};

// Extract distance value from filter string (e.g. "< 10 miles" -> 10)
const getDistanceFromString = (distanceStr: string): number => {
  const match = distanceStr.match(/< (\d+)/);
  return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
};

// Parse group size from string (e.g. "6-10 people" -> max: 10)
const parseGroupSize = (groupSizeStr: string): number => {
  // Handle "No Max" as a special case
  if (groupSizeStr === 'No Max') {
    return Number.MAX_SAFE_INTEGER;
  }
  
  // Handle new format: "≤ 10 people"
  if (groupSizeStr.includes('≤')) {
    const match = groupSizeStr.match(/≤ (\d+)/);
    return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
  }
  
  // Handle legacy format with ranges like "6-10 people"
  if (groupSizeStr.includes('-')) {
    const [_, maxStr] = groupSizeStr.split('-');
    return parseInt(maxStr.split(' ')[0].trim(), 10);
  }
  
  // Handle legacy format with "+" like "21+ people"
  if (groupSizeStr.includes('+')) {
    return Number.MAX_SAFE_INTEGER;
  }
  
  // Default to no max if we can't parse
  return Number.MAX_SAFE_INTEGER;
};

// Mock data for activities with numeric values
const mockActivities = [
  {
    id: '1',
    name: 'Beach Volleyball',
    description: 'Join us for beach volleyball at Ocean Beach',
    type: 'Sports',
    timeFrame: 'Today',
    distance: 5, // Numeric value in miles
    groupSizeMax: 10, // Just max group size
    additionalOptions: ['Family friendly'],
    latitude: 37.7599,
    longitude: -122.5044,
  },
  {
    id: '2',
    name: 'Wine Tasting',
    description: 'Wine tasting tour in Napa Valley',
    type: 'Food & Drink',
    timeFrame: 'This Weekend',
    distance: 25,
    groupSizeMax: 20,
    additionalOptions: [],
    latitude: 38.2975,
    longitude: -122.2868,
  },
  {
    id: '3',
    name: 'Outdoor Yoga',
    description: 'Sunrise yoga in Golden Gate Park',
    type: 'Sports',
    timeFrame: 'Tomorrow',
    distance: 5,
    groupSizeMax: 5,
    additionalOptions: ['Free events only'],
    latitude: 37.7694,
    longitude: -122.4862,
  },
  {
    id: '4',
    name: 'Jazz Concert',
    description: 'Live jazz at the San Francisco Jazz Center',
    type: 'Art & Culture',
    timeFrame: 'Next Week',
    distance: 10,
    groupSizeMax: Number.MAX_SAFE_INTEGER,
    additionalOptions: ['Accessible'],
    latitude: 37.7765,
    longitude: -122.4200,
  },
  {
    id: '5',
    name: 'Dog Meetup',
    description: 'Bring your furry friends to Dolores Park',
    type: 'Other',
    timeFrame: 'This Week',
    distance: 1,
    groupSizeMax: 10,
    additionalOptions: ['Pet friendly', 'Free events only'],
    latitude: 37.7596,
    longitude: -122.4269,
  },
  {
    id: '6',
    name: 'Hiking Club',
    description: 'Hike through Muir Woods',
    type: 'Outdoor',
    timeFrame: 'This Weekend',
    distance: 25,
    groupSizeMax: 20,
    additionalOptions: ['Family friendly'],
    latitude: 37.8914,
    longitude: -122.5800,
  },
  {
    id: '7',
    name: 'Golden Gate Bridge Walk',
    description: 'Walk across the iconic Golden Gate Bridge',
    type: 'Outdoor',
    timeFrame: 'Today',
    distance: 10,
    groupSizeMax: Number.MAX_SAFE_INTEGER,
    additionalOptions: ['Accessible', 'Free events only'],
    latitude: 37.8199,
    longitude: -122.4783,
  },
  {
    id: '8',
    name: 'Sausalito Art Fair',
    description: 'Explore local art in beautiful Sausalito',
    type: 'Art & Culture',
    timeFrame: 'This Weekend',
    distance: 15,
    groupSizeMax: 50,
    additionalOptions: ['Family friendly'],
    latitude: 37.8591,
    longitude: -122.5194,
  },
  {
    id: '9',
    name: 'Coffee Meetup in Mission',
    description: 'Casual coffee and chat near Dolores Park',
    type: 'Food & Drink',
    timeFrame: 'Tomorrow',
    distance: 1,
    groupSizeMax: 5,
    additionalOptions: [],
    latitude: 37.7600,
    longitude: -122.4275,
  }
];

// Define marker color types outside the component
type ActivityType = 'Sports' | 'Art & Culture' | 'Food & Drink' | 'Outdoor' | 'Nightlife' | 'Other';
type ColorScheme = 'light' | 'dark';
type MarkerColors = {
  [key in ColorScheme]: {
    [key in ActivityType]: string;
  };
};

const { width, height } = Dimensions.get('window');
const MAP_DIMENSIONS = { width, height };

// Disable console logs in production
if (!__DEV__) {
  console.log = () => null;
}

// Define interface for the activity properties we expect in our GeoJSON points
interface ActivityProperties {
  id: string;
  name: string;
  description: string;
  type: ActivityType;
  timeFrame: string;
  distance: number;
  groupSizeMax: number;
  additionalOptions: string[];
  // Add any other properties from mockActivities you need in the marker/callout
}

// Define the structure for cluster points returned by Clusterer
interface ClusterProperties {
  cluster: true;
  cluster_id: number;
  point_count: number;
  point_count_abbreviated: string | number;
  // Function to get expansion region (added by react-native-clusterer)
  getExpansionRegion?: () => Region;
}

// Define a type for points (can be a cluster or an individual point)
type MapPoint = any; // We'll use type assertions where needed

const MapScreen: React.FC<{ isDirectoryVisible?: boolean }> = ({ isDirectoryVisible = false }) => {
  // Get theme colors
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const {
    filters,
    setFilters,
    setFiltersAndApply,
    appliedFilters,
    bottomSheetPosition, 
    setBottomSheetPosition,
    applyFilters,
    getActiveFilterCount
  } = useActivityFilters();
  
  const [region, setRegion] = useState<Region>({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  
  const mapRef = useRef<MapView>(null);

  // Use useMemo to compute filtered activities whenever appliedFilters changes
  const filteredActivities = useMemo(() => {
    __DEV__ && console.log("Recalculating filtered activities");
    
    // Filter activities based on applied filters
    return mockActivities.filter(activity => {
      // If no filters are applied, show all activities
      if (Object.keys(appliedFilters).length === 0) {
        return true;
      }
      
      // Check activity type
      if (
        appliedFilters.activityType && 
        appliedFilters.activityType.length > 0 &&
        !appliedFilters.activityType.includes(activity.type)
      ) {
        return false;
      }
      
      // Check time frame filter
      if (
        appliedFilters.timeFrame && 
        appliedFilters.timeFrame.length > 0 && 
        !appliedFilters.timeFrame.includes(activity.timeFrame)
      ) {
        return false;
      }
      
      // Check distance filter
      if (
        appliedFilters.distance && 
        appliedFilters.distance.length > 0
      ) {
        // For "Anywhere" we accept all distances
        if (appliedFilters.distance[0] !== 'Anywhere') {
          // Get numeric distance from filter string
          const filterDistance = getDistanceFromString(appliedFilters.distance[0]);
          
          // Direct numeric comparison with activity's distance value
          if (activity.distance > filterDistance) {
            return false;
          }
        }
      }
      
      // Check group size filter
      if (
        appliedFilters.groupSize && 
        appliedFilters.groupSize.length > 0
      ) {
        // Parse group size from filter string
        const filterMaxGroupSize = parseGroupSize(appliedFilters.groupSize[0]);
        
        // Simple comparison based on max values
        if (activity.groupSizeMax > filterMaxGroupSize) {
          return false;
        }
      }
      
      // Check additional options - activity must have at least one of the selected options
      if (appliedFilters.additionalOptions && appliedFilters.additionalOptions.length > 0) {
        // Check if the activity has any of the selected additional options
        const hasAnyOption = appliedFilters.additionalOptions.some(option => 
          activity.additionalOptions.includes(option)
        );
        
        if (!hasAnyOption) {
          return false;
        }
      }
      
      return true;
    });
  }, [appliedFilters]); // Only recalculate when appliedFilters changes
  
  // Log filtered activities count for debugging
  useEffect(() => {
    __DEV__ && console.log(`Showing ${filteredActivities.length} of ${mockActivities.length} activities`);
  }, [filteredActivities]);
  
  // Helper function to get marker color based on activity type and theme
  const getMarkerColor = (activityType: string): string => {
    // Base colors
    const markerColors: MarkerColors = {
      light: {
        'Sports': '#FF5A5F',       // Red
        'Art & Culture': '#7B54A3', // Purple
        'Food & Drink': '#F1C400', // Yellow
        'Outdoor': '#52B788',      // Green
        'Nightlife': '#6578F8',    // Blue
        'Other': '#4285F4',        // Default blue
      },
      dark: {
        'Sports': '#FF6B70',       // Brighter red
        'Art & Culture': '#9966CC', // Brighter purple  
        'Food & Drink': '#FFDD33', // Brighter yellow
        'Outdoor': '#63D99F',      // Brighter green
        'Nightlife': '#768AFF',    // Brighter blue
        'Other': '#5C9CFF',        // Brighter default blue
      }
    };
    
    // Use the current color scheme from the component
    const scheme = colorScheme as ColorScheme;
    
    // Return appropriate color based on theme
    return markerColors[scheme][activityType as ActivityType] || markerColors[scheme]['Other'];
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

  // Helper function to get icon for time frame
  const getTimeIcon = (timeFrame: string): any => {
    const iconMap: {[key: string]: any} = {
      'Today': 'calendar-check-o',
      'Tomorrow': 'calendar-plus-o',
      'This Week': 'calendar-o',
      'This Weekend': 'calendar',
      'Next Week': 'calendar-times-o',
      'Upcoming': 'calendar'
    };
    
    return iconMap[timeFrame] || 'calendar';
  };

  // --- Prepare Data for react-native-clusterer (GeoJSON format) ---
  const geoJsonData = useMemo(() => {
    return filteredActivities.map(activity => ({
      type: 'Feature' as const, 
      properties: { 
        ...activity, 
        type: activity.type as ActivityType // Explicitly type the 'type' property
      }, 
      geometry: {
        type: 'Point' as const, 
        coordinates: [activity.longitude, activity.latitude] 
      }
    }));
  }, [filteredActivities]);

  // --- Memoized MapMarker with Inlined Logic ---
  interface MapMarkerProps {
    mapPoint: MapPoint;
    onClusterPress?: (clusterPoint: MapPoint) => void;
  }

  const MapMarker: React.FC<MapMarkerProps> = React.memo(
    ({ mapPoint, onClusterPress }) => {
    const currentColorScheme = useColorScheme() ?? 'light';
    const currentColors = Colors[currentColorScheme];
    const isCluster = isPointCluster(mapPoint);
    
    // Console log to verify component is working
    const id = isCluster ? mapPoint.properties.cluster_id : mapPoint.properties.id;
    console.log(`🎯 MapMarker rendering - Type: ${isCluster ? 'Cluster' : 'Activity'}, ID: ${id}`);
    
    if (isCluster) {
      // --- CLUSTER MARKER LOGIC INLINED ---
      const properties = mapPoint.properties as ClusterProperties;
      const coords = mapPoint.geometry.coordinates;
      const pointCount = properties.point_count;
      const clusterId = properties.cluster_id;
      
      // Define dynamic size based on point count
      const size = 30 + Math.min(pointCount, 99) * 0.3;

      const handleClusterPress = () => {
        if (onClusterPress) {
          onClusterPress(mapPoint);
        }
      };

      return (
        <Marker
          coordinate={{ latitude: coords[1], longitude: coords[0] }}
          onPress={handleClusterPress}
          tracksViewChanges={false}
        >
          <View style={[
            {
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 3.5,
              elevation: 5,
              backgroundColor: currentColors.background, 
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: currentColors.tint,
            }
          ]}>
            <Text style={[
              {
                fontWeight: 'bold',
                fontSize: 15,
                color: currentColors.tint
              }
            ]}>
              {pointCount}
            </Text>
          </View>
        </Marker>
      );
    } else {
      // --- ACTIVITY MARKER LOGIC INLINED ---
      const activity = mapPoint.properties as ActivityProperties;
      const coords = mapPoint.geometry.coordinates;
      
      // Self-contained helper functions
      const getMarkerColor = (activityType: string): string => {
        const markerColors = {
          light: {
            'Sports': '#FF5A5F',
            'Art & Culture': '#7B54A3',
            'Food & Drink': '#F1C400',
            'Outdoor': '#52B788',
            'Nightlife': '#6578F8',
            'Other': '#4285F4',
          },
          dark: {
            'Sports': '#FF6B70',
            'Art & Culture': '#9966CC',
            'Food & Drink': '#FFDD33',
            'Outdoor': '#63D99F',
            'Nightlife': '#768AFF',
            'Other': '#5C9CFF',
          }
        };
        return markerColors[currentColorScheme][activityType as ActivityType] || markerColors[currentColorScheme]['Other'];
      };
      
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
      
      const getTimeIcon = (timeFrame: string): any => {
        const iconMap: {[key: string]: any} = {
          'Today': 'calendar-check-o',
          'Tomorrow': 'calendar-plus-o',
          'This Week': 'calendar-o',
          'This Weekend': 'calendar',
          'Next Week': 'calendar-times-o',
          'Upcoming': 'calendar'
        };
        return iconMap[timeFrame] || 'calendar';
      };
      
      const formatDistance = (distance: number): string => {
        return distance === Number.MAX_SAFE_INTEGER ? 'Anywhere' : `< ${distance} mile${distance !== 1 ? 's' : ''}`;
      };
      
      const formatGroupSize = (max: number): string => {
        if (max === Number.MAX_SAFE_INTEGER) {
          return '21+ people';
        } else if (max <= 5) {
          return '1-5 people';
        } else if (max <= 10) {
          return '6-10 people';
        } else if (max <= 20) {
          return '11-20 people';
        }
        return '21+ people';
      };

      return (
        <Marker
          coordinate={{ latitude: coords[1], longitude: coords[0] }}
          tracksViewChanges={false}
          calloutOffset={{ x: -120, y: -10 }}
        >
          <View style={[
            {
              width: 36,
              height: 36,
              borderRadius: 18,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: '#FFFFFF',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
              backgroundColor: getMarkerColor(activity.type)
            }
          ]}>
            <FontAwesome
              name={getActivityIcon(activity.type)}
              size={18}
              color="#FFFFFF"
            />
          </View>
          <Callout
            style={[
              {
                width: 240,
                padding: 0,
                borderRadius: 12,
                borderWidth: 1,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
                backgroundColor: currentColors.background,
                borderColor: currentColorScheme === 'dark' ? currentColors.filterDivider : '#E0E0E0',
              }
            ]}
            tooltip
          >
            <View style={{ padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FontAwesome 
                  name={getActivityIcon(activity.type)} 
                  size={16} 
                  color={getMarkerColor(activity.type)}
                  style={{ marginRight: 6 }} 
                />
                <ThemedText type="subtitle" style={{ fontSize: 16, fontWeight: '600', marginLeft: 6 }}>
                  {activity.name}
                </ThemedText>
              </View>
              <ThemedText style={{ marginTop: 4 }}>
                {activity.description}
              </ThemedText>
              <View style={[
                {
                  marginTop: 8,
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: currentColorScheme === 'dark' ? currentColors.filterDivider : '#F1F5F9'
                }
              ]}>
                <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                   <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8, marginBottom: 6 }}>
                     <FontAwesome 
                       name={getTimeIcon(activity.timeFrame)} 
                       size={13} 
                       color={currentColors.filterSecondaryText}
                     />
                     <ThemedText style={[{ marginLeft: 8, fontSize: 12, color: currentColors.filterSecondaryText }]}>
                       {activity.timeFrame}
                     </ThemedText>
                   </View>
                   <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8, marginBottom: 6 }}>
                     <FontAwesome 
                       name="map-marker" 
                       size={13} 
                       color={currentColors.filterSecondaryText}
                     />
                     <ThemedText style={[{ marginLeft: 8, fontSize: 12, color: currentColors.filterSecondaryText }]}>
                       {formatDistance(activity.distance)}
                     </ThemedText>
                   </View>
                   <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8, marginBottom: 6 }}>
                     <FontAwesome 
                       name="users" 
                       size={13} 
                       color={currentColors.filterSecondaryText}
                     />
                     <ThemedText style={[{ marginLeft: 8, fontSize: 12, color: currentColors.filterSecondaryText }]}>
                       {formatGroupSize(activity.groupSizeMax)}
                     </ThemedText>
                   </View>
                 </View>
              </View>
              
              {/* Callout Arrow Pointer */}
              <View style={[
                {
                  width: 0,
                  height: 0,
                  borderLeftWidth: 10,
                  borderRightWidth: 10,
                  borderTopWidth: 0,
                  borderBottomWidth: 10,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  position: 'absolute',
                  top: -10,
                  alignSelf: 'center',
                  elevation: 3,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  borderBottomColor: currentColorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF'
                }
              ]} />
              <View style={[
                {
                  width: 0,
                  height: 0,
                  borderLeftWidth: 10,
                  borderRightWidth: 10,
                  borderTopWidth: 0,
                  borderBottomWidth: 10,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  position: 'absolute',
                  top: -9,
                  alignSelf: 'center',
                  borderBottomColor: currentColorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF'
                }
              ]} />
            </View>
          </Callout>
        </Marker>
      );
    }
  } , (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    const prevIsCluster = isPointCluster(prevProps.mapPoint);
    const nextIsCluster = isPointCluster(nextProps.mapPoint);
    
    // If cluster status changed, re-render
    if (prevIsCluster !== nextIsCluster) {
        console.log('🔄 MapMarker re-render: Cluster status changed', {
        prevIsCluster,
        nextIsCluster,
        prevId: prevIsCluster ? prevProps.mapPoint.properties.cluster_id : prevProps.mapPoint.properties.id,
        nextId: nextIsCluster ? nextProps.mapPoint.properties.cluster_id : nextProps.mapPoint.properties.id
      });
      return false;
    }
    
    if (prevIsCluster && nextIsCluster) {
      // Both are clusters - compare cluster properties
      const prevProps_cluster = prevProps.mapPoint.properties as ClusterProperties;
      const nextProps_cluster = nextProps.mapPoint.properties as ClusterProperties;
      
      const shouldReuse = (
        prevProps_cluster.cluster_id === nextProps_cluster.cluster_id &&
        prevProps_cluster.point_count === nextProps_cluster.point_count &&
        prevProps.mapPoint.geometry.coordinates[0] === nextProps.mapPoint.geometry.coordinates[0] &&
        prevProps.mapPoint.geometry.coordinates[1] === nextProps.mapPoint.geometry.coordinates[1]
      );
      
      if (!shouldReuse) {
        console.log('🔄 MapMarker re-render: Cluster properties changed', {
          clusterId: prevProps_cluster.cluster_id,
          prevCount: prevProps_cluster.point_count,
          nextCount: nextProps_cluster.point_count,
          prevCoords: prevProps.mapPoint.geometry.coordinates,
          nextCoords: nextProps.mapPoint.geometry.coordinates,
          idMatch: prevProps_cluster.cluster_id === nextProps_cluster.cluster_id,
          countMatch: prevProps_cluster.point_count === nextProps_cluster.point_count,
          coordsMatch: prevProps.mapPoint.geometry.coordinates[0] === nextProps.mapPoint.geometry.coordinates[0] &&
                      prevProps.mapPoint.geometry.coordinates[1] === nextProps.mapPoint.geometry.coordinates[1]
        });
      }
      
      if (shouldReuse) {
        console.log('✅ MapMarker REUSED:', prevProps_cluster.cluster_id);
      }
      
      return shouldReuse;
    } else if (!prevIsCluster && !nextIsCluster) {
      // Both are activities - compare activity properties
      const prevActivity = prevProps.mapPoint.properties as ActivityProperties;
      const nextActivity = nextProps.mapPoint.properties as ActivityProperties;
      
      const shouldReuse = (
        prevActivity.id === nextActivity.id &&
        prevActivity.name === nextActivity.name &&
        prevActivity.type === nextActivity.type &&
        prevProps.mapPoint.geometry.coordinates[0] === nextProps.mapPoint.geometry.coordinates[0] &&
        prevProps.mapPoint.geometry.coordinates[1] === nextProps.mapPoint.geometry.coordinates[1]
      );
      
      if (!shouldReuse) {
          console.log('🔄 MapMarker re-render: Activity properties changed', {
          activityId: prevActivity.id,
          prevName: prevActivity.name,
          nextName: nextActivity.name,
          prevType: prevActivity.type,
          nextType: nextActivity.type,
          prevCoords: prevProps.mapPoint.geometry.coordinates,
          nextCoords: nextProps.mapPoint.geometry.coordinates,
          idMatch: prevActivity.id === nextActivity.id,
          nameMatch: prevActivity.name === nextActivity.name,
          typeMatch: prevActivity.type === nextActivity.type,
          coordsMatch: prevProps.mapPoint.geometry.coordinates[0] === nextProps.mapPoint.geometry.coordinates[0] &&
                      prevProps.mapPoint.geometry.coordinates[1] === nextProps.mapPoint.geometry.coordinates[1]
        });
      }
      
      if (shouldReuse) {
        console.log('✅ MapMarker REUSED:', prevActivity.id);
      }
      
      return shouldReuse;
    }
    
    // Default to re-render if we can't determine
    console.log('🔄 MapMarker re-render: Cannot determine comparison type', {
      prevIsCluster,
      nextIsCluster,
      prevProps: prevProps.mapPoint.properties,
      nextProps: nextProps.mapPoint.properties
    });
    return false;
  });

  // --- Handlers ---
  const handleRegionChangeComplete = (newRegion: Region) => {
    console.log("handleRegionChangeComplete", newRegion);
    setRegion(newRegion);
  };

  const handleClusterPress = useCallback((clusterPoint: MapPoint) => { 
    const props = clusterPoint.properties as ClusterProperties;
    if (isPointCluster(clusterPoint) && props.getExpansionRegion) {
      const expansionRegion = props.getExpansionRegion();
      if (expansionRegion && mapRef.current) {
        mapRef.current.animateToRegion(expansionRegion, 300);
      }
    }
  }, []);

  // --- Render item function for Clusterer ---
  const renderItem = useCallback((point: MapPoint) => {
    const key = isPointCluster(point) 
      ? `cluster-${point.properties.cluster_id}` 
      : `activity-${point.properties.id}`;
      
    return (
      <MapMarker
        key={key}
        mapPoint={point}
        onClusterPress={handleClusterPress}
      />
    );
  }, [handleClusterPress]);

  // // --- Rest of component logic (useEffect for sheet position, directory view animation, etc.) ---
  // useEffect(() => {
  //   // Set bottom sheet to collapsed state with animation trigger
  //   // First set position to ensure the state is set immediately
  //   setBottomSheetPosition('collapsed');
    
  //   // Then delay slightly and set again to ensure animation is triggered properly
  //   const timer = setTimeout(() => {
  //     setBottomSheetPosition('collapsed');
  //   }, 300);
    
  //   return () => clearTimeout(timer);
  // }, []);

  const directoryAnimation = useRef(new Animated.Value(0)).current;

  // Add animation effect for directory view
  useEffect(() => {
    Animated.timing(directoryAnimation, {
      toValue: isDirectoryVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isDirectoryVisible]);

  // Function to calculate dynamic bottom padding based on bottom sheet position
  const getBottomPadding = () => {
    switch(bottomSheetPosition) {
      case 'fullyExpanded': 
        return 400; // More padding when sheet is fully expanded
      case 'halfExpanded':
        return 350; // More padding when sheet is half expanded
      case 'collapsed': 
        return 100; // Reduced padding when sheet is collapsed (was 180)
      default: 
        return 100;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? "light-content" : "dark-content"} />
      
      {/* Use STANDARD MapView */}
      <MapView 
        ref={mapRef} // Assign ref
        style={styles.map}
        initialRegion={region} // Use initialRegion for first load
        onRegionChangeComplete={handleRegionChangeComplete} // Update region state on change
        userInterfaceStyle={colorScheme}
        showsUserLocation={true} // Example standard prop
      >
        <Clusterer
          data={geoJsonData}
          region={region}
          mapDimensions={MAP_DIMENSIONS}
          renderItem={renderItem}
        />
      </MapView>

      {/* Directory View */}
      <Animated.View 
        style={[
          styles.directoryOverlay,
          {
            backgroundColor: colorScheme === 'dark' 
              ? 'rgba(26, 26, 30, 0.80)' // More transparent dark background
              : 'rgba(245, 245, 247, 0.80)', // More transparent light background
            transform: [{
              translateY: directoryAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [height, 0]
              })
            }],
            opacity: directoryAnimation,
            zIndex: 0,
          }
        ]}
      >
        <ScrollView 
          style={styles.directoryScroll}
          contentContainerStyle={[
            styles.directoryScrollContent,
            { paddingBottom: getBottomPadding() }
          ]}
          showsVerticalScrollIndicator={true}
        >
          {filteredActivities.map(activity => (
            <View 
              key={activity.id} 
              style={[
                styles.activityCard,
                { backgroundColor: colors.background }
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[
                  styles.activityIcon,
                  { backgroundColor: getMarkerColor(activity.type) }
                ]}>
                  <FontAwesome
                    name={getActivityIcon(activity.type)}
                    size={16}
                    color="#FFFFFF"
                  />
                </View>
                <ThemedText type="subtitle" style={styles.activityName}>
                  {activity.name}
                </ThemedText>
              </View>
              <ThemedText style={styles.activityDescription}>
                {activity.description}
              </ThemedText>
              <View style={styles.cardDetails}>
                <View style={styles.detailItem}>
                  <FontAwesome 
                    name={getTimeIcon(activity.timeFrame)} 
                    size={13} 
                    color={colors.filterSecondaryText}
                  />
                  <ThemedText style={[styles.itemText, { color: colors.filterSecondaryText }]}>
                    {activity.timeFrame}
                  </ThemedText>
                </View>
                <View style={styles.detailItem}>
                  <FontAwesome 
                    name="map-marker" 
                    size={13} 
                    color={colors.filterSecondaryText}
                  />
                  <ThemedText style={[styles.itemText, { color: colors.filterSecondaryText }]}>
                    {formatDistance(activity.distance)}
                  </ThemedText>
                </View>
                <View style={styles.detailItem}>
                  <FontAwesome 
                    name="users" 
                    size={13} 
                    color={colors.filterSecondaryText}
                  />
                  <ThemedText style={[styles.itemText, { color: colors.filterSecondaryText }]}>
                    {formatGroupSize(activity.groupSizeMax)}
                  </ThemedText>
                </View>
              </View>
            </View>
          ))}
          
          {/* Add a spacer View to ensure scrolling works to the very bottom */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>
      
      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        position={bottomSheetPosition}
        setPosition={setBottomSheetPosition}
        activeFilters={filters}
        setActiveFilters={setFiltersAndApply}
        onApplyFilters={applyFilters}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative', // Ensure proper stacking context
  },
  map: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  callout: {
    width: 240,
    padding: 0, // Remove default padding
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calloutContainer: {
    padding: 12,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 6,
  },
  calloutDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  detailsList: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 6,
  },
  itemText: {
    marginLeft: 8,
    fontSize: 12,
  },
  customMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calloutArrowBorder: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 0,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  calloutArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 0,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
    top: -9,
    alignSelf: 'center',
  },
  directoryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  directoryScroll: {
    flex: 1,
    marginTop: 5, // Minimized from 20px to almost no gap
  },
  directoryScrollContent: {
    paddingTop: 0, // Removed padding to minimize space
  },
  activityCard: {
    margin: 8, // Restored to original value
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityName: {
    fontSize: 18,
    fontWeight: '600',
  },
  activityDescription: {
    fontSize: 14,
    marginBottom: 12,
    color: '#666',
  },
  cardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  // --- Styles for Custom Cluster Marker ---
  clusterMarker: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2, // Keep border for contrast
    shadowColor: '#000', // Keep black shadow for visibility on map
    shadowOffset: {
      width: 0,
      height: 2, // Slightly larger offset
    },
    shadowOpacity: 0.3, // Slightly more opaque shadow
    shadowRadius: 3.5, // Slightly larger radius
    elevation: 5, // Increased elevation for Android
  },
  clusterText: {
    fontWeight: 'bold',
    fontSize: 15, // Slightly larger font size
  },
  // --- End Styles ---
});

export default MapScreen; 