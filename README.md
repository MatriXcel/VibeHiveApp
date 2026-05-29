# VibeHive (Experimental)

Mobile prototype for the VibeHive app: Discover nearby social activities on an interactive map and filter them by your preferences.

[Watch the demo](https://youtube.com/shorts/sD7tf-mR7pM?feature=share)

## Features

- **Interactive map** — Google Maps via `react-native-maps`
- **Marker clustering** — keeps the map readable at city/region zoom levels
- **Activity filters** — bottom sheet (type, time, distance, group size, and more)
- **Map / list view** — toggle from the header to switch between map and directory layouts

## Stack

- Expo SDK 52 · Expo Router · TypeScript
- React Native 0.76 (New Architecture)
- `expo-dev-client` (required for native maps — Expo Go is not supported)
- `@gorhom/bottom-sheet`, Reanimated, Gesture Handler

## Prerequisites

- Node.js (LTS)
- Xcode + iOS Simulator (or a physical iPhone)
- CocoaPods
- Google Maps API key (iOS; configure in `app.json` or via your preferred secrets approach)

## Notes
- Uses sample/mock activity data for prototyping.

## Setup

```bash
npm install
cd ios && pod install && cd ..
npx expo run:ios


