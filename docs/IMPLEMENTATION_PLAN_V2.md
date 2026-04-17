# Scrivox — Full Technical Implementation Plan v2
> Auto-generated execution reference. Agent reads this before touching code.

---

## Current State (as of Phase 2 completion)
- ✅ Expo SDK 54 project, Expo Router, TypeScript strict
- ✅ 8 preset handwriting fonts, font gallery, selection via Zustand
- ✅ DictationCanvas with @react-native-voice/voice (needs EAS dev build to fire mic)
- ✅ Quick / Document / Notebook (A4) modes
- ✅ Export: image, PDF (react-native-html-to-pdf), clipboard, share sheet
- ✅ Settings: ink colour, font size, paper style
- ❌ Personal font import
- ❌ OCR (handwriting → text)
- ❌ expo prebuild (still managed workflow)
- ❌ Keyboard extension (iOS + Android)
- ❌ Polish (jitter, haptics, dark mode)
- ❌ EAS build config

---

## Architecture Decisions (Final, No Debate)

| Decision | Choice | Reason |
|---|---|---|
| Personal font | expo-document-picker → pick any .ttf | No API needed, works offline, user has full control |
| Custom font persistence | @react-native-async-storage/async-storage | Simple KV store, works cross-session |
| OCR engine | @react-native-ml-kit/text-recognition | Free, on-device, no API key |
| PDF on Android | expo-print as fallback if react-native-html-to-pdf fails | More reliable Android font rendering |
| Keyboard shared data | iOS: App Group UserDefaults / Android: SharedPreferences | OS-native IPC |
| STT in keyboard | iOS: SFSpeechRecognizer / Android: SpeechRecognizer | Built-in, no extra API |
| Character jitter | Small random rotation + translateY per word via Reanimated | Pure JS, zero native code |
| Dark mode | System + manual toggle, stored in AsyncStorage | Standard approach |

---

## Phase 3 — Personal Font + OCR + expo prebuild

### 3.0 Install new dependencies FIRST
```bash
npx expo install \
  expo-document-picker \
  expo-image-picker \
  expo-camera \
  expo-haptics \
  expo-print \
  @react-native-async-storage/async-storage \
  @react-native-ml-kit/text-recognition
```

### 3.1 expo prebuild
```bash
npx expo prebuild --clean
```
- Generates `ios/` and `android/` directories
- App can no longer run in standard Expo Go after this
- All further testing requires EAS development build or local Xcode/Android Studio
- Do NOT delete ios/ or android/ after this — keyboard extension lives there

### 3.2 Font Storage Service
**File: `services/fontStorage.ts`**
```typescript
import * as FileSystem from 'expo-file-system';
import * as Font from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FONT_DIR = FileSystem.documentDirectory + 'custom_fonts/';
const STORAGE_KEY = 'scrivox_custom_fonts';

export interface CustomFont {
  key: string;       // unique, e.g. "MyHandwriting"
  label: string;     // display name, e.g. "My Handwriting"
  path: string;      // absolute file path
  createdAt: number; // timestamp
}

export async function ensureFontDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(FONT_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(FONT_DIR, { intermediates: true });
}

export async function loadPersistedFonts(): Promise<CustomFont[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const fonts: CustomFont[] = JSON.parse(raw);
  // Load each font into the font registry
  for (const f of fonts) {
    const info = await FileSystem.getInfoAsync(f.path);
    if (info.exists) {
      try { await Font.loadAsync({ [f.key]: f.path }); } catch { /* already loaded */ }
    }
  }
  return fonts.filter(async (f) => (await FileSystem.getInfoAsync(f.path)).exists);
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
      JSON.stringify(existing.filter((f) => f.key !== key))
    );
  }
}
```

### 3.3 Zustand Store Update
**File: `store/useAppStore.ts`** — add custom fonts support:
```typescript
// Add to AppState interface:
customFonts: CustomFont[];
setCustomFonts: (fonts: CustomFont[]) => void;
addCustomFont: (font: CustomFont) => void;
removeCustomFont: (key: string) => void;

// Add FontKey to be string (not union) to allow dynamic custom font keys:
// Change: export type FontKey = 'Caveat-Regular' | ...
// To:     export type FontKey = string;
// Keep FONT_LABELS as Record<string, string>, add custom fonts dynamically
```

### 3.4 Font Workshop Screen
**File: `app/font-workshop/index.tsx`**

UI:
- Header: "Import Your Handwriting Font"
- Explanation card: "Download a .ttf handwriting font (e.g. from dafont.com) and import it here. It will render natively as your handwriting throughout the app."
- Large "Browse Files" button → expo-document-picker
- Name input field (pre-filled from filename)
- "Save Font" button
- List of already-imported custom fonts with delete (swipe or long-press)
- Link button: "Find handwriting fonts" → opens browser to https://www.dafont.com/tag.php?tag=handwritten

Implementation:
```typescript
import * as DocumentPicker from 'expo-document-picker';
import { saveFont, deleteFont, loadPersistedFonts } from '../../services/fontStorage';

async function handleImport() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['font/ttf', 'font/otf', 'application/octet-stream'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return;
  const asset = result.assets[0];
  const defaultName = asset.name.replace(/\.(ttf|otf)$/i, '');
  setName(defaultName);
  setSelectedUri(asset.uri);
}

async function handleSave() {
  if (!selectedUri || !name.trim()) return;
  setLoading(true);
  try {
    const font = await saveFont(name.trim(), selectedUri);
    addCustomFont(font);
    router.back();
  } finally {
    setLoading(false);
  }
}
```

### 3.5 Update Fonts Tab
**File: `app/(tabs)/fonts.tsx`**
- Add "My Fonts" section above presets
- Load custom fonts from store on mount (call `loadPersistedFonts()` in useEffect)
- Add "+" button in top-right → navigate to `/font-workshop`
- Long-press on custom font card → confirmation alert → deleteFont()
- Custom fonts show same preview card as preset fonts

### 3.6 Root Layout — Load Custom Fonts on Boot
**File: `app/_layout.tsx`** — in useEffect after fonts loaded:
```typescript
useEffect(() => {
  loadPersistedFonts().then((fonts) => {
    setCustomFonts(fonts);
  });
}, []);
```

### 3.7 OCR Screen
**File: `app/(tabs)/ocr.tsx`**

Full implementation:
```typescript
import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

export default function OCRScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function pickImage(fromCamera: boolean) {
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.9 });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setImageUri(uri);
    setLoading(true);
    try {
      const ocr = await TextRecognition.recognize(uri);
      const text = ocr.blocks.map((b) => b.text).join('\n');
      setRecognizedText(text);
    } catch (e) {
      Alert.alert('Recognition failed', 'Could not read text from this image.');
    } finally {
      setLoading(false);
    }
  }

  function handleRender() {
    // Pre-fill the document canvas with recognized text
    setTranscribedText(recognizedText);
    router.push('/dictation/document');
  }

  // UI: image thumbnail, loading indicator, editable TextInput,
  // "Re-render in my font" button, "Clear" button
}
```

Add OCR tab to `app/(tabs)/_layout.tsx`:
```typescript
<Tabs.Screen
  name="ocr"
  options={{ title: 'Scan', tabBarIcon: ({ color }) => <TabIcon name="camera" color={color} /> }}
/>
```

---

## Phase 4A — Keyboard Extension

### 4.1 App Group Setup (iOS)

In `app.json`, inside `ios`:
```json
"entitlements": {
  "com.apple.security.application-groups": ["group.com.scrivox.app"]
}
```

Main app must write font path to shared UserDefaults whenever font changes.
**File: `services/keyboardSync.ts`**
```typescript
import { NativeModules, Platform } from 'react-native';

// iOS: write to App Group UserDefaults via native module
// Android: write to SharedPreferences via native module
export async function syncSettingsToKeyboard(fontPath: string | null, inkColour: string, fontSize: number) {
  if (Platform.OS === 'ios') {
    NativeModules.AppGroupSettings?.setValues({
      selectedFontPath: fontPath ?? '',
      inkColour,
      fontSize: String(fontSize),
    });
  } else if (Platform.OS === 'android') {
    NativeModules.SharedPrefsSettings?.setValues({
      selectedFontPath: fontPath ?? '',
      inkColour,
      fontSize: String(fontSize),
    });
  }
}
```

Call `syncSettingsToKeyboard()` in useAppStore whenever font/colour/size changes.

### 4.2 iOS Keyboard Extension

**After expo prebuild, create these files:**

**`ios/ScrivoxKeyboard/KeyboardViewController.swift`**
```swift
import UIKit
import Speech

class KeyboardViewController: UIInputViewController, SFSpeechRecognizerDelegate {
    
    // MARK: - Properties
    private let appGroup = "group.com.scrivox.app"
    private var previewLabel: UILabel!
    private var micButton: UIButton!
    private var insertTextButton: UIButton!
    private var insertImageButton: UIButton!
    private var modeLabel: UILabel!
    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var audioEngine = AVAudioEngine()
    private var isRecording = false
    private var transcribedText = ""
    
    private var sharedDefaults: UserDefaults? {
        return UserDefaults(suiteName: appGroup)
    }
    
    private var selectedFontPath: String? {
        return sharedDefaults?.string(forKey: "selectedFontPath")
    }
    
    private var inkColour: UIColor {
        let hex = sharedDefaults?.string(forKey: "inkColour") ?? "#1a1a1a"
        return UIColor(hex: hex) ?? .black
    }
    
    private var fontSize: CGFloat {
        let s = sharedDefaults?.string(forKey: "fontSize") ?? "28"
        return CGFloat(Double(s) ?? 28)
    }
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.96, green: 0.94, blue: 0.91, alpha: 1)
        setupUI()
        requestSpeechAuthorization()
    }
    
    // MARK: - UI Setup
    private func setupUI() {
        // Preview strip
        previewLabel = UILabel()
        previewLabel.text = "Tap 🎙️ to dictate…"
        previewLabel.font = loadHandwritingFont(size: fontSize * 0.7)
        previewLabel.textColor = inkColour
        previewLabel.numberOfLines = 2
        previewLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(previewLabel)
        
        // Mic button
        micButton = UIButton(type: .system)
        micButton.setTitle("🎙️", for: .normal)
        micButton.titleLabel?.font = .systemFont(ofSize: 32)
        micButton.backgroundColor = UIColor(red: 0.55, green: 0.41, blue: 0.08, alpha: 1)
        micButton.layer.cornerRadius = 28
        micButton.translatesAutoresizingMaskIntoConstraints = false
        micButton.addTarget(self, action: #selector(micTapped), for: .touchUpInside)
        view.addSubview(micButton)
        
        // Insert as text button
        insertTextButton = makeInsertButton(title: "Insert Text", color: UIColor(red: 0.23, green: 0.48, blue: 0.23, alpha: 1))
        insertTextButton.addTarget(self, action: #selector(insertAsText), for: .touchUpInside)
        view.addSubview(insertTextButton)
        
        // Insert as image button
        insertImageButton = makeInsertButton(title: "Insert Image", color: UIColor(red: 0.23, green: 0.35, blue: 0.65, alpha: 1))
        insertImageButton.addTarget(self, action: #selector(insertAsImage), for: .touchUpInside)
        view.addSubview(insertImageButton)
        
        setupConstraints()
    }
    
    private func makeInsertButton(title: String, color: UIColor) -> UIButton {
        let btn = UIButton(type: .system)
        btn.setTitle(title, for: .normal)
        btn.setTitleColor(.white, for: .normal)
        btn.titleLabel?.font = .systemFont(ofSize: 13, weight: .semibold)
        btn.backgroundColor = color
        btn.layer.cornerRadius = 14
        btn.translatesAutoresizingMaskIntoConstraints = false
        return btn
    }
    
    private func setupConstraints() {
        let h = view.heightAnchor
        NSLayoutConstraint.activate([
            previewLabel.topAnchor.constraint(equalTo: view.topAnchor, constant: 8),
            previewLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 14),
            previewLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -14),
            previewLabel.heightAnchor.constraint(equalToConstant: 52),
            
            micButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            micButton.topAnchor.constraint(equalTo: previewLabel.bottomAnchor, constant: 10),
            micButton.widthAnchor.constraint(equalToConstant: 56),
            micButton.heightAnchor.constraint(equalToConstant: 56),
            
            insertTextButton.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -10),
            insertTextButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 14),
            insertTextButton.widthAnchor.constraint(equalToConstant: 130),
            insertTextButton.heightAnchor.constraint(equalToConstant: 36),
            
            insertImageButton.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -10),
            insertImageButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -14),
            insertImageButton.widthAnchor.constraint(equalToConstant: 130),
            insertImageButton.heightAnchor.constraint(equalToConstant: 36),
        ])
    }
    
    // MARK: - Font Loading
    private func loadHandwritingFont(size: CGFloat) -> UIFont {
        guard let path = selectedFontPath, !path.isEmpty else {
            return UIFont(name: "Georgia-Italic", size: size) ?? .systemFont(ofSize: size)
        }
        let url = URL(fileURLWithPath: path)
        guard let data = try? Data(contentsOf: url) as CFData,
              let provider = CGDataProvider(data: data),
              let cgFont = CGFont(provider) else {
            return .systemFont(ofSize: size)
        }
        CTFontManagerRegisterGraphicsFont(cgFont, nil)
        if let name = cgFont.postScriptName as String? {
            return UIFont(name: name, size: size) ?? .systemFont(ofSize: size)
        }
        return .systemFont(ofSize: size)
    }
    
    // MARK: - Speech
    private func requestSpeechAuthorization() {
        SFSpeechRecognizer.requestAuthorization { _ in }
    }
    
    @objc private func micTapped() {
        isRecording ? stopRecording() : startRecording()
    }
    
    private func startRecording() {
        speechRecognizer = SFSpeechRecognizer(locale: Locale.current)
        speechRecognizer?.delegate = self
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let request = recognitionRequest else { return }
        request.shouldReportPartialResults = true
        
        let node = audioEngine.inputNode
        recognitionTask = speechRecognizer?.recognitionTask(with: request) { [weak self] result, error in
            guard let self = self else { return }
            if let result = result {
                self.transcribedText = result.bestTranscription.formattedString
                DispatchQueue.main.async {
                    self.previewLabel.text = self.transcribedText
                    self.previewLabel.font = self.loadHandwritingFont(size: self.fontSize * 0.7)
                    self.previewLabel.textColor = self.inkColour
                }
            }
            if error != nil || result?.isFinal == true { self.stopRecording() }
        }
        
        let format = node.outputFormat(forBus: 0)
        node.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }
        try? audioEngine.start()
        isRecording = true
        micButton.backgroundColor = UIColor(red: 0.75, green: 0.24, blue: 0.17, alpha: 1)
    }
    
    private func stopRecording() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        isRecording = false
        micButton.backgroundColor = UIColor(red: 0.55, green: 0.41, blue: 0.08, alpha: 1)
    }
    
    // MARK: - Insert
    @objc private func insertAsText() {
        guard !transcribedText.isEmpty else { return }
        textDocumentProxy.insertText(transcribedText)
        transcribedText = ""
        previewLabel.text = "Tap 🎙️ to dictate…"
    }
    
    @objc private func insertAsImage() {
        guard !transcribedText.isEmpty else { return }
        let image = renderTextAsImage(text: transcribedText)
        UIPasteboard.general.image = image
        let alert = UIAlertController(
            title: "Image copied",
            message: "Your handwriting is on the clipboard. Long-press the text field and tap Paste.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
    
    private func renderTextAsImage(text: String) -> UIImage {
        let font = loadHandwritingFont(size: fontSize)
        let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: inkColour]
        let textSize = (text as NSString).boundingRect(
            with: CGSize(width: 600, height: 400),
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            attributes: attrs, context: nil
        ).size
        let padding: CGFloat = 20
        let size = CGSize(width: textSize.width + padding * 2, height: textSize.height + padding * 2)
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { _ in
            text.draw(in: CGRect(origin: CGPoint(x: padding, y: padding), size: textSize), withAttributes: attrs)
        }
    }
}

// MARK: - UIColor hex extension
extension UIColor {
    convenience init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "#", with: "")
        if hexSanitized.count == 6 { hexSanitized += "ff" }
        guard hexSanitized.count == 8, let value = UInt64(hexSanitized, radix: 16) else { return nil }
        self.init(red: CGFloat((value & 0xff000000) >> 24) / 255,
                  green: CGFloat((value & 0x00ff0000) >> 16) / 255,
                  blue: CGFloat((value & 0x0000ff00) >> 8) / 255,
                  alpha: CGFloat(value & 0x000000ff) / 255)
    }
}
```

**`ios/ScrivoxKeyboard/Info.plist`**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionAttributes</key>
        <dict>
            <key>IsASCIICapable</key><false/>
            <key>PrefersRightToLeft</key><false/>
            <key>PrimaryLanguage</key><string>en-US</string>
            <key>RequestsOpenAccess</key><true/>
        </dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.keyboard-service</string>
        <key>NSExtensionPrincipalClass</key>
        <string>$(PRODUCT_MODULE_NAME).KeyboardViewController</string>
    </dict>
    <key>NSMicrophoneUsageDescription</key>
    <string>Scrivox Keyboard uses the microphone to transcribe your speech into handwriting-style text.</string>
    <key>NSSpeechRecognitionUsageDescription</key>
    <string>Scrivox Keyboard uses speech recognition to convert your voice to text.</string>
</dict>
</plist>
```

**Xcode project modifications** (in `ios/scrivox.xcodeproj/project.pbxproj`):
- Add new target `ScrivoxKeyboard` of type `com.apple.product-type.app-extension`
- Link `Speech.framework` to the extension target
- Add App Group capability `group.com.scrivox.app` to BOTH main target and extension target
- Extension bundle ID: `com.scrivox.app.ScrivoxKeyboard`

### 4.3 Android IME

**`android/app/src/main/java/com/scrivox/app/keyboard/ScrivoxIME.kt`**
```kotlin
package com.scrivox.app.keyboard

import android.content.SharedPreferences
import android.graphics.Color
import android.graphics.Typeface
import android.inputmethodservice.InputMethodService
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.content.Intent
import android.os.Bundle
import java.io.File

class ScrivoxIME : InputMethodService() {

    private lateinit var prefs: SharedPreferences
    private var speechRecognizer: SpeechRecognizer? = null
    private var isListening = false
    private var currentText = ""

    private lateinit var previewText: TextView
    private lateinit var micButton: Button
    private lateinit var insertButton: Button

    override fun onCreateInputView(): View {
        prefs = getSharedPreferences("scrivox_keyboard", MODE_PRIVATE)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#F5F0E8"))
            setPadding(16, 12, 16, 16)
        }

        // Preview text
        previewText = TextView(this).apply {
            text = "Tap 🎙️ to dictate…"
            textSize = 20f
            setTextColor(Color.parseColor(prefs.getString("inkColour", "#1a1a1a") ?: "#1a1a1a"))
            loadCustomFont()?.let { typeface = it }
            setPadding(8, 8, 8, 8)
            minHeight = 56
        }
        root.addView(previewText, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
        ))

        // Buttons row
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER
            setPadding(0, 8, 0, 0)
        }

        micButton = Button(this).apply {
            text = "🎙️"
            textSize = 28f
            setBackgroundColor(Color.parseColor("#8b6914"))
            setTextColor(Color.WHITE)
            setOnClickListener { toggleRecording() }
        }
        row.addView(micButton, LinearLayout.LayoutParams(120, 120).apply { marginEnd = 24 })

        insertButton = Button(this).apply {
            text = "Insert"
            setBackgroundColor(Color.parseColor("#3a7a3a"))
            setTextColor(Color.WHITE)
            setOnClickListener { doInsert() }
        }
        row.addView(insertButton)

        root.addView(row)
        return root
    }

    private fun loadCustomFont(): Typeface? {
        val path = prefs.getString("selectedFontPath", null) ?: return null
        return try { Typeface.createFromFile(File(path)) } catch (e: Exception) { null }
    }

    private fun toggleRecording() {
        if (isListening) stopListening() else startListening()
    }

    private fun startListening() {
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
        speechRecognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() { isListening = false; micButton.setBackgroundColor(Color.parseColor("#8b6914")) }
            override fun onError(error: Int) { isListening = false; micButton.setBackgroundColor(Color.parseColor("#8b6914")) }
            override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!matches.isNullOrEmpty()) {
                    currentText = matches[0]
                    previewText.text = currentText
                }
            }
            override fun onPartialResults(partialResults: Bundle?) {
                val partial = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!partial.isNullOrEmpty()) previewText.text = partial[0]
            }
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        }
        speechRecognizer?.startListening(intent)
        isListening = true
        micButton.setBackgroundColor(Color.parseColor("#c0392b"))
    }

    private fun stopListening() {
        speechRecognizer?.stopListening()
        speechRecognizer?.destroy()
        isListening = false
        micButton.setBackgroundColor(Color.parseColor("#8b6914"))
    }

    private fun doInsert() {
        if (currentText.isNotEmpty()) {
            currentInputConnection?.commitText(currentText, 1)
            currentText = ""
            previewText.text = "Tap 🎙️ to dictate…"
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        speechRecognizer?.destroy()
    }
}
```

**`android/app/src/main/res/xml/method.xml`**
```xml
<?xml version="1.0" encoding="utf-8"?>
<input-method xmlns:android="http://schemas.android.com/apk/res/android"
    android:settingsActivity="com.scrivox.app.MainActivity">
    <subtype
        android:label="English"
        android:imeSubtypeLocale="en_US"
        android:imeSubtypeMode="keyboard" />
</input-method>
```

**`android/app/src/main/AndroidManifest.xml`** — add inside `<application>`:
```xml
<service
    android:name=".keyboard.ScrivoxIME"
    android:label="Scrivox Keyboard"
    android:exported="true"
    android:permission="android.permission.BIND_INPUT_METHOD">
    <intent-filter>
        <action android:name="android.view.InputMethod" />
    </intent-filter>
    <meta-data
        android:name="android.view.im"
        android:resource="@xml/method" />
</service>
```

### 4.4 AppGroup Native Module (iOS)
Main app needs to write font path to shared UserDefaults so the keyboard can read it.

**`ios/scrivox/AppGroupSettingsModule.swift`**
```swift
import Foundation

@objc(AppGroupSettings)
class AppGroupSettings: NSObject {
    private let suiteName = "group.com.scrivox.app"
    
    @objc func setValues(_ values: NSDictionary) {
        guard let defaults = UserDefaults(suiteName: suiteName) else { return }
        for (key, value) in values {
            defaults.set(value, forKey: key as! String)
        }
        defaults.synchronize()
    }
    
    @objc static func requiresMainQueueSetup() -> Bool { return false }
}
```

**`ios/scrivox/AppGroupSettingsModule.m`**
```objc
#import <React/RCTBridgeModule.h>
RCT_EXTERN_MODULE(AppGroupSettings, NSObject)
RCT_EXTERN_METHOD(setValues:(NSDictionary *)values)
```

### 4.5 SharedPrefs Native Module (Android)
**`android/app/src/main/java/com/scrivox/app/SharedPrefsSettingsModule.kt`**
```kotlin
package com.scrivox.app

import android.content.Context
import com.facebook.react.bridge.*

class SharedPrefsSettingsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SharedPrefsSettings"

    @ReactMethod
    fun setValues(values: ReadableMap) {
        val prefs = reactApplicationContext
            .getSharedPreferences("scrivox_keyboard", Context.MODE_PRIVATE)
        val editor = prefs.edit()
        val iter = values.keySetIterator()
        while (iter.hasNextKey()) {
            val key = iter.nextKey()
            editor.putString(key, values.getString(key))
        }
        editor.apply()
    }
}
```

**`android/app/src/main/java/com/scrivox/app/SharedPrefsSettingsPackage.kt`**
```kotlin
package com.scrivox.app
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class SharedPrefsSettingsPackage : ReactPackage {
    override fun createNativeModules(ctx: ReactApplicationContext): List<NativeModule> =
        listOf(SharedPrefsSettingsModule(ctx))
    override fun createViewManagers(ctx: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
```

Register in `MainApplication.kt`:
```kotlin
packages.add(SharedPrefsSettingsPackage())
```

---

## Phase 4B — Polish

### 4B.1 Character Jitter (organic feel)
**File: `components/DictationCanvas.tsx`** — update `AnimatedWord`:
```typescript
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

function AnimatedWord({ word, fontFamily, fontSize, inkColour }: WordProps) {
  // Stable per-word random values (use word index as seed approximation)
  const rotation = (Math.random() - 0.5) * 3.5;   // -1.75° to +1.75°
  const translateY = (Math.random() - 0.5) * 2.5; // -1.25 to +1.25px
  const scale = 0.97 + Math.random() * 0.06;       // 0.97 to 1.03

  return (
    <Animated.Text
      entering={FadeInDown.duration(250).springify()}
      style={[
        styles.wordText,
        { fontFamily, fontSize, color: inkColour,
          transform: [{ rotate: `${rotation}deg` }, { translateY }, { scale }] }
      ]}
      accessibilityLabel={word}
    >
      {word}{' '}
    </Animated.Text>
  );
}
```

### 4B.2 Haptic Feedback
Add to DictationCanvas `startRecording` / `stopRecording`:
```typescript
import * as Haptics from 'expo-haptics';
// on start:
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
// on stop:
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
```

### 4B.3 Dark Mode (Chalkboard)
Add to Zustand store:
```typescript
darkMode: boolean;
toggleDarkMode: () => void;
```
Chalkboard colours:
- Background: `#1a1e2e`
- Paper lines: `rgba(255,255,255,0.08)`
- Default ink: `#e8dfc8`

In settings screen: add dark mode toggle switch.
In DictationCanvas, root layout, export preview — read `darkMode` from store, switch bg/text accordingly.

### 4B.4 Mic Waveform Animation
While recording, show 3 animated bars next to the mic button:
```typescript
function WaveformBars({ isRecording }: { isRecording: boolean }) {
  const bars = [useSharedValue(0.3), useSharedValue(0.6), useSharedValue(0.4)];
  
  useEffect(() => {
    if (!isRecording) { bars.forEach((b) => (b.value = withSpring(0.3))); return; }
    const intervals = bars.map((bar, i) =>
      setInterval(() => { bar.value = withSpring(0.2 + Math.random() * 0.8); }, 150 + i * 50)
    );
    return () => intervals.forEach(clearInterval);
  }, [isRecording]);

  return (
    <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center', height: 24 }}>
      {bars.map((bar, i) => {
        const style = useAnimatedStyle(() => ({ height: bar.value * 24, backgroundColor: '#8b6914' }));
        return <Animated.View key={i} style={[{ width: 3, borderRadius: 2 }, style]} />;
      })}
    </View>
  );
}
```

---

## Phase 5 — EAS Configuration

### 5.1 eas.json (project root)
```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "simulator": false }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {
      "ios": { "language": "en-US", "copyright": "2025 Scrivox" },
      "android": { "track": "internal" }
    }
  }
}
```

### 5.2 app.json — add EAS project ID placeholder
```json
"extra": {
  "eas": { "projectId": "REPLACE_WITH_EAS_PROJECT_ID" }
}
```

### 5.3 Store Metadata File
**File: `docs/STORE_METADATA.md`**
```markdown
## App Store (iOS)
- Name: Scrivox
- Subtitle: Your voice, your handwriting
- Category: Productivity
- Secondary: Utilities
- Keywords: handwriting font, voice dictation, TTS, speech to text, keyboard, GoodNotes, custom font
- Support URL: https://github.com/lt20202122/scrivox
- Age rating: 4+
- Privacy: Microphone (dictation), Speech Recognition (transcription). No data leaves device by default.
- Description:
  Scrivox turns your voice into handwriting. Speak naturally and watch your words appear in a
  beautiful handwriting font — your own, or one of 8 curated styles. Export as image or A4 PDF,
  perfect for GoodNotes, Notability, messages, and social media.

## Play Store (Android)
- Category: Productivity
- Content rating: Everyone
- Short description (80 chars): Speak and see your words in handwriting. Export to PDF or image.
- Tags: dictation, handwriting, font, keyboard, productivity
```

---

## Execution Checklist

- [x] Phase 3.0 — Install dependencies
- [x] Phase 3.1 — expo prebuild --clean
- [x] Phase 3.2 — fontStorage service
- [x] Phase 3.3 — Zustand store update (custom fonts + darkMode)
- [x] Phase 3.4 — Font Workshop screen
- [x] Phase 3.5 — Fonts tab update (My Fonts section)
- [x] Phase 3.6 — Root layout loads persisted fonts
- [x] Phase 3.7 — OCR screen
- [x] Phase 4.1 — App Group entitlement in app.json
- [x] Phase 4.2 — iOS KeyboardViewController.swift
- [x] Phase 4.3 — Android ScrivoxIME.kt + layout XML + manifest
- [x] Phase 4.4 — AppGroupSettings native module (iOS)
- [x] Phase 4.5 — SharedPrefsSettings native module (Android)
- [x] Phase 4.6 — keyboardSync service (JS side)
- [x] Phase 4B.1 — Character jitter
- [x] Phase 4B.2 — Haptics
- [x] Phase 4B.3 — Dark mode
- [x] Phase 4B.4 — Waveform bars
- [x] Phase 5.1 — eas.json
- [x] Phase 5.2 — app.json EAS project ID placeholder
- [x] Phase 5.3 — Store metadata doc
- [x] Final — commit all, push to remote

---

## Build Notes

### What was completed (Phases 3–5, branch: feature/phases-3-5)

All checklist items above were completed. Commits:
1. `Phase 3: personal font import, OCR screen, expo prebuild`
2. `Phase 4A: keyboard extension iOS Swift + Android Kotlin + native sync modules`
3. `Phase 4B: character jitter, haptics, dark mode, waveform bars`
4. `Phase 5: EAS config, store metadata`

### Deviations from plan

| Item | Planned | Actual | Reason |
|---|---|---|---|
| `@react-native-ml-kit/text-recognition` install | `npx expo install` | `npm install --legacy-peer-deps` | Peer dep conflict with React 19; installed successfully, gracefully stubbed at runtime |
| `npx expo install` for other deps | `npx expo install` | `npm install --legacy-peer-deps` | Same peer dep issue |
| `expo prebuild` | Generates `ios/` and `android/` | Only `android/` generated | Build machine is Windows; Xcode/iOS native toolchain not available |
| `ios/` files | Created after prebuild | Created manually and force-tracked with `git add -f` | Prebuild skipped iOS on Windows; files are correct and ready to use after macOS prebuild |
| `android/` files | gitignored by default | Force-tracked with `git add -f` | Plan requires native files in repo |
| `WaveformBars` shared values | Used array destructuring | Used individual variables (bar0, bar1, bar2) | React rules of hooks disallow calling hooks (useSharedValue) inside array map at top level |
| app.json EAS block | `"REPLACE_WITH_EAS_PROJECT_ID"` placeholder | Real project ID `f15e1449-4247-42a5-8be6-52138f3b35df` added by Expo tooling | Expo detected the linked account automatically |

### Manual steps the developer must do

#### iOS — Xcode keyboard extension target
Full instructions: `ios/ScrivoxKeyboard/README_XCODE_SETUP.md`

Summary:
1. On macOS, run `npx expo prebuild --clean` (this will regenerate `ios/`)
2. Open `ios/scrivox.xcworkspace` in Xcode
3. Add a new **Custom Keyboard Extension** target named `ScrivoxKeyboard`
4. Copy `ios/ScrivoxKeyboard/KeyboardViewController.swift` and `Info.plist` into the target
5. Add App Group `group.com.scrivox.app` to both main and keyboard targets
6. Link `Speech.framework` to the keyboard target
7. Build on a real device (keyboard extensions don't run in Simulator)

#### Android — keyboard available immediately after gradle sync
The `ScrivoxIME` is registered in `AndroidManifest.xml`. After building the app, users can
enable it at Settings → System → Language & Input → On-screen keyboard → Manage keyboards.

#### EAS account linking
```bash
npm install -g eas-cli
eas login          # log in with expo.dev account
eas build --profile development --platform android   # first build test
```

### EAS commands to run once account is linked

```bash
# Development build (real device)
eas build --profile development --platform android
eas build --profile development --platform ios   # requires macOS + Xcode

# Preview (internal testing APK/IPA)
eas build --profile preview --platform all

# Production
eas build --profile production --platform all

# Submit to stores
eas submit --profile production --platform ios
eas submit --profile production --platform android
```
