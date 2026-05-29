import 'dotenv/config';

export default {
  expo: {
    name: "VibeHibeIosProject",
    slug: "VibeHibeIosProject",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.vibehive.iosproject",
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
    plugins: ["expo-router", "expo-build-properties"],
    extra: {
      eas: {
        projectId: "d3623cdb-add1-4aeb-a557-a2724382862d",
      },
    },
    android: {
      package: "com.vibehive.iosproject",
      permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    },
    newArchEnabled: true,
  },
};
