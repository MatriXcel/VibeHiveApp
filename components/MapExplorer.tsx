import React, { useState } from 'react';
import { StyleSheet, View, Dimensions, TouchableOpacity, TextInput } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

const { width } = Dimensions.get('window');

type Location = {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
};

type MapExplorerProps = {
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  locations?: Location[];
  onLocationSelect?: (location: Location) => void;
};

const DEFAULT_REGION = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const DEFAULT_LOCATIONS: Location[] = [
  {
    id: '1',
    name: 'Golden Gate Bridge',
    description: 'Iconic suspension bridge in San Francisco',
    latitude: 37.8199,
    longitude: -122.4783,
  },
  {
    id: '2',
    name: 'Fisherman\'s Wharf',
    description: 'Popular waterfront area with shops and restaurants',
    latitude: 37.8080,
    longitude: -122.4177,
  },
  {
    id: '3',
    name: 'Alcatraz Island',
    description: 'Historic federal prison on an island',
    latitude: 37.8270,
    longitude: -122.4230,
  },
];

export default function MapExplorer({
  initialRegion = DEFAULT_REGION,
  locations = DEFAULT_LOCATIONS,
  onLocationSelect,
}: MapExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };

  const filteredLocations = searchQuery
    ? locations.filter(location => 
        location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : locations;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={[
          styles.searchBar, 
          { backgroundColor: isDark ? '#2C2C2E' : '#EEEEEF' }
        ]}>
          <Ionicons 
            name="search" 
            size={20} 
            color={isDark ? '#8E8E93' : '#3C3C3E'} 
            style={styles.searchIcon} 
          />
          <TextInput
            style={[
              styles.searchInput,
              { color: isDark ? '#FFFFFF' : '#000000' }
            ]}
            placeholder="Search locations..."
            placeholderTextColor={isDark ? '#8E8E93' : '#3C3C3E'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons 
                name="close-circle" 
                size={20} 
                color={isDark ? '#8E8E93' : '#3C3C3E'} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {filteredLocations.map((location) => (
          <Marker
            key={location.id}
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title={location.name}
            description={location.description}
            onPress={() => handleLocationSelect(location)}
            pinColor={selectedLocation?.id === location.id ? '#FF5A5F' : '#4285F4'}
          />
        ))}
      </MapView>
      
      {selectedLocation && (
        <ThemedView style={styles.locationInfo}>
          <ThemedText type="subtitle">{selectedLocation.name}</ThemedText>
          <ThemedText>{selectedLocation.description}</ThemedText>
          <TouchableOpacity 
            style={styles.directionsButton}
            onPress={() => {
              // Handle directions here
              console.log(`Get directions to ${selectedLocation.name}`);
            }}
          >
            <ThemedText style={styles.directionsButtonText}>Get Directions</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    zIndex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 40,
    borderRadius: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  locationInfo: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  directionsButton: {
    backgroundColor: '#4285F4',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  directionsButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 