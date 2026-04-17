import { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  ListRenderItemInfo,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore, FONT_LABELS, PRESET_FONT_KEYS, FontKey } from '../../store/useAppStore';
import { loadPersistedFonts, deleteFont } from '../../services/fontStorage';
import { CustomFont } from '../../services/fontStorage';

const SAMPLE = 'The quick brown fox';

interface FontCardProps {
  fontKey: FontKey;
  label: string;
  selected: boolean;
  onSelect: (key: FontKey) => void;
  onLongPress?: () => void;
  cardWidth: number;
  isCustom?: boolean;
}

function FontCard({ fontKey, label, selected, onSelect, onLongPress, cardWidth, isCustom }: FontCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }, selected && styles.cardSelected]}
      onPress={() => onSelect(fontKey)}
      onLongPress={onLongPress}
      accessibilityLabel={`Select font ${label}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {isCustom && <Text style={styles.customBadge}>Custom</Text>}
      <Text style={[styles.sampleText, { fontFamily: fontKey }]}>{SAMPLE}</Text>
      <Text style={[styles.fontName, selected && styles.fontNameSelected]}>{label}</Text>
      {selected && <Text style={styles.checkmark} accessibilityLabel="Selected">✓</Text>}
    </TouchableOpacity>
  );
}

type ListItem =
  | { type: 'header'; id: string; title: string; showAdd?: boolean }
  | { type: 'font'; id: string; fontKey: FontKey; label: string; isCustom: boolean };

export default function FontsScreen() {
  const { selectedFont, setSelectedFont, customFonts, setCustomFonts, removeCustomFont } = useAppStore();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const numCols = width > 600 ? 2 : 1;
  const cardWidth = (width - 48 - (numCols - 1) * 12) / numCols;

  useEffect(() => {
    loadPersistedFonts().then(setCustomFonts);
  }, [setCustomFonts]);

  function confirmDelete(font: CustomFont) {
    Alert.alert(
      'Delete font',
      `Remove "${font.label}" from your fonts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteFont(font.key);
            removeCustomFont(font.key);
          },
        },
      ],
    );
  }

  // Build flat list data
  const data: ListItem[] = [];

  if (customFonts.length > 0 || true) {
    data.push({ type: 'header', id: 'my-fonts-header', title: 'My Fonts', showAdd: true });
    for (const cf of customFonts) {
      data.push({ type: 'font', id: cf.key, fontKey: cf.key, label: cf.label, isCustom: true });
    }
    if (customFonts.length === 0) {
      data.push({ type: 'header', id: 'my-fonts-empty', title: 'Tap + to import a .ttf font' });
    }
  }

  data.push({ type: 'header', id: 'preset-header', title: 'Preset Fonts' });
  for (const key of PRESET_FONT_KEYS) {
    data.push({ type: 'font', id: key, fontKey: key, label: FONT_LABELS[key] ?? key, isCustom: false });
  }

  function renderItem({ item }: ListRenderItemInfo<ListItem>) {
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
          {item.showAdd ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/font-workshop')}
              accessibilityLabel="Import new font"
              accessibilityRole="button"
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }

    return (
      <FontCard
        fontKey={item.fontKey}
        label={item.label}
        selected={selectedFont === item.fontKey}
        onSelect={setSelectedFont}
        onLongPress={item.isCustom ? () => {
          const cf = customFonts.find((f) => f.key === item.fontKey);
          if (cf) confirmDelete(cf);
        } : undefined}
        cardWidth={cardWidth}
        isCustom={item.isCustom}
      />
    );
  }

  return (
    <View style={styles.container} accessibilityLabel="Font gallery screen">
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        numColumns={1}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
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
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3a2e1e',
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8b6914',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8b6914',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },
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
  customBadge: {
    position: 'absolute',
    top: 10,
    left: 16,
    fontSize: 10,
    fontWeight: '700',
    color: '#8b6914',
    backgroundColor: '#fff8e7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
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
