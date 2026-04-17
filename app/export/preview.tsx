import { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { useAppStore, FONT_LABELS } from '../../store/useAppStore';
import DictationCanvas from '../../components/DictationCanvas';

type GeneratePDFFn = (opts: {
  html: string;
  fileName: string;
  base64?: boolean;
  width?: number;
  height?: number;
}) => Promise<{ filePath: string }>;

let generatePDF: GeneratePDFFn | null = null;
try {
  generatePDF = require('react-native-html-to-pdf').generatePDF as GeneratePDFFn;
} catch {
  // not available in this environment
}

function buildPdfHtml(
  text: string,
  fontFamily: string,
  fontSize: number,
  inkColour: string,
  paperStyle: string
): string {
  const bgColour =
    paperStyle === 'parchment' || paperStyle === 'lined' ? '#F5F0E8' : '#ffffff';

  const linedCSS =
    paperStyle === 'lined'
      ? `background-image: repeating-linear-gradient(
          to bottom,
          transparent,
          transparent ${fontSize * 1.8 - 1}px,
          rgba(180,160,120,0.3) ${fontSize * 1.8 - 1}px,
          rgba(180,160,120,0.3) ${fontSize * 1.8}px
        );`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 40px; }
  body {
    margin: 0;
    padding: 40px;
    background: ${bgColour};
    ${linedCSS}
    font-family: sans-serif;
  }
  p {
    font-size: ${fontSize}px;
    color: ${inkColour};
    line-height: ${fontSize * 1.8}px;
    margin: 0;
    word-break: break-word;
    white-space: pre-wrap;
  }
</style>
</head>
<body>
  <p>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>
</body>
</html>`;
}

type ExportStatus = 'idle' | 'loading' | 'done' | 'error';

interface ActionButtonProps {
  label: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}

function ActionButton({ label, icon, onPress, disabled, primary }: ActionButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, primary && styles.actionBtnPrimary, disabled && styles.actionBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
    >
      <Text style={styles.actionBtnIcon}>{icon}</Text>
      <Text style={[styles.actionBtnLabel, primary && styles.actionBtnLabelPrimary]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ExportPreviewScreen() {
  const {
    transcribedText,
    selectedFont,
    inkColour,
    fontSize,
    paperStyle,
    appMode,
  } = useAppStore();
  const { width } = useWindowDimensions();
  const viewShotRef = useRef<ViewShot>(null);
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const isTablet = width > 600;

  const withStatus = useCallback(async (fn: () => Promise<void>) => {
    setStatus('loading');
    setStatusMsg('');
    try {
      await fn();
      setStatus('done');
      setStatusMsg('Done!');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e) {
      setStatus('error');
      setStatusMsg(e instanceof Error ? e.message : 'Export failed');
    }
  }, []);

  const handleSaveImage = useCallback(() => {
    withStatus(async () => {
      const { status: perm } = await MediaLibrary.requestPermissionsAsync();
      if (perm !== 'granted') throw new Error('Permission denied');

      const uri = await viewShotRef.current?.capture?.();
      if (!uri) throw new Error('Capture failed');
      await MediaLibrary.saveToLibraryAsync(uri);
      setStatusMsg('Saved to Photos!');
    });
  }, [withStatus]);

  const handleCopyImage = useCallback(() => {
    withStatus(async () => {
      if (!viewShotRef.current) throw new Error('Capture failed');
      const base64 = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1.0,
        result: 'base64',
      });
      if (!base64) throw new Error('Capture failed');
      await Clipboard.setImageAsync(base64);
      setStatusMsg('Image copied!');
    });
  }, [withStatus]);

  const handleShareImage = useCallback(() => {
    withStatus(async () => {
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) throw new Error('Capture failed');
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing not available');
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    });
  }, [withStatus]);

  const handleExportPDF = useCallback(() => {
    withStatus(async () => {
      if (!generatePDF) throw new Error('PDF not available in Expo Go — use EAS build');

      const html = buildPdfHtml(transcribedText, selectedFont, fontSize, inkColour, paperStyle);
      const result = await generatePDF({
        html,
        fileName: `scrivox-${Date.now()}`,
        base64: false,
        width: 595,
        height: 842,
      });

      if (!result.filePath) throw new Error('PDF generation failed');

      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing not available');
      await Sharing.shareAsync(result.filePath, { mimeType: 'application/pdf' });
    });
  }, [withStatus, transcribedText, selectedFont, fontSize, inkColour, paperStyle]);

  const handleCopyText = useCallback(() => {
    withStatus(async () => {
      await Clipboard.setStringAsync(transcribedText);
      setStatusMsg('Text copied!');
    });
  }, [withStatus, transcribedText]);

  return (
    <View style={styles.container} accessibilityLabel="Export preview screen">
      <ScrollView contentContainerStyle={[styles.scroll, isTablet && styles.scrollTablet]}>
        <Text style={styles.sectionLabel} accessibilityLabel="Preview section">
          Preview
        </Text>
        <Text style={styles.modeTag} accessibilityLabel={`Export mode: ${appMode}`}>
          {appMode.charAt(0).toUpperCase() + appMode.slice(1)} Mode
          {' · '}
          {FONT_LABELS[selectedFont]}
        </Text>

        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1.0 }}
          style={styles.previewShot}
        >
          <DictationCanvas
            notebookMode={appMode === 'notebook'}
            scrollable={false}
          />
        </ViewShot>

        {status === 'loading' && (
          <View style={styles.statusRow} accessibilityLabel="Export in progress">
            <ActivityIndicator color="#8b6914" />
            <Text style={styles.statusText}>Exporting…</Text>
          </View>
        )}
        {status !== 'loading' && statusMsg ? (
          <Text
            style={[styles.statusText, status === 'error' && styles.statusError]}
            accessibilityLabel={statusMsg}
          >
            {statusMsg}
          </Text>
        ) : null}

        <Text style={styles.sectionLabel} accessibilityLabel="Export options section">
          Export Options
        </Text>

        <View style={[styles.actionsGrid, isTablet && styles.actionsGridTablet]}>
          <ActionButton
            label="Save to Photos"
            icon="🖼️"
            onPress={handleSaveImage}
            disabled={status === 'loading' || !transcribedText}
          />
          <ActionButton
            label="Copy Image"
            icon="📋"
            onPress={handleCopyImage}
            disabled={status === 'loading' || !transcribedText}
          />
          <ActionButton
            label="Copy Text"
            icon="📝"
            onPress={handleCopyText}
            disabled={status === 'loading' || !transcribedText}
          />
          <ActionButton
            label="Export PDF"
            icon="📄"
            onPress={handleExportPDF}
            primary
            disabled={status === 'loading' || !transcribedText}
          />
          <ActionButton
            label="Share"
            icon="📤"
            onPress={handleShareImage}
            primary
            disabled={status === 'loading' || !transcribedText}
          />
        </View>

        {!transcribedText && (
          <Text style={styles.emptyNote} accessibilityLabel="No text to export yet">
            Dictate some text first to enable export.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  scroll: { padding: 20 },
  scrollTablet: { paddingHorizontal: 60 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9e9087',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 16,
  },
  modeTag: {
    fontSize: 14,
    color: '#7a6a52',
    marginBottom: 12,
    fontWeight: '500',
  },
  previewShot: {
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 300,
    borderWidth: 1,
    borderColor: '#d4c9b8',
    marginBottom: 8,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
  statusText: { fontSize: 14, color: '#3a7a3a', fontWeight: '600', marginVertical: 8 },
  statusError: { color: '#c0392b' },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  actionsGridTablet: { gap: 16 },
  actionBtn: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#fffcf5',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e8e0d0',
  },
  actionBtnPrimary: { backgroundColor: '#8b6914', borderColor: '#8b6914' },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnIcon: { fontSize: 28, marginBottom: 6 },
  actionBtnLabel: { fontSize: 13, fontWeight: '600', color: '#3a2e1e', textAlign: 'center' },
  actionBtnLabelPrimary: { color: '#fff' },
  emptyNote: {
    textAlign: 'center',
    color: '#9e9087',
    fontSize: 14,
    marginTop: 20,
    fontStyle: 'italic',
  },
});
