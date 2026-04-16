import { View, Text, TouchableOpacity, FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { useAppStore, FONT_LABELS, FontKey } from '../../store/useAppStore';

const SAMPLE = 'The quick brown fox';
const FONT_KEYS = Object.keys(FONT_LABELS) as FontKey[];

interface FontCardProps {
  fontKey: FontKey;
  selected: boolean;
  onSelect: (key: FontKey) => void;
  cardWidth: number;
}

function FontCard({ fontKey, selected, onSelect, cardWidth }: FontCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }, selected && styles.cardSelected]}
      onPress={() => onSelect(fontKey)}
      accessibilityLabel={`Select font ${FONT_LABELS[fontKey]}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.sampleText, { fontFamily: fontKey }]}>{SAMPLE}</Text>
      <Text style={[styles.fontName, selected && styles.fontNameSelected]}>
        {FONT_LABELS[fontKey]}
      </Text>
      {selected && <Text style={styles.checkmark} accessibilityLabel="Selected">✓</Text>}
    </TouchableOpacity>
  );
}

export default function FontsScreen() {
  const { selectedFont, setSelectedFont } = useAppStore();
  const { width } = useWindowDimensions();
  const numCols = width > 600 ? 2 : 1;
  const cardWidth = (width - 48 - (numCols - 1) * 12) / numCols;

  return (
    <View style={styles.container} accessibilityLabel="Font gallery screen">
      <FlatList
        data={FONT_KEYS}
        keyExtractor={(item) => item}
        numColumns={numCols}
        key={numCols}
        contentContainerStyle={styles.list}
        columnWrapperStyle={numCols > 1 ? styles.row : undefined}
        renderItem={({ item }) => (
          <FontCard
            fontKey={item}
            selected={selectedFont === item}
            onSelect={setSelectedFont}
            cardWidth={cardWidth}
          />
        )}
        ListHeaderComponent={
          <Text style={styles.header} accessibilityLabel="Choose your handwriting font">
            Choose Your Font
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },
  list: { padding: 24 },
  row: { gap: 12, marginBottom: 12 },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3a2e1e',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fffcf5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e8e0d0',
    position: 'relative',
  },
  cardSelected: { borderColor: '#8b6914', backgroundColor: '#fff8e7' },
  sampleText: {
    fontSize: 26,
    color: '#3a2e1e',
    marginBottom: 8,
    lineHeight: 36,
  },
  fontName: { fontSize: 13, color: '#9e9087', fontWeight: '500' },
  fontNameSelected: { color: '#8b6914', fontWeight: '700' },
  checkmark: {
    position: 'absolute',
    top: 12,
    right: 16,
    fontSize: 20,
    color: '#8b6914',
  },
});
