import { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, AppMode } from '../../store/useAppStore';

const MODES: { key: AppMode; label: string; icon: string; desc: string }[] = [
  {
    key: 'quick',
    label: 'Quick',
    icon: '⚡',
    desc: 'Short burst → instant share',
  },
  {
    key: 'document',
    label: 'Document',
    icon: '📄',
    desc: 'Full screen, multi-paragraph',
  },
  {
    key: 'notebook',
    label: 'Notebook',
    icon: '📓',
    desc: 'A4 page, GoodNotes-ready',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { appMode, setAppMode } = useAppStore();
  const { width } = useWindowDimensions();
  const cardWidth = width > 600 ? (width - 64) / 3 : width - 48;

  const handleStart = useCallback(() => {
    if (appMode === 'quick') {
      router.push('/dictation/quick');
    } else {
      router.push('/dictation/document');
    }
  }, [appMode, router]);

  return (
    <View style={styles.container} accessibilityLabel="Home screen">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title} accessibilityLabel="Scrivox title">
          Scrivox
        </Text>
        <Text style={styles.subtitle} accessibilityLabel="App subtitle">
          Speak. See your handwriting.
        </Text>

        <Text style={styles.sectionLabel} accessibilityLabel="Mode selector label">
          Mode
        </Text>
        <View
          style={[
            styles.modeRow,
            width > 600 ? styles.modeRowTablet : styles.modeRowPhone,
          ]}
        >
          {MODES.map((mode) => (
            <TouchableOpacity
              key={mode.key}
              style={[
                styles.modeCard,
                { width: cardWidth },
                appMode === mode.key && styles.modeCardActive,
              ]}
              onPress={() => setAppMode(mode.key)}
              accessibilityLabel={`Select ${mode.label} mode: ${mode.desc}`}
              accessibilityRole="button"
            >
              <Text style={styles.modeIcon}>{mode.icon}</Text>
              <Text
                style={[
                  styles.modeLabel,
                  appMode === mode.key && styles.modeLabelActive,
                ]}
              >
                {mode.label}
              </Text>
              <Text style={styles.modeDesc}>{mode.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStart}
          accessibilityLabel="Start dictating"
          accessibilityRole="button"
        >
          <Text style={styles.startButtonText}>Start Dictating</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  scroll: { padding: 24, alignItems: 'center' },
  title: {
    fontFamily: 'Caveat-Regular',
    fontSize: 56,
    color: '#3a2e1e',
    marginTop: 16,
  },
  subtitle: {
    fontFamily: 'Kalam-Regular',
    fontSize: 18,
    color: '#7a6a52',
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9e9087',
    letterSpacing: 1,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  modeRow: { width: '100%', marginBottom: 32 },
  modeRowTablet: { flexDirection: 'row', justifyContent: 'space-between' },
  modeRowPhone: { flexDirection: 'column', gap: 12 },
  modeCard: {
    backgroundColor: '#fffcf5',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e8e0d0',
    marginBottom: 8,
  },
  modeCardActive: { borderColor: '#8b6914', backgroundColor: '#fff8e7' },
  modeIcon: { fontSize: 32, marginBottom: 8 },
  modeLabel: { fontSize: 18, fontWeight: '700', color: '#3a2e1e', marginBottom: 4 },
  modeLabelActive: { color: '#8b6914' },
  modeDesc: { fontSize: 13, color: '#7a6a52' },
  startButton: {
    backgroundColor: '#8b6914',
    borderRadius: 32,
    paddingVertical: 18,
    paddingHorizontal: 48,
    marginTop: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
