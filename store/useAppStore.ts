import { create } from 'zustand';
import { CustomFont } from '../services/fontStorage';

// FontKey is now a plain string to support dynamic custom font keys
export type FontKey = string;

export type AppMode = 'quick' | 'document' | 'notebook';
export type PaperStyle = 'blank' | 'lined' | 'dotgrid' | 'parchment';
export type InkColour = '#1a1a1a' | '#1a3a6b' | '#8b1a1a' | '#5c4a1e' | '#1a4a1a' | '#4a1a5c';

export interface AppState {
  selectedFont: FontKey;
  inkColour: InkColour;
  fontSize: number;
  appMode: AppMode;
  paperStyle: PaperStyle;
  transcribedText: string;
  partialText: string;
  isRecording: boolean;
  customFonts: CustomFont[];
  darkMode: boolean;

  setSelectedFont: (font: FontKey) => void;
  setInkColour: (colour: InkColour) => void;
  setFontSize: (size: number) => void;
  setAppMode: (mode: AppMode) => void;
  setPaperStyle: (style: PaperStyle) => void;
  setTranscribedText: (text: string) => void;
  setPartialText: (text: string) => void;
  setIsRecording: (recording: boolean) => void;
  appendText: (text: string) => void;
  clearText: () => void;
  setCustomFonts: (fonts: CustomFont[]) => void;
  addCustomFont: (font: CustomFont) => void;
  removeCustomFont: (key: string) => void;
  toggleDarkMode: () => void;
}

export const PRESET_FONT_KEYS: FontKey[] = [
  'Caveat-Regular',
  'Kalam-Regular',
  'HomemadeApple-Regular',
  'IndieFlower-Regular',
  'ShadowsIntoLight-Regular',
  'PatrickHand-Regular',
  'ArchitectsDaughter-Regular',
  'RockSalt-Regular',
];

export const FONT_LABELS: Record<string, string> = {
  'Caveat-Regular': 'Caveat',
  'Kalam-Regular': 'Kalam',
  'HomemadeApple-Regular': 'Homemade Apple',
  'IndieFlower-Regular': 'Indie Flower',
  'ShadowsIntoLight-Regular': 'Shadows Into Light',
  'PatrickHand-Regular': 'Patrick Hand',
  'ArchitectsDaughter-Regular': "Architect's Daughter",
  'RockSalt-Regular': 'Rock Salt',
};

export const INK_COLOURS: { label: string; value: InkColour }[] = [
  { label: 'Black', value: '#1a1a1a' },
  { label: 'Navy', value: '#1a3a6b' },
  { label: 'Red', value: '#8b1a1a' },
  { label: 'Sepia', value: '#5c4a1e' },
  { label: 'Green', value: '#1a4a1a' },
  { label: 'Purple', value: '#4a1a5c' },
];

export const useAppStore = create<AppState>((set) => ({
  selectedFont: 'Caveat-Regular',
  inkColour: '#1a1a1a',
  fontSize: 28,
  appMode: 'document',
  paperStyle: 'lined',
  transcribedText: '',
  partialText: '',
  isRecording: false,
  customFonts: [],
  darkMode: false,

  setSelectedFont: (font) => set({ selectedFont: font }),
  setInkColour: (colour) => set({ inkColour: colour }),
  setFontSize: (size) => set({ fontSize: size }),
  setAppMode: (mode) => set({ appMode: mode }),
  setPaperStyle: (style) => set({ paperStyle: style }),
  setTranscribedText: (text) => set({ transcribedText: text }),
  setPartialText: (text) => set({ partialText: text }),
  setIsRecording: (recording) => set({ isRecording: recording }),
  appendText: (text) =>
    set((state) => ({
      transcribedText: state.transcribedText
        ? `${state.transcribedText} ${text}`
        : text,
    })),
  clearText: () => set({ transcribedText: '', partialText: '' }),
  setCustomFonts: (fonts) => set({ customFonts: fonts }),
  addCustomFont: (font) =>
    set((state) => ({ customFonts: [...state.customFonts, font] })),
  removeCustomFont: (key) =>
    set((state) => ({ customFonts: state.customFonts.filter((f) => f.key !== key) })),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
}));
