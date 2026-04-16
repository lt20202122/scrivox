import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useAppStore, INK_COLOURS, InkColour, PaperStyle } from '../../store/useAppStore';

const PAPER_STYLES: { key: PaperStyle; label: string; icon: string }[] = [
  { key: 'blank', label: 'Blank', icon: '⬜' },
  { key: 'lined', label: 'Lined', icon: '📋' },
  { key: 'dotgrid', label: 'Dot Grid', icon: '⠿' },
  { key: 'parchment', label: 'Parchment', icon: '📜' },
];

export default function SettingsScreen() {
  const {
    inkColour,
    setInkColour,
    fontSize,
    setFontSize,
    paperStyle,
    setPaperStyle,
  } = useAppStore();
  const { width } = useWindowDimensions();
  const isTablet = width > 600;

  return (
    <View style={styles.container} accessibilityLabel="Settings screen">
      <View style={[styles.content, isTablet && styles.contentTablet]}>
        <Text style={styles.sectionTitle} accessibilityLabel="Ink colour section">
          Ink Colour
        </Text>
        <View style={styles.colourRow}>
          {INK_COLOURS.map(({ label, value }) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.colourSwatch,
                { backgroundColor: value },
                inkColour === value && styles.colourSwatchSelected,
              ]}
              onPress={() => setInkColour(value as InkColour)}
              accessibilityLabel={`Set ink colour to ${label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: inkColour === value }}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle} accessibilityLabel="Font size section">
          Font Size: {fontSize}pt
        </Text>
        <View style={styles.sizeRow}>
          <TouchableOpacity
            style={[styles.sizeButton, fontSize <= 16 && styles.sizeButtonDisabled]}
            onPress={() => fontSize > 16 && setFontSize(fontSize - 2)}
            accessibilityLabel="Decrease font size"
            accessibilityRole="button"
            disabled={fontSize <= 16}
          >
            <Text style={styles.sizeButtonText}>−</Text>
          </TouchableOpacity>
          <Text
            style={[styles.fontPreviewText, { fontFamily: 'Caveat-Regular', fontSize }]}
            accessibilityLabel={`Current font size ${fontSize} points preview`}
          >
            Aa
          </Text>
          <TouchableOpacity
            style={[styles.sizeButton, fontSize >= 48 && styles.sizeButtonDisabled]}
            onPress={() => fontSize < 48 && setFontSize(fontSize + 2)}
            accessibilityLabel="Increase font size"
            accessibilityRole="button"
            disabled={fontSize >= 48}
          >
            <Text style={styles.sizeButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle} accessibilityLabel="Paper style section">
          Paper Style
        </Text>
        <View style={[styles.paperRow, isTablet && styles.paperRowTablet]}>
          {PAPER_STYLES.map(({ key, label, icon }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.paperCard,
                paperStyle === key && styles.paperCardSelected,
              ]}
              onPress={() => setPaperStyle(key)}
              accessibilityLabel={`Set paper style to ${label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: paperStyle === key }}
            >
              <Text style={styles.paperIcon}>{icon}</Text>
              <Text
                style={[
                  styles.paperLabel,
                  paperStyle === key && styles.paperLabelSelected,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  content: { padding: 24 },
  contentTablet: { paddingHorizontal: 64 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3a2e1e',
    marginBottom: 14,
    marginTop: 24,
  },
  colourRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginBottom: 8 },
  colourSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colourSwatchSelected: {
    borderColor: '#8b6914',
    borderWidth: 3,
    transform: [{ scale: 1.15 }],
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 8,
  },
  sizeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8b6914',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeButtonDisabled: { backgroundColor: '#d4c9b8' },
  sizeButtonText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },
  fontPreviewText: { color: '#3a2e1e', minWidth: 60, textAlign: 'center' },
  paperRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paperRowTablet: { gap: 16 },
  paperCard: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fffcf5',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e8e0d0',
    alignItems: 'center',
    minWidth: 80,
  },
  paperCardSelected: { borderColor: '#8b6914', backgroundColor: '#fff8e7' },
  paperIcon: { fontSize: 22, marginBottom: 4 },
  paperLabel: { fontSize: 13, color: '#7a6a52', fontWeight: '500' },
  paperLabelSelected: { color: '#8b6914', fontWeight: '700' },
});
