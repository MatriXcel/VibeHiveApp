# Map Filtering and Clustering Specification

## Overview
This specification outlines the filtering and clustering mechanisms for activities displayed on the map in the VibeHive mobile application. These features are essential for providing users with a clean, intuitive, and information-rich experience when browsing available activities.

## User Experience Goals
- Allow users to easily filter activities based on preferences
- Prevent map clutter by clustering activities in densely populated areas
- Provide progressive information disclosure as users zoom in
- Maintain performance and responsiveness while handling many activity markers

## Filtering System

### Bottom Sheet Filter Interface

#### Components
1. **Filter Bottom Sheet**
   - Snap points: Collapsed, Half-expanded, Fully-expanded
   - Pull handle for intuitive dragging
   - Backdrop overlay for focus when expanded
   - Smooth animation for state transitions

2. **Filter Categories**
   - Each category is collapsible (accordion style)
   - Visual indicators show active filters within collapsed categories

3. **Filter Options**
   - Activity Type (multi-select)
   - Time Frame (single-select)
   - Distance (single-select)
   - Group Size (single-select)
   - Additional Options (multi-select)

4. **Action Buttons**
   - "Apply" button with clear visual prominence
   - "Clear All" button for resetting filters
   - Haptic feedback on filter application

#### Behavior
- The filter sheet persists in a minimized state when filters are applied
- Filter counts display on the minimized sheet
- Filters immediately apply when selected in certain categories
- The sheet auto-closes on "Apply" button tap
- Clear visual indicators for active filters

### Filter Floating Button
- Positioned in the bottom-right corner of the map screen
- Displays count of active filters
- Opens the filter bottom sheet when tapped
- Subtle animation for better discoverability
- Haptic feedback on tap

## Map Clustering System

### Zoom Visibility Thresholds

#### Zoomed Out (Level 1-10: Country/City View)
- Activities clustered into groups
- Clusters display aggregate counts (e.g., "25 activities")
- Color-coding based on predominant activity type in cluster
- Subtle animation when clusters are tapped
- Performance optimized for handling large numbers of markers

#### Mid-Level Zoom (Level 11-14: Neighborhood View)
- Clusters begin to break apart into individual markers
- Markers display category-specific icons
- No tooltips at this level to prevent visual clutter
- Markers sized appropriately for this zoom level
- Smooth transitions as clusters split

#### Zoomed In (Level 15+: Street View)
- Individual activity markers fully visible
- Tooltips appear on hover/tap with essential information:
  - Activity Name
  - Time
  - Distance from user
  - Participant count
- Markers can be tapped to open detailed activity cards
- Optimal spacing between markers to prevent overlap

### Dynamic Marker Scaling
- Markers scale proportionally with zoom level
- Minimum and maximum size constraints for readability
- Smooth scaling animations during zoom transitions
- Ensures tap targets remain accessible at all zoom levels

### Interactive Labels
- Appear only at higher zoom levels (15+)
- Contain concise activity information (e.g., "Sunset Hike, 6 PM")
- Utilize smart positioning to avoid overlapping
- Fade in/out smoothly with zoom level changes
- Legible typography across various background colors

## Technical Details

### Map Clustering Algorithm
- Distance-based clustering algorithm
- Adjustable cluster radius based on zoom level
- Optimized for mobile performance (minimal re-rendering)
- Threshold parameters:
  - `clusterRadiusPixels`: 40-80px (adjustable based on device size)
  - `minimumClusterSize`: 2 activities
  - `maxZoomLevel`: 15 (no clustering above this zoom)

### Marker Rendering
- Custom marker components for activities and clusters
- Hardware-accelerated animations
- Efficient re-rendering strategy:
  - Viewport culling (only render visible markers)
  - Marker pooling for memory efficiency
  - Level-of-detail control based on zoom

### Data Loading Strategy
- Progressive loading based on viewport and zoom
- Initial fetch limited to current viewport + buffer
- Additional data loaded as user pans/zooms
- Cache recently viewed areas for quick re-navigation
- Background refresh for real-time updates

## Progressive Information Reveal Details

### Level 1: Cluster View (Zoom 1-10)
- Information displayed:
  - Total activity count
  - Color indicating predominant activity type
  - Visual differentiation for clusters with mixed activity types

### Level 2: Icon View (Zoom 11-14)
- Information displayed:
  - Activity icon (e.g., 🎥, 🥾, 🎵)
  - Color indicating activity type
  - Size indicating popularity (optional)

### Level 3: Tooltip View (Zoom 15+)
- Information displayed in tooltip:
  ```
  🥾 Sunset Hike
  📅 Today, 6 PM | 📍 0.5 mi | 👥 3/8
  ```
- Additional information available on marker tap:
  - Full activity description
  - Host information
  - Join/leave functionality
  - Comments/questions
  - Share options

## Accessibility Considerations
- Clear visual hierarchy for color-blind users
- Screen reader support for markers and clusters
- Alternative navigation methods beyond the map
- Sufficient touch targets (minimum 44×44 points)
- Respect reduced motion preferences for animations

## Performance Targets
- Smooth 60fps scrolling and zooming
- Cluster operations complete in <50ms
- Filter application in <100ms
- Maximum memory usage: 200MB
- Battery impact: <5% per hour of continuous use 