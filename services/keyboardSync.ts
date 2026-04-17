import { NativeModules, Platform } from 'react-native';

/**
 * Sync font/colour/size settings to the native keyboard extension.
 * iOS: writes to App Group UserDefaults via AppGroupSettings native module.
 * Android: writes to SharedPreferences via SharedPrefsSettings native module.
 */
export async function syncSettingsToKeyboard(
  fontPath: string | null,
  inkColour: string,
  fontSize: number,
): Promise<void> {
  const payload = {
    selectedFontPath: fontPath ?? '',
    inkColour,
    fontSize: String(fontSize),
  };

  try {
    if (Platform.OS === 'ios') {
      NativeModules.AppGroupSettings?.setValues(payload);
    } else if (Platform.OS === 'android') {
      NativeModules.SharedPrefsSettings?.setValues(payload);
    }
  } catch {
    // Native modules may not be available in Expo Go — ignore silently
  }
}
