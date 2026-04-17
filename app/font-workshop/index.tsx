import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { saveFont, deleteFont } from '../../services/fontStorage';
import { useAppStore } from '../../store/useAppStore';

export default function FontWorkshopScreen() {
  const router = useRouter();
  const { customFonts, addCustomFont, removeCustomFont } = useAppStore();
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleImport() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['font/ttf', 'font/otf', 'application/octet-stream'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const defaultName = asset.name.replace(/\.(ttf|otf)$/i, '');
      setName(defaultName);
      setSelectedUri(asset.uri);
    } catch {
      Alert.alert('Error', 'Could not open file picker.');
    }
  }

  async function handleSave() {
    if (!selectedUri || !name.trim()) {
      Alert.alert('Missing info', 'Please pick a font file and enter a name.');
      return;
    }
    setLoading(true);
    try {
      const font = await saveFont(name.trim(), selectedUri);
      addCustomFont(font);
      setSelectedUri(null);
      setName('');
      router.back();
    } catch {
      Alert.alert('Import failed', 'Could not save the font. Make sure the file is a valid .ttf font.');
    } finally {
      setLoading(false);
    }
  }

  function confirmDelete(key: string, label: string) {
    Alert.alert(
      'Delete font',
      `Remove "${label}" from your fonts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteFont(key);
            removeCustomFont(key);
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Import Your Handwriting Font</Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Download a .ttf handwriting font (e.g. from dafont.com) and import it here. It will render
          natively as your handwriting throughout the app.
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL('https://www.dafont.com/tag.php?tag=handwritten')}>
          <Text style={styles.linkText}>Find handwriting fonts on dafont.com →</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.browseButton} onPress={handleImport}>
        <Text style={styles.browseButtonText}>Browse Files</Text>
      </TouchableOpacity>

      {selectedUri ? (
        <View style={styles.selectedRow}>
          <Text style={styles.selectedLabel}>Selected: </Text>
          <Text style={styles.selectedFile} numberOfLines={1}>{selectedUri.split('/').pop()}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Font Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. My Handwriting"
        placeholderTextColor="#b0a090"
        autoCapitalize="words"
      />

      <TouchableOpacity
        style={[styles.saveButton, (!selectedUri || !name.trim()) && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!selectedUri || !name.trim() || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Font</Text>
        )}
      </TouchableOpacity>

      {customFonts.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>My Imported Fonts</Text>
          {customFonts.map((font) => (
            <View key={font.key} style={styles.fontRow}>
              <Text style={[styles.fontRowLabel, { fontFamily: font.key }]}>{font.label}</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => confirmDelete(font.key, font.label)}
                accessibilityLabel={`Delete ${font.label}`}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  content: { padding: 24 },
  heading: { fontSize: 22, fontWeight: '700', color: '#3a2e1e', marginBottom: 16 },
  infoCard: {
    backgroundColor: '#fffcf5',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e8e0d0',
    marginBottom: 24,
  },
  infoText: { fontSize: 14, color: '#5c4a1e', lineHeight: 22, marginBottom: 10 },
  linkText: { fontSize: 14, color: '#8b6914', fontWeight: '600' },
  browseButton: {
    backgroundColor: '#8b6914',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  browseButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  selectedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  selectedLabel: { fontSize: 13, color: '#9e9087' },
  selectedFile: { fontSize: 13, color: '#3a2e1e', flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: '#5c4a1e', marginBottom: 6 },
  input: {
    backgroundColor: '#fffcf5',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d4c9b8',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#3a2e1e',
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#3a7a3a',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  saveButtonDisabled: { backgroundColor: '#a0b0a0' },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3a2e1e',
    marginBottom: 12,
  },
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffcf5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e8e0d0',
  },
  fontRowLabel: { flex: 1, fontSize: 22, color: '#3a2e1e' },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#c0392b',
    borderRadius: 8,
  },
  deleteButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
