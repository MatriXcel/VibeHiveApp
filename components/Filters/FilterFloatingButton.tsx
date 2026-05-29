import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet,
  Animated,
  Easing,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface FilterFloatingButtonProps {
  activeFilterCount: number;
  onPress: () => void;
}

const FilterFloatingButton: React.FC<FilterFloatingButtonProps> = ({
  activeFilterCount,
  onPress
}) => {
  const scale = React.useRef(new Animated.Value(1)).current;
  
  const handlePress = () => {
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Animate button press
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease)
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease)
      })
    ]).start();
    
    onPress();
  };
  
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Ionicons name="filter" size={20} color="white" />
        <Text style={styles.text}>Filter</Text>
        {activeFilterCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  badge: {
    backgroundColor: 'white',
    height: 20,
    minWidth: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  badgeText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  }
});

export default FilterFloatingButton; 