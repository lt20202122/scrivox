# Scrivox — App Store & Play Store Metadata

## App Store (iOS)

- **Name:** Scrivox
- **Subtitle:** Your voice, your handwriting
- **Category:** Productivity
- **Secondary Category:** Utilities
- **Keywords:** handwriting font, voice dictation, TTS, speech to text, keyboard, GoodNotes, custom font
- **Support URL:** https://github.com/lt20202122/scrivox
- **Age Rating:** 4+
- **Privacy:**
  - Microphone (dictation)
  - Speech Recognition (transcription)
  - No data leaves device by default

### Description

Scrivox turns your voice into handwriting. Speak naturally and watch your words appear in a
beautiful handwriting font — your own, or one of 8 curated styles. Export as image or A4 PDF,
perfect for GoodNotes, Notability, messages, and social media.

**Features:**
- 8 built-in handwriting fonts + import any .ttf font
- Real-time voice-to-handwriting rendering
- Quick, Document, and A4 Notebook modes
- Export as image, PDF, or share directly
- Custom keyboard extension — dictate in any app
- OCR: scan handwritten notes and re-render in your font
- Dark mode (chalkboard theme)
- Works 100% on-device — no account, no cloud

---

## Play Store (Android)

- **Category:** Productivity
- **Content Rating:** Everyone
- **Short Description (80 chars):** Speak and see your words in handwriting. Export to PDF or image.
- **Tags:** dictation, handwriting, font, keyboard, productivity

### Full Description

Scrivox turns your voice into handwriting. Speak naturally and watch your words appear in a
beautiful handwriting font — your own, or one of 8 curated styles.

Export your handwriting as an image or A4 PDF — perfect for GoodNotes, Notability, messages,
and social media posts. Or use the Scrivox Keyboard to dictate handwriting-style text in any
app on your phone.

All processing is on-device. No account required, no data sent to servers.

**Features:**
- 8 curated handwriting fonts + import any .ttf file
- Voice-to-handwriting with organic character jitter
- Quick Mode, Document Mode, Notebook (A4) Mode
- Export as PNG image, PDF, clipboard, or share sheet
- Custom keyboard extension (Android IME)
- OCR: photograph handwritten notes, re-render in your font
- Dark mode / chalkboard theme
- Haptic feedback

---

## EAS Build Commands

Once your Expo account is linked (`eas login`):

```bash
# Development build (physical device)
eas build --profile development --platform android
eas build --profile development --platform ios

# Preview build (internal testing)
eas build --profile preview --platform all

# Production build
eas build --profile production --platform all

# Submit to stores
eas submit --profile production --platform ios
eas submit --profile production --platform android
```
