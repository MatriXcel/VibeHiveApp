import React, { useState } from 'react';
import { Stack } from 'expo-router';
import MapScreen from '../screens/MapScreen';
import { TouchableOpacity, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useColorScheme } from '../hooks/useColorScheme';
import { Colors } from '../constants/Colors';

export default function Index() {
  const [isDirectoryVisible, setIsDirectoryVisible] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'VibeHive Map',
          headerShown: true,
          contentStyle: {
            paddingTop: 0, // Remove padding between header and content
          },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setIsDirectoryVisible(!isDirectoryVisible)}
              style={{ 
                marginRight: 8,
                width: 32,
                height: 32,
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View style={{
                backgroundColor: colorScheme === 'dark' ? 'rgba(60,60,60,0.5)' : 'rgba(240,240,240,0.8)',
                width: 32,
                height: 32,
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <FontAwesome5 
                  name={isDirectoryVisible ? "map" : "list"} 
                  size={16}
                  color={colors.text}
                  solid
                />
              </View>
            </TouchableOpacity>
          ),
        }} 
      />
      <MapScreen isDirectoryVisible={isDirectoryVisible} />
    </>
  );
} 