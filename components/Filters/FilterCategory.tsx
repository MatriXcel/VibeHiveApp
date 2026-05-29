import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  UIManager,
  Dimensions 
} from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  LinearTransition,
  FadeIn,
  FadeOut,
  Easing
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '../../constants/Colors';



// Define the same fixed section header height as in FilterBottomSheet
const SECTION_HEADER_HEIGHT = 48;

interface FilterCategoryProps {
  title: string;
  options: string[];
  selectedOptions: string[];
  onSelectionChanged: (selected: string[]) => void;
  isMultiSelect: boolean;
  defaultExpanded?: boolean;
  onToggle?: (isExpanded: boolean) => void;
  activityHeaderRef?: React.RefObject<any>;
}

const FilterCategory: React.FC<FilterCategoryProps> = ({
  title,
  options,
  selectedOptions,
  onSelectionChanged,
  isMultiSelect,
  defaultExpanded = false,
  onToggle,
  activityHeaderRef
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const rotateAnim = useSharedValue(defaultExpanded ? 1 : 0);
  
  // Get the current color scheme for theming
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  // Helper function to get icon for activity type
  const getActivityIcon = (activityType: string): any => {
    // Only use icons for the activity type category
    if (title !== "Activity Type") return null;
    
    const iconMap: {[key: string]: any} = {
      'Sports': 'futbol-o',
      'Art & Culture': 'paint-brush',
      'Food & Drink': 'cutlery',
      'Outdoor': 'tree',
      'Nightlife': 'glass',
      'Other': 'star'
    };
    
    return iconMap[activityType] || null;
  };
  
  // Update isExpanded when defaultExpanded prop changes
  useEffect(() => {
    if (defaultExpanded !== isExpanded) {
      console.log(`${title}: Syncing internal expanded state with prop: ${defaultExpanded}`);
      setIsExpanded(defaultExpanded);
    }
  }, [defaultExpanded, title]);
  
  useEffect(() => {
    rotateAnim.value = withTiming(isExpanded ? 1 : 0, { 
      duration: 180, 
      easing: Easing.out(Easing.back(1.3)) 
    });
  }, [isExpanded]);
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    if (onToggle) {
      onToggle(!isExpanded);
    }
  };
  
  const handleOptionPress = (option: string) => {
    let newSelected: string[];
    
    if (isMultiSelect) {
      // If the option is already selected, remove it, otherwise add it
      if (selectedOptions.includes(option)) {
        newSelected = selectedOptions.filter(item => item !== option);
      } else {
        newSelected = [...selectedOptions, option];
      }
    } else {
      // For single select, either select the new option or deselect if it's already selected
      newSelected = selectedOptions.includes(option) ? [] : [option];
    }
    
    onSelectionChanged(newSelected);
  };
  
  const animatedChevronStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { 
          rotate: `${rotateAnim.value * 180}deg` 
        }
      ],
    };
  });
  
  return (
    <Animated.View style={styles.container} layout={LinearTransition.duration(180).easing(Easing.out(Easing.back(1.1)))}>
      <TouchableOpacity 
        ref={title === "Activity Type" ? activityHeaderRef : undefined}
        style={styles.header} 
        activeOpacity={0.7}
        onPress={toggleExpanded}
      >
        <Text style={[styles.title, { color: colors.filterText }]}>{title}</Text>
        <View style={styles.headerRight}>
          {selectedOptions.length > 0 && (
            <Text style={[styles.selectedCount, { color: colors.filterHighlight }]}>
              {selectedOptions.length} selected
            </Text>
          )}
          <Animated.View style={animatedChevronStyle}>
            <Ionicons name="chevron-down" size={20} color={colors.filterSecondaryText} />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <Animated.View 
          style={styles.optionsContainer}
          entering={FadeIn.duration(150).easing(Easing.out(Easing.back(1.1)))}
          exiting={FadeOut.duration(100).easing(Easing.in(Easing.back(1.2)))}
          layout={LinearTransition.duration(180).easing(Easing.out(Easing.back(1.1)))}
        >
          <View style={styles.tagContainer}>
            {options.map((option) => {
              const isSelected = selectedOptions.includes(option);
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.tag,
                    { backgroundColor: colors.filterTagBackground },
                    isSelected && { backgroundColor: colors.filterTagSelectedBackground }
                  ]}
                  onPress={() => handleOptionPress(option)}
                  activeOpacity={0.7}
                >
                  {title === "Activity Type" && getActivityIcon(option) && (
                    <FontAwesome
                      name={getActivityIcon(option)}
                      size={14}
                      color={isSelected ? colors.filterTagSelectedText : colors.filterTagText}
                      style={styles.tagIcon}
                    />
                  )}
                  <Text 
                    style={[
                      styles.tagText,
                      { color: colors.filterTagText },
                      isSelected && { color: colors.filterTagSelectedText }
                    ]}
                  >
                    {option}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkIndicator}>
                      <Ionicons name="checkmark" size={12} color={colors.filterTagSelectedText} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0, // Reduced to minimize inconsistent spacing
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: SECTION_HEADER_HEIGHT, // Fixed height
    paddingVertical: 0, // Remove vertical padding to use fixed height
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  optionsContainer: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  checkIndicator: {
    marginLeft: 4,
  },
  tagIcon: {
    marginRight: 8,
  }
});

export default FilterCategory; 