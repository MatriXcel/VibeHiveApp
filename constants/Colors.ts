/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    // Filter bottom sheet colors
    filterBackground: '#FFFFFF',
    filterText: '#0F172A',
    filterSecondaryText: '#64748B',
    filterDivider: '#F1F5F9',
    filterTagBackground: '#F1F5F9',
    filterTagText: '#334155',
    filterTagSelectedBackground: '#3B82F6',
    filterTagSelectedText: '#FFFFFF',
    filterHandle: '#E2E8F0',
    filterBackdrop: 'rgba(0, 0, 0, 0.4)',
    filterSliderTrack: '#E2E8F0',
    filterSliderFill: '#3B82F6',
    filterSliderThumb: '#FFFFFF',
    filterSliderThumbBorder: '#3B82F6',
    filterHighlight: '#3B82F6',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    // Filter bottom sheet colors - improved for better visual appeal
    filterBackground: '#222831',
    filterText: '#F8F9FA',
    filterSecondaryText: '#ADB5BD',
    filterDivider: '#393E46',
    filterTagBackground: '#393E46',
    filterTagText: '#E0E0E0',
    filterTagSelectedBackground: '#0A84FF',
    filterTagSelectedText: '#FFFFFF',
    filterHandle: '#666B74',
    filterBackdrop: 'rgba(0, 0, 0, 0.7)',
    filterSliderTrack: '#393E46',
    filterSliderFill: '#0A84FF',
    filterSliderThumb: '#FFFFFF',
    filterSliderThumbBorder: '#0A84FF',
    filterHighlight: '#0A84FF',
  },
};
