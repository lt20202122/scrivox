import * as FileSystem from 'expo-file-system';
import * as Font from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FONT_DIR = (FileSystem.documentDirectory ?? '') + 'custom_fonts/';
const STORAGE_KEY = 'scrivox_custom_fonts';

export interface CustomFont {
  key: string;       // unique, e.g. "custom_MyHandwriting_1234567890"
  label: string;     // display name, e.g. "My Handwriting"
  path: string;      // absolute file path
  createdAt: number; // timestamp
}

export async function ensureFontDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(FONT_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(FONT_DIR, { intermediates: true });
  }
}

export async function loadPersistedFonts(): Promise<CustomFont[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const fonts: CustomFont[] = JSON.parse(raw) as CustomFont[];
    const valid: CustomFont[] = [];
    for (const f of fonts) {
      const info = await FileSystem.getInfoAsync(f.path);
      if (info.exists) {
        try {
          await Font.loadAsync({ [f.key]: f.path });
        } catch {
          // already loaded or failed – continue
        }
        valid.push(f);
      }
    }
    return valid;
  } catch {
    return [];
  }
}

export async function saveFont(label: string, sourceUri: string): Promise<CustomFont> {
  await ensureFontDir();
  const key = 'custom_' + label.replace(/\s+/g, '_') + '_' + Date.now();
  const dest = FONT_DIR + key + '.ttf';
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  await Font.loadAsync({ [key]: dest });
  const font: CustomFont = { key, label, path: dest, createdAt: Date.now() };
  const existing = await loadPersistedFonts();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, font]));
  return font;
}

export async function deleteFont(key: string): Promise<void> {
  const existing = await loadPersistedFonts();
  const font = existing.find((f) => f.key === key);
  if (font) {
    await FileSystem.deleteAsync(font.path, { idempotent: true });
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(existing.filter((f) => f.key !== key)),
    );
  }
}
