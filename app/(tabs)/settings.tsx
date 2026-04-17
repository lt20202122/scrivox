import { View, Text, TouchableOpacity, Switch, StyleSheet, useWindowDimensions } from 'react-native';
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
    darkMode,
    toggleDarkMode,
  } = useAppStore();
  const { width } = useWindowDimensions();
  const isTablet = width > 600;

  const bg = darkMode ? '#1a1e2e' : '#F5F0E8';
  const text = darkMode ? '#e8dfc8' : '#3a2e1e';
  const sectionText = darkMode ? '#a09880' : '#8b6914';
  const cardBg = darkMode ? '#252a3a' : '#fffcf5';
  const cardBorder = darkMode ? '#3a3e50' : '#e8e0d0';
  const cardSelectedBg = darkMode ? '#2e3248' : '#fff8e7';
  const cardSelectedBorder = darkMode ? '#8b6914' : '#8b6914';

  return (
    <View style={[styles.container, { backgroundColor: bg }]} accessibilityLabel="Settings screen">
      <View style={[styles.content, isTablet && styles.contentTablet]}>

        {/* Dark Mode */}
        <Text style={[styles.sectionTitle, { color: sectionText }]}>Appearance</Text>
        <View style={[styles.toggleRow, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.toggleLabel, { color: text }]}>Dark Mode (Chalkboard)</Text>
          <Switch
            value={darkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: '#d4c9b8', true: '#8b6914' }}
            thumbColor={darkMode ? '#fff8e7' : '#fff'}
            accessibilityLabel="Toggle dark mode"
          />
        </View>

        {/* Ink Colour */}
        <Text style={[styles.sectionTitle, { color: sectionText }]} accessibilityLabel="Ink colour section">
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

        {/* Font Size */}
        <Text style={[styles.sectionTitle, { color: sectionText }]} accessibilityLabel="Font size section">
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
            style={[styles.fontPreviewText, { fontFamily: 'Caveat-Regular', fontSize, color: text }]}
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

        {/* Paper Style */}
        <Text style={[styles.sectionTitle, { color: sectionText }]} accessibilityLabel="Paper style section">
          Paper Style
        </Text>
        <View style={[styles.paperRow, isTablet && styles.paperRowTablet]}>
          {PAPER_STYLES.map(({ key, label, icon }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.paperCard,
                { backgroundColor: cardBg, borderColor: cardBorder },
                paperStyle === key && { backgroundColor: cardSelectedBg, borderColor: cardSelectedBorder },
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
                  { color: darkMode ? '#8a7a62' : '#7a6a52' },
                  paperStyle === key && { color: '#8b6914', fontWeight: '700' },
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
  container: { flex: 1 },
  content: { padding: 24 },
  contentTablet: { paddingHorizontal: 64 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
    marginTop: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 4,
  },
  toggleLabel: { fontSize: 15, fontWeight: '500' },
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
  fontPreviewText: { minWidth: 60, textAlign: 'center' },
  paperRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paperRowTablet: { gap: 16 },
  paperCard: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    minWidth: 80,
  },
  paperIcon: { fontSize: 22, marginBottom: 4 },
  paperLabel: { fontSize: 13, fontWeight: '500' },
});
