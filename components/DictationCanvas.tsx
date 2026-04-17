import { useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAppStore, PaperStyle } from '../store/useAppStore';

let Voice: typeof import('@react-native-voice/voice').default | null = null;
try {
  Voice = require('@react-native-voice/voice').default;
} catch {
  // Voice not available in this environment
}

const PAPER_BACKGROUNDS: Record<PaperStyle, string> = {
  blank: '#ffffff',
  lined: '#F5F0E8',
  dotgrid: '#fafaf8',
  parchment: '#F5F0E8',
};

const DARK_BG = '#1a1e2e';
const DARK_LINE_COLOUR = 'rgba(255,255,255,0.08)';
const DARK_DOT_COLOUR = 'rgba(255,255,255,0.1)';
const DARK_DEFAULT_INK = '#e8dfc8';

interface WordProps {
  word: string;
  fontFamily: string;
  fontSize: number;
  inkColour: string;
}

function AnimatedWord({ word, fontFamily, fontSize, inkColour }: WordProps) {
  // Stable per-word random values for organic handwriting feel
  const rotation = (Math.random() - 0.5) * 3.5;    // -1.75° to +1.75°
  const translateY = (Math.random() - 0.5) * 2.5;  // -1.25 to +1.25px
  const scale = 0.97 + Math.random() * 0.06;        // 0.97 to 1.03

  return (
    <Animated.Text
      entering={FadeInDown.duration(250).springify()}
      style={[
        styles.wordText,
        {
          fontFamily,
          fontSize,
          color: inkColour,
          transform: [{ rotate: `${rotation}deg` }, { translateY }, { scale }],
        },
      ]}
      accessibilityLabel={word}
    >
      {word}{' '}
    </Animated.Text>
  );
}

interface LinedPaperProps {
  height: number;
  lineSpacing: number;
  lineColour?: string;
}

function LinedPaper({ height, lineSpacing, lineColour = 'rgba(180,160,120,0.3)' }: LinedPaperProps) {
  const lines = Math.ceil(height / lineSpacing);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: lines }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.paperLine,
            { top: lineSpacing * (i + 1), backgroundColor: lineColour },
          ]}
        />
      ))}
    </View>
  );
}

function DotGrid({
  height,
  width,
  dotColour = 'rgba(180,160,120,0.35)',
}: {
  height: number;
  width: number;
  dotColour?: string;
}) {
  const spacing = 24;
  const rows = Math.ceil(height / spacing);
  const cols = Math.ceil(width / spacing);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <View
            key={`${r}-${c}`}
            style={[styles.dot, { top: r * spacing + 12, left: c * spacing + 12, backgroundColor: dotColour }]}
          />
        )),
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// WaveformBars — animated bars shown while recording
// ---------------------------------------------------------------------------
function WaveformBars({ isRecording }: { isRecording: boolean }) {
  const bar0 = useSharedValue(0.3);
  const bar1 = useSharedValue(0.6);
  const bar2 = useSharedValue(0.4);
  const bars = [bar0, bar1, bar2];

  useEffect(() => {
    if (!isRecording) {
      bar0.value = withSpring(0.3);
      bar1.value = withSpring(0.3);
      bar2.value = withSpring(0.3);
      return;
    }
    const intervals = bars.map((bar, i) =>
      setInterval(() => {
        bar.value = withSpring(0.2 + Math.random() * 0.8);
      }, 150 + i * 50),
    );
    return () => intervals.forEach(clearInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  const style0 = useAnimatedStyle(() => ({ height: bar0.value * 24, backgroundColor: '#8b6914' }));
  const style1 = useAnimatedStyle(() => ({ height: bar1.value * 24, backgroundColor: '#8b6914' }));
  const style2 = useAnimatedStyle(() => ({ height: bar2.value * 24, backgroundColor: '#8b6914' }));
  const barStyles = [style0, style1, style2];

  return (
    <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center', height: 24 }}>
      {barStyles.map((style, i) => (
        <Animated.View key={i} style={[{ width: 3, borderRadius: 2 }, style]} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface Props {
  notebookMode?: boolean;
  scrollable?: boolean;
  onExport?: () => void;
}

export default function DictationCanvas({ notebookMode = false, scrollable = true, onExport }: Props) {
  const {
    selectedFont,
    inkColour,
    fontSize,
    paperStyle,
    transcribedText,
    partialText,
    isRecording,
    darkMode,
    setTranscribedText,
    setPartialText,
    setIsRecording,
    appendText,
    clearText,
  } = useAppStore();

  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const a4Scale = notebookMode ? Math.min(1, (width - 32) / 595) : 1;
  const canvasHeight = notebookMode ? Math.round(842 * a4Scale) : undefined;
  const canvasWidth = notebookMode ? Math.round(595 * a4Scale) : undefined;
  const notebookLineSpacing = 32 * a4Scale;

  // Resolve colours for dark mode
  const resolvedInk = darkMode && inkColour === '#1a1a1a' ? DARK_DEFAULT_INK : inkColour;
  const bgColour = darkMode ? DARK_BG : PAPER_BACKGROUNDS[paperStyle];
  const lineColour = darkMode ? DARK_LINE_COLOUR : 'rgba(180,160,120,0.3)';
  const dotColour = darkMode ? DARK_DOT_COLOUR : 'rgba(180,160,120,0.35)';
  const toolbarBg = darkMode ? '#111520' : '#F5F0E8';
  const toolbarBorder = darkMode ? '#2a2e3e' : '#d4c9b8';

  const startRecording = useCallback(async () => {
    if (!Voice) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch { /* haptics unavailable */ }
    try {
      await Voice.start('en-US');
      setIsRecording(true);
    } catch {
      // Voice start failed
    }
  }, [setIsRecording]);

  const stopRecording = useCallback(async () => {
    if (!Voice) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { /* haptics unavailable */ }
    try {
      await Voice.stop();
      setIsRecording(false);
    } catch {
      setIsRecording(false);
    }
  }, [setIsRecording]);

  useEffect(() => {
    if (!Voice) return;

    Voice.onSpeechResults = (e) => {
      const results = e.value;
      if (results && results.length > 0) {
        appendText(results[0]);
        setPartialText('');
      }
    };

    Voice.onSpeechPartialResults = (e) => {
      const results = e.value;
      if (results && results.length > 0) {
        setPartialText(results[0]);
      }
    };

    Voice.onSpeechError = () => {
      setIsRecording(false);
      setPartialText('');
    };

    Voice.onSpeechEnd = () => {
      setIsRecording(false);
    };

    return () => {
      if (Voice) {
        Voice.destroy().then(() => Voice?.removeAllListeners());
      }
    };
  }, [appendText, setPartialText, setIsRecording]);

  const words = transcribedText ? transcribedText.split(/\s+/).filter(Boolean) : [];

  const canvasContent = (
    <View
      style={[
        styles.canvas,
        {
          backgroundColor: bgColour,
          minHeight: canvasHeight ?? 400,
          width: canvasWidth,
        },
      ]}
    >
      {paperStyle === 'lined' && (
        <LinedPaper
          height={canvasHeight ?? 1200}
          lineSpacing={notebookMode ? notebookLineSpacing : fontSize * 1.8}
          lineColour={lineColour}
        />
      )}
      {paperStyle === 'dotgrid' && (
        <DotGrid
          height={canvasHeight ?? 1200}
          width={canvasWidth ?? width - 32}
          dotColour={dotColour}
        />
      )}

      <View style={styles.textContainer}>
        <Text style={styles.textWrapper} accessibilityLabel="Transcribed handwriting text">
          {words.map((word, i) => (
            <AnimatedWord
              key={`${word}-${i}`}
              word={word}
              fontFamily={selectedFont}
              fontSize={fontSize}
              inkColour={resolvedInk}
            />
          ))}
          {partialText ? (
            <Text
              style={[
                styles.partialText,
                { fontFamily: selectedFont, fontSize, color: resolvedInk },
              ]}
              accessibilityLabel="Partial speech recognition result"
            >
              {partialText}
            </Text>
          ) : null}
          {words.length === 0 && !partialText && (
            <Text
              style={[
                styles.placeholder,
                { fontFamily: selectedFont, fontSize, color: darkMode ? '#6a7080' : '#c4b89a' },
              ]}
              accessibilityLabel="Tap the microphone button to start dictating"
            >
              Tap the mic to start dictating…
            </Text>
          )}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, darkMode && { backgroundColor: DARK_BG }]}>
      {scrollable ? (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {canvasContent}
        </ScrollView>
      ) : (
        canvasContent
      )}

      <View style={[styles.toolbar, { backgroundColor: toolbarBg, borderTopColor: toolbarBorder }]}>
        {isRecording && <WaveformBars isRecording={isRecording} />}
        {onExport && (
          <TouchableOpacity
            style={styles.exportButton}
            onPress={onExport}
            accessibilityLabel="Export document"
            accessibilityRole="button"
          >
            <Text style={styles.exportButtonText}>Export</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.clearButton}
          onPress={clearText}
          accessibilityLabel="Clear all text"
          accessibilityRole="button"
        >
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonActive]}
          onPress={isRecording ? stopRecording : startRecording}
          accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
          accessibilityRole="button"
        >
          <Text style={styles.micIcon}>{isRecording ? '⏹' : '🎙️'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  canvas: {
    borderRadius: 4,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 400,
    position: 'relative',
    overflow: 'hidden',
  },
  paperLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 1,
  },
  dot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  textContainer: { flex: 1 },
  textWrapper: { flexWrap: 'wrap', flexDirection: 'row' },
  wordText: { lineHeight: 44 },
  partialText: { opacity: 0.45, lineHeight: 44 },
  placeholder: { lineHeight: 44 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  exportButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#3a7a3a',
    borderRadius: 20,
  },
  exportButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  clearButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#e8e0d0',
    borderRadius: 20,
  },
  clearButtonText: { color: '#5c4a1e', fontWeight: '600', fontSize: 14 },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8b6914',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  micButtonActive: { backgroundColor: '#c0392b' },
  micIcon: { fontSize: 28 },
});
