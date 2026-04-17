# Scrivox — Implementation Plan

> Internal reference only. Not for distribution.

---

## 1. Feature Inventory

### 1.1 Core (Phase 1 — MVP)
- **Live dictation → handwriting render**: Microphone input → STT partial results → text rendered in handwriting font, word-by-word with ink-draw animation
- **Preset font library**: Ship 8–10 curated handwriting TTFs (Caveat, Kalam, Homemade Apple, Indie Flower, Shadows Into Light, Rock Salt, Patrick Hand, Architects Daughter). All loaded via `expo-font`.
- **Personal font generation**: User fills glyph template → photos it → sent to Calligraphr API → TTF returned and stored locally via `expo-file-system` → registered at runtime with `expo-font`.

### 1.2 Export Modes (Phase 2)
- **Export as Image (PNG/JPG)**: Capture the handwriting canvas with `react-native-view-shot`. Options: transparent background, parchment, lined, plain white.
- **Export as PDF**: Multi-page support. Use `react-native-html-to-pdf` — render the canvas as styled HTML, convert to PDF. Pages auto-flow based on text length. Ideal for GoodNotes paste-in (import PDF → looks like real handwriting on paper).
- **Copy to clipboard**: Two sub-modes — (a) copy plain text, (b) copy as PNG image via `expo-clipboard` (image copy).
- **Share sheet**: `expo-sharing` triggers native share sheet with image or PDF file.

### 1.3 App Modes / Views (Phase 2)
- **Quick mode**: Compact, keyboard-height panel. Single burst of speech → short text → instant copy/share. Designed for messaging.
- **Document mode**: Full-screen canvas, scrollable, multi-paragraph. Lined or blank paper. For longer pieces — essays, notes, letters. This is the GoodNotes target mode.
- **Notebook page mode**: Fixed A4/Letter-size virtual page. Text flows exactly like a handwritten page. Export as PDF preserves page dimensions — paste directly into GoodNotes or Notability as an image/PDF and it looks indistinguishable from real handwriting.

### 1.4 Handwriting-to-Text (OCR) — Phase 3
User photographs handwritten text (theirs or anyone's) and the app transcribes it.
- **On-device**: Google ML Kit Text Recognition via `@react-native-ml-kit/text-recognition` — free, offline, fast, supports Latin + CJK scripts.
- **Cloud fallback**: Google Cloud Vision API (REST) for difficult/stylised handwriting.
- **Flow**: `expo-camera` or `expo-image-picker` → capture/select image → pass to ML Kit → display transcribed text → optionally re-render in chosen handwriting font → export.
- **Use case**: Digitise old handwritten notes, convert a friend's handwriting, then re-output in your own font.

### 1.5 Keyboard Extension — Phase 4
See separate section below (§4). Most complex part; requires native code.

### 1.6 Polish / UX (Phase 4)
- Ink colour picker (black, blue, red, sepia, green, custom hex)
- Pen style toggle (regular, slightly wobbly/jitter for more organic look — apply small random transforms per character via Reanimated)
- Paper texture selector (blank white, cream parchment, ruled, squared grid, dot grid)
- Font size slider + line height slider
- Dark mode (chalkboard: dark bg, light ink)
- Haptic feedback on dictation start/stop (`expo-haptics`)
- Undo last word / clear all

---

## 2. Tech Stack (Full)

| Layer | Library | Notes |
|---|---|---|
| Framework | Expo SDK 54, React Native | Managed → Bare after Phase 3 |
| Language | TypeScript | Strict mode |
| Navigation | Expo Router v3 (file-based) | Tabs + modal sheets |
| Font loading | `expo-font` | Static + dynamic (runtime load) |
| STT on-device | `@react-native-voice/voice` | iOS SFSpeechRecognizer, Android SpeechRecognizer |
| STT cloud | OpenAI Whisper via REST | Opt-in, privacy disclosure required |
| Camera/picker | `expo-camera`, `expo-image-picker` | For font template + OCR input |
| OCR | `@react-native-ml-kit/text-recognition` | On-device, free |
| Canvas capture | `react-native-view-shot` | PNG/JPG export |
| PDF generation | `react-native-html-to-pdf` | HTML→PDF, multi-page |
| Clipboard | `expo-clipboard` | Text + image |
| File system | `expo-file-system` | Store downloaded fonts, exported files |
| Sharing | `expo-sharing`, `expo-media-library` | Share sheet + save to camera roll |
| Animation | `react-native-reanimated` v3 | Ink draw-on, character jitter |
| State | Zustand | Global: selected font, ink colour, mode |
| Styling | NativeWind 4 (Tailwind) | Utility classes |
| Font gen API | Calligraphr REST API | Personal font pipeline |
| Config plugin | Custom `app.plugin.js` | Keyboard extension native integration |

---

## 3. Screen Architecture

```
app/
  (tabs)/
    index.tsx           — Home: mode selector + active canvas
    fonts.tsx           — Font gallery (presets + personal)
    ocr.tsx             — Handwriting-to-text (Phase 3)
    settings.tsx        — Global preferences
  dictation/
    quick.tsx           — Quick mode overlay
    document.tsx        — Document/notebook mode
    [id].tsx            — Saved document viewer
  font-workshop/
    index.tsx           — Personal font onboarding
    template.tsx        — Glyph sheet display + print
    capture.tsx         — Photo capture + upload
    processing.tsx      — Progress + font download
  export/
    preview.tsx         — Export preview (image/PDF selector)
```

---

## 4. Keyboard Extension — Technical Plan

### Why it's hard
OS prevents font injection into host app text fields. The keyboard can only insert plain Unicode text or paste an image via the system pasteboard. A handwriting *font* in someone else's app is impossible without jailbreak/root.

### iOS Implementation
- New Xcode target: `ScrivoxKeyboard` (type: `Custom Keyboard Extension`)
- `KeyboardViewController: UIInputViewController` in Swift
- UI layout:
  - Top strip: live handwriting preview (renders PNG of text as it's transcribed)
  - Middle: large mic button + waveform visualiser
  - Bottom: insert mode toggle (plain text / image) + recent phrases
- Shared data with main app: `App Group` (`group.com.scrivox`) — stores font path, ink colour, recent transcriptions via `UserDefaults(suiteName:)`
- On insert (image mode): render text to `UIImage` using `CoreText` with loaded font → write PNG to pasteboard → call `textDocumentProxy.insertText("")` + programmatic paste trigger
- On insert (text mode): `textDocumentProxy.insertText(transcribedString)`
- Requires `NSExtensionAttributes` → `RequestsOpenAccess: YES` for network STT

### Android Implementation
- New module: `app/src/main/java/com/scrivox/keyboard/ScrivoxIME.kt`
- Extends `InputMethodService`
- Custom view inflated from `keyboard_layout.xml`: mic button, preview strip, insert button
- Preview strip: render handwriting as `Bitmap` using loaded `Typeface` from stored TTF path (accessible via `SharedPreferences` shared with main app)
- Insert: `currentInputConnection.commitText(text, 1)` (plain text) or `currentInputConnection.commitContent(image, ...)` via `InputConnectionCompat.commitContent` for image insert (Android 7.1+, supported in Gboard-compatible apps like Messages, Gmail)
- Register in `AndroidManifest.xml` with `android.service.inputmethod.InputMethodService` intent filter

### Expo Integration Path
1. Run `npx expo prebuild` → generates `ios/` and `android/` directories
2. Manually add keyboard extension targets to both
3. Write `app.plugin.js` Expo Config Plugin that automates steps 1–2 on every `prebuild` run
4. Use EAS Build for cloud compilation (avoids needing Xcode locally on PC)

### Realistic Timeline
- iOS keyboard: ~3–4 days focused Swift work
- Android IME: ~2–3 days focused Kotlin work
- Config plugin + EAS integration: ~1 day
- Testing across target apps: ~2 days

---

## 5. GoodNotes / Notability Use Case

**User goal**: Produce text that looks like natural handwriting, paste into GoodNotes for homework/notes, indistinguishable from real handwriting.

**Best workflow**:
1. Open Scrivox in Document mode (A4 page, lined paper background, ruled spacing matching GoodNotes default)
2. Dictate or type the text
3. Choose font that matches their actual handwriting style (or use personal generated font)
4. Export → PDF (preserves exact page size and line positioning)
5. In GoodNotes: Insert → PDF or Image → the page appears as a background layer that looks exactly like handwritten paper

**Alternative (quicker)**:
1. Export as PNG (transparent background)
2. Paste into GoodNotes canvas as image element → scale to fit

**Key detail**: For this to work convincingly, the font needs slight imperfections — no two identical letters should look exactly the same. Calligraphr supports this via "character variants" (multiple glyphs per character, randomly selected). This should be the default for personal fonts.

---

## 6. Handwriting-to-Text — Technical Detail

### Flow
```
User taps "Convert" tab
→ expo-image-picker (or expo-camera live capture)
→ Selected image passed to ML Kit Text Recognition
→ TextRecognitionResult.blocks[] → joined string
→ Displayed in editable TextInput
→ Option: "Re-render in my font" → passes to dictation canvas
→ Export as usual
```

### ML Kit Setup
```bash
npx expo install @react-native-ml-kit/text-recognition
# Requires bare workflow (expo prebuild already needed by Phase 3)
```

```typescript
import TextRecognition from '@react-native-ml-kit/text-recognition';

const result = await TextRecognition.recognize(imageUri);
const fullText = result.blocks.map(b => b.text).join('\n');
```

### Accuracy notes
- ML Kit handles most printed handwriting well
- Cursive is harder — may need cloud Vision API as fallback
- Add confidence threshold: if block confidence < 0.7, flag word for review
- UI: show recognised text with uncertain words highlighted in orange, tap to correct

---

## 7. Phase Roadmap

| Phase | Scope | Key deliverable |
|---|---|---|
| **0** — Done | Blank Expo scaffold, GitHub repo | Runnable skeleton |
| **1** | STT + preset fonts + live render + basic UI | Dictation works in Scrivox app |
| **2** | Export (image + PDF), modes (quick/document/notebook), share sheet | GoodNotes paste workflow works |
| **3** | Personal font generation (Calligraphr pipeline) + OCR (ML Kit) + `expo prebuild` | Fully personalised experience |
| **4** | Keyboard extension (iOS + Android) + polish + ink/paper customisation | Available in every app |
| **5** | EAS Submit, App Store + Play Store, TestFlight beta | Public |

---

## 8. Open Risks

- **Calligraphr API**: Not a public API — may need to reverse-engineer web flow or find alternative (FontForge + custom server). Fallback: ship 20 high-quality preset fonts and skip personal generation for v1.
- **`@react-native-voice/voice` maintenance**: Library has had periods of low maintenance. Fallback: use `expo-av` + Whisper on-device (whisper.rn).
- **App Store keyboard extension approval**: Apple requires `RequestsOpenAccess` justification. Network STT requires it — must have clear privacy policy.
- **GoodNotes font legibility**: If personal font generation quality is low, it won't fool anyone. Quality bar is high for the homework use case. May need to post-process TTF (add variants, smooth curves) before considering it "done".
- **`react-native-html-to-pdf` on Android**: Known issues with custom fonts in WebView renderer. May need to use `react-native-pdf-lib` or a canvas→image→PDF approach instead.

---

## Implementation Notes

### What was built (Phases 1 & 2)

**Phase 1 — Core dictation + font rendering**
- Expo Router v4 set up with file-based tabs navigation (`(tabs)/index`, `(tabs)/fonts`, `(tabs)/settings`) and modal/stack screens (`dictation/document`, `dictation/quick`).
- 8 Google Fonts TTFs bundled: Caveat, Kalam, Homemade Apple, Indie Flower, Shadows Into Light, Patrick Hand, Architects Daughter, Rock Salt — all loaded via `expo-font` in the root layout.
- Zustand store manages: selected font, ink colour (6 presets), font size, app mode, paper style, transcription state.
- `DictationCanvas` component: STT via `@react-native-voice/voice` (property-based callback API), word-by-word `FadeIn` animation via `react-native-reanimated`, partial-result text shown at reduced opacity, parchment background, lined/dot-grid paper overlays.
- **Home screen**: mode selector cards (Quick / Document / Notebook) → navigates to correct screen.
- **Font gallery**: FlatList grid with live font preview, tap to select.
- **Settings**: ink colour swatches, font size +/− buttons (no native slider dependency), paper style grid.

**Phase 2 — Export modes + app modes**
- `export/preview.tsx`: ViewShot capture for PNG save/share/clipboard; PDF via `react-native-html-to-pdf` `generatePDF` (new v1.3 API); base64 clipboard copy via `captureRef`; share sheet via `expo-sharing`.
- **Notebook mode**: A4 canvas (595×842pt scaled to screen), lined paper with 32pt GoodNotes-default spacing; scrolling disabled (fixed page).
- **Document mode**: full-screen scrollable canvas; auto-scrolls to latest text.
- **Quick mode**: modal screen with compact canvas + one-tap copy/share actions.
- `dicatation/quick.tsx` also includes inline share-as-image via ViewShot.

### Deviations from plan
- **Font size slider**: replaced with +/− buttons to avoid `@react-native-community/slider` (requires native module not in Expo Go). Functionally equivalent.
- **`react-native-html-to-pdf`**: new v1.3 uses named export `generatePDF` rather than the old class-based `RNHTMLtoPDF.convert()`. PDF export wrapped in try/catch — shows user-friendly error if called from Expo Go (native module unavailable until EAS build).
- **`expo-file-system` v55**: new class-based API; switched to `captureRef(..., { result: 'base64' })` from ViewShot to get base64 for clipboard without touching the file system.
- **`@react-native-voice/voice`**: wrapped in `try/catch` require — degrades gracefully in JS-only environments (Expo Web, Jest). STT callbacks wired via property setters (`Voice.onSpeechResults = fn`).
- **NativeWind**: not installed — opted for StyleSheet throughout to keep bundle lean and avoid potential Expo Go compatibility issues.

### What Phase 3 needs to know
- All native-module-dependent features (`@react-native-voice/voice`, `react-native-html-to-pdf`, `react-native-view-shot`) need a development build (EAS Build) to work on device; they are wrapped defensively for Expo Go testing.
- Run `npx expo prebuild` before Phase 3 to add `ios/` and `android/` directories.
- `@react-native-ml-kit/text-recognition` (Phase 3 OCR) requires bare workflow — install after prebuild.
- Personal font pipeline (Calligraphr) should be treated as optional; investigate public API availability before starting.
- Bundle identifier is `com.scrivox.app`; add mic + speech-recognition `InfoPlist` entries in `app.json` before building (already present in current `app.json`).
- Zustand store may need persistence (`zustand/middleware` `persist` with `expo-secure-store`) for saved font preferences.
