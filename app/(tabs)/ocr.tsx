import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';

// Try to load ML Kit; stub if unavailable
let TextRecognition: { recognize: (uri: string) => Promise<{ blocks: { text: string }[] }> } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  TextRecognition = require('@react-native-ml-kit/text-recognition').default;
} catch {
  TextRecognition = null;
}

export default function OCRScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setTranscribedText = useAppStore((s) => s.setTranscribedText);

  async function pickImage(fromCamera: boolean) {
    try {
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.9 });

      if (result.canceled) return;
      const uri = result.assets[0].uri;
      setImageUri(uri);
      setRecognizedText('');

      if (!TextRecognition) {
        Alert.alert(
          'OCR unavailable',
          'Text recognition requires a development build with ML Kit. You can still type text manually below.',
        );
        return;
      }

      setLoading(true);
      try {
        const ocr = await TextRecognition.recognize(uri);
        const text = ocr.blocks.map((b) => b.text).join('\n');
        setRecognizedText(text);
        if (!text.trim()) {
          Alert.alert('No text found', 'Could not detect any text in this image.');
        }
      } catch {
        Alert.alert('Recognition failed', 'Could not read text from this image.');
      } finally {
        setLoading(false);
      }
    } catch {
      Alert.alert('Error', 'Could not open camera or photo library.');
    }
  }

  function handleRender() {
    if (!recognizedText.trim()) {
      Alert.alert('No text', 'Please scan an image first or type text below.');
      return;
    }
    setTranscribedText(recognizedText);
    router.push('/dictation/document');
  }

  function handleClear() {
    setImageUri(null);
    setRecognizedText('');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Scan Handwriting</Text>
      <Text style={styles.subtitle}>
        Take a photo or pick an image to extract text, then render it in your chosen font.
      </Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.pickButton}
          onPress={() => pickImage(true)}
          accessibilityLabel="Take photo with camera"
        >
          <Text style={styles.pickButtonText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.pickButton}
          onPress={() => pickImage(false)}
          accessibilityLabel="Pick image from library"
        >
          <Text style={styles.pickButtonText}>Library</Text>
        </TouchableOpacity>
      </View>

      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.preview}
          accessibilityLabel="Selected image preview"
          resizeMode="contain"
        />
      ) : null}

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#8b6914" />
          <Text style={styles.loadingText}>Recognizing text…</Text>
        </View>
      ) : null}

      {!TextRecognition ? (
        <View style={styles.stubBanner}>
          <Text style={styles.stubText}>
            ML Kit OCR is stubbed — requires a native dev build. Type text manually below.
          </Text>
        </View>
      ) : null}

      <Text style={styles.label}>Recognized / Edited Text</Text>
      <TextInput
        style={styles.textInput}
        value={recognizedText}
        onChangeText={setRecognizedText}
        placeholder="Recognized text will appear here…"
        placeholderTextColor="#b0a090"
        multiline
        textAlignVertical="top"
        accessibilityLabel="Recognized text editor"
      />

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.renderButton}
          onPress={handleRender}
          disabled={!recognizedText.trim()}
          accessibilityLabel="Render text in my handwriting font"
        >
          <Text style={styles.renderButtonText}>Render in My Font</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClear}
          accessibilityLabel="Clear scan"
        >
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  content: { padding: 24 },
  heading: { fontSize: 22, fontWeight: '700', color: '#3a2e1e', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#7a6a52', marginBottom: 20, lineHeight: 20 },
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  pickButton: {
    flex: 1,
    backgroundColor: '#8b6914',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pickButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#e8e0d0',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  loadingText: { color: '#8b6914', fontSize: 14 },
  stubBanner: {
    backgroundColor: '#fff8e7',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d4c9b8',
    marginBottom: 16,
  },
  stubText: { fontSize: 13, color: '#7a6a52', lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#5c4a1e', marginBottom: 6 },
  textInput: {
    backgroundColor: '#fffcf5',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#d4c9b8',
    padding: 14,
    fontSize: 15,
    color: '#3a2e1e',
    minHeight: 140,
    marginBottom: 20,
  },
  actionRow: { flexDirection: 'row', gap: 12 },
  renderButton: {
    flex: 1,
    backgroundColor: '#3a7a3a',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  renderButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  clearButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#e8e0d0',
    borderRadius: 14,
    alignItems: 'center',
  },
  clearButtonText: { color: '#5c4a1e', fontSize: 15, fontWeight: '600' },
});
