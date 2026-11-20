/**
 * Metro substitutes this for `expo-av` when EXPO_NO_ADMOB=1 / Expo Go path,
 * so accidental imports never touch ExponentAV.
 */
const asyncDenied = async () => ({
  granted: false,
  status: 'denied',
  canAskAgain: false,
  expires: 'never',
});

class Recording {
  async prepareToRecordAsync() {
    throw new Error('expo-av stub: ExponentAV not available');
  }
  async startAsync() {
    throw new Error('expo-av stub: ExponentAV not available');
  }
  async stopAndUnloadAsync() {}
  setProgressUpdateInterval() {}
  setOnRecordingStatusUpdate() {}
}

const Audio = {
  Recording,
  RecordingOptionsPresets: {
    LOW_QUALITY: { isMeteringEnabled: true },
    HIGH_QUALITY: { isMeteringEnabled: true },
  },
  getPermissionsAsync: asyncDenied,
  requestPermissionsAsync: asyncDenied,
  setAudioModeAsync: async () => {},
  setIsEnabledAsync: async () => {},
};

module.exports = {
  __esModule: true,
  Audio,
  Video: () => null,
  InterruptionModeIOS: { MixWithOthers: 0, DoNotMix: 1, DuckOthers: 2 },
  InterruptionModeAndroid: { DoNotMix: 1, DuckOthers: 2 },
};
