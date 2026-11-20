/**
 * Metro stub for @reactvision/react-viro when EXPO_NO_ADMOB=1 / Expo Go.
 * Real AR requires `npx expo run:android`.
 */
const React = require('react');
const { View, Text } = require('react-native');

function Stub() {
  return React.createElement(
    View,
    null,
    React.createElement(Text, null, 'Viro stub (Expo Go)'),
  );
}

module.exports = {
  __esModule: true,
  ViroARSceneNavigator: Stub,
  ViroARScene: Stub,
  ViroAmbientLight: Stub,
  ViroNode: Stub,
  ViroSphere: Stub,
  ViroPolyline: Stub,
  ViroText: Stub,
  ViroMaterials: { createMaterials: () => undefined },
  ViroTrackingStateConstants: { TRACKING_UNAVAILABLE: 1, TRACKING_NORMAL: 3 },
  isARSupportedOnDevice: async () => ({ isARSupported: false }),
};
