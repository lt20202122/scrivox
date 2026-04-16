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
import Animated, { FadeIn } from 'react-native-reanimated';
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

interface WordProps {
  word: string;
  fontFamily: string;
  fontSize: number;
  inkColour: string;
}

function AnimatedWord({ word, fontFamily, fontSize, inkColour }: WordProps) {
  return (
    <Animated.Text
      entering={FadeIn.duration(300)}
      style={[styles.wordText, { fontFamily, fontSize, color: inkColour }]}
      accessibilityLabel={word}
    >
      {word}{' '}
    </Animated.Text>
  );
}

interface LinedPaperProps {
  height: number;
  lineSpacing: number;
}

function LinedPaper({ height, lineSpacing }: LinedPaperProps) {
  const lines = Math.ceil(height / lineSpacing);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: lines }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.paperLine,
            { top: lineSpacing * (i + 1) },
          ]}
        />
      ))}
    </View>
  );
}

function DotGrid({ height, width }: { height: number; width: number }) {
  const spacing = 24;
  const rows = Math.ceil(height / spacing);
  const cols = Math.ceil(width / spacing);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <View
            key={`${r}-${c}`}
            style={[styles.dot, { top: r * spacing + 12, left: c * spacing + 12 }]}
          />
        ))
      )}
    </View>
  );
}

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
    setTranscribedText,
    setPartialText,
    setIsRecording,
    appendText,
    clearText,
  } = useAppStore();

  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  // A4 at 96dpi: 794×1123px; keep exact aspect ratio, fit to screen
  const a4Scale = notebookMode ? Math.min(1, (width - 32) / 595) : 1;
  const canvasHeight = notebookMode ? Math.round(842 * a4Scale) : undefined;
  const canvasWidth = notebookMode ? Math.round(595 * a4Scale) : undefined;
  const notebookLineSpacing = 32 * a4Scale;

  const startRecording = useCallback(async () => {
    if (!Voice) return;
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
  const bgColour = PAPER_BACKGROUNDS[paperStyle];

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
        />
      )}
      {paperStyle === 'dotgrid' && (
        <DotGrid
          height={canvasHeight ?? 1200}
          width={canvasWidth ?? width - 32}
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
              inkColour={inkColour}
            />
          ))}
          {partialText ? (
            <Text
              style={[
                styles.partialText,
                { fontFamily: selectedFont, fontSize, color: inkColour },
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
                { fontFamily: selectedFont, fontSize },
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
    <View style={styles.container}>
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

      <View style={styles.toolbar}>
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
    backgroundColor: 'rgba(180,160,120,0.3)',
  },
  dot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(180,160,120,0.35)',
  },
  textContainer: { flex: 1 },
  textWrapper: { flexWrap: 'wrap', flexDirection: 'row' },
  wordText: { lineHeight: 44 },
  partialText: { opacity: 0.45, lineHeight: 44 },
  placeholder: { color: '#c4b89a', lineHeight: 44 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F5F0E8',
    borderTopWidth: 1,
    borderTopColor: '#d4c9b8',
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
