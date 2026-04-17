import { useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import DictationCanvas from '../../components/DictationCanvas';

export default function DocumentScreen() {
  const router = useRouter();
  const { appMode } = useAppStore();
  const { width } = useWindowDimensions();

  const handleExport = useCallback(() => {
    router.push('/export/preview');
  }, [router]);

  return (
    <View
      style={[styles.container, width > 600 && styles.containerTablet]}
      accessibilityLabel="Document dictation screen"
    >
      <DictationCanvas
        notebookMode={appMode === 'notebook'}
        scrollable={appMode !== 'notebook'}
        onExport={handleExport}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  containerTablet: { paddingHorizontal: 48 },
});
