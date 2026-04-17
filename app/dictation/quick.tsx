import { useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import DictationCanvas from '../../components/DictationCanvas';
import { useAppStore } from '../../store/useAppStore';

export default function QuickScreen() {
  const router = useRouter();
  const { transcribedText, clearText } = useAppStore();
  const { width } = useWindowDimensions();
  const viewShotRef = useRef<ViewShot>(null);

  const handleCopyText = useCallback(async () => {
    if (transcribedText) {
      await Clipboard.setStringAsync(transcribedText);
    }
  }, [transcribedText]);

  const handleShareImage = useCallback(async () => {
    if (!viewShotRef.current) return;
    try {
      const uri = await viewShotRef.current.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri);
      }
    } catch {
      // share failed
    }
  }, []);

  const handleDone = useCallback(() => {
    clearText();
    router.back();
  }, [clearText, router]);

  return (
    <View
      style={[styles.container, width > 600 && styles.containerTablet]}
      accessibilityLabel="Quick dictation mode"
    >
      <ViewShot
        ref={viewShotRef}
        style={styles.shotContainer}
        options={{ format: 'png', quality: 1.0 }}
      >
        <DictationCanvas scrollable={false} />
      </ViewShot>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCopyText}
          accessibilityLabel="Copy text to clipboard"
          accessibilityRole="button"
        >
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionLabel}>Copy Text</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={handleShareImage}
          accessibilityLabel="Share as image"
          accessibilityRole="button"
        >
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={[styles.actionLabel, styles.actionLabelPrimary]}>Share Image</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonDanger]}
          onPress={handleDone}
          accessibilityLabel="Done and clear text"
          accessibilityRole="button"
        >
          <Text style={styles.actionIcon}>✓</Text>
          <Text style={[styles.actionLabel, styles.actionLabelPrimary]}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  containerTablet: { paddingHorizontal: 48 },
  shotContainer: { flex: 1 },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    backgroundColor: '#F5F0E8',
    borderTopWidth: 1,
    borderTopColor: '#d4c9b8',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#e8e0d0',
    borderRadius: 12,
  },
  actionButtonPrimary: { backgroundColor: '#8b6914' },
  actionButtonDanger: { backgroundColor: '#3a7a3a' },
  actionIcon: { fontSize: 20, marginBottom: 4 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#5c4a1e' },
  actionLabelPrimary: { color: '#fff' },
});
