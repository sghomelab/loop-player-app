import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Modal, Switch, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/playerStore';
import { COLOR_SCHEMES, getTheme } from '../lib/theme';

const SCHEME_KEYS = Object.keys(COLOR_SCHEMES);

const SKIP_OPTIONS = [3, 5, 10, 15, 30];

const PALETTE = [
  '#FF0000', '#FF4500', '#FF8C00', '#FFD700',
  '#00FF00', '#00CED1', '#00BFFF', '#1E90FF',
  '#8A2BE2', '#FF69B4', '#FF1493', '#C0C0C0',
];

export default function SettingsScreen({ navigation }) {
  const { quranSurahEnabled, setQuranSurahEnabled, colorScheme, setColorScheme, customAccent, setCustomAccent, skipSeconds, setSkipSeconds } = usePlayerStore();
  const [showPicker, setShowPicker] = useState(false);

  const currentTheme = getTheme(colorScheme, customAccent);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.bg }]}>
      <View style={[styles.header, { borderBottomColor: currentTheme.divider }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={currentTheme.accent} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: currentTheme.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ padding: 16 }}>
        {/* Color Scheme */}
        <Text style={[styles.sectionTitle, { color: currentTheme.muted }]}>Color Scheme</Text>
        <View style={styles.schemeGrid}>
          {SCHEME_KEYS.map(key => {
            const scheme = COLOR_SCHEMES[key];
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.schemeCard,
                  { backgroundColor: scheme.bg, borderColor: scheme.accent },
                  colorScheme === key && styles.schemeCardActive,
                ]}
                onPress={() => setColorScheme(key)}
              >
                <View style={[styles.schemeSwatch, { backgroundColor: scheme.accent }]} />
                <Text style={{ color: scheme.text, fontSize: 13, fontWeight: '500' }}>{scheme.label}</Text>
                {colorScheme === key && (
                  <Text style={{ color: scheme.accent, fontSize: 11, marginTop: 2 }}>Active</Text>
                )}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[
              styles.schemeCard,
              { backgroundColor: currentTheme.card, borderColor: currentTheme.accent },
              colorScheme === 'custom' && styles.schemeCardActive,
            ]}
            onPress={() => setShowPicker(true)}
          >
            <View style={[styles.schemeSwatch, { backgroundColor: customAccent }]} />
            <Text style={{ color: currentTheme.text, fontSize: 13, fontWeight: '500' }}>Custom</Text>
            {colorScheme === 'custom' && (
              <Text style={{ color: currentTheme.accent, fontSize: 11, marginTop: 2 }}>Active</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Features */}
        <Text style={[styles.sectionTitle, { color: currentTheme.muted, marginTop: 24 }]}>Features</Text>
        <View style={[styles.settingRow, { backgroundColor: currentTheme.card }]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="book-open-variant" size={18} color={currentTheme.accent} />
              <Text style={[styles.settingLabel, { color: currentTheme.text }]}>Quran Surah</Text>
            </View>
            <Text style={[styles.settingDesc, { color: currentTheme.muted }]}>Surah search and ayah markers</Text>
          </View>
          <Switch
            value={quranSurahEnabled}
            onValueChange={(v) => setQuranSurahEnabled(v)}
            trackColor={{ false: currentTheme.divider, true: currentTheme.accent }}
            thumbColor="#fff"
          />
        </View>

        {/* Playback */}
        <Text style={[styles.sectionTitle, { color: currentTheme.muted, marginTop: 24 }]}>Playback</Text>
        <View style={[styles.settingRow, { backgroundColor: currentTheme.card, flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialCommunityIcons name="skip-next" size={18} color={currentTheme.accent} />
            <Text style={[styles.settingLabel, { color: currentTheme.text }]}>Skip Amount</Text>
          </View>
          <Text style={[styles.settingDesc, { color: currentTheme.muted, marginBottom: 12 }]}>
            How many seconds the back/forward buttons jump. Currently {skipSeconds}s.
          </Text>
          <View style={styles.skipRow}>
            {SKIP_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.skipChip,
                  { backgroundColor: skipSeconds === opt ? currentTheme.accent : currentTheme.divider },
                ]}
                onPress={() => setSkipSeconds(opt)}
              >
                <Text style={{ color: skipSeconds === opt ? '#fff' : currentTheme.text, fontSize: 14, fontWeight: '600', fontFamily: 'monospace' }}>
                  {opt}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Color Picker Modal */}
      <Modal visible={showPicker} transparent animationType="fade">
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={[styles.pickerContent, { backgroundColor: currentTheme.card }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.pickerTitle, { color: currentTheme.text }]}>Pick Accent Color</Text>
            <View style={styles.paletteGrid}>
              {PALETTE.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.paletteSwatch,
                    { backgroundColor: color },
                    customAccent === color && styles.paletteSwatchActive,
                  ]}
                  onPress={() => { setCustomAccent(color); setColorScheme('custom'); setShowPicker(false); }}
                >
                  {customAccent === color && <Text style={styles.paletteCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.pickerBtn, { backgroundColor: currentTheme.divider, marginTop: 12 }]}
              onPress={() => setShowPicker(false)}
            >
              <Text style={{ color: currentTheme.text }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
  },
  settingLabel: { fontSize: 15, fontWeight: '600' },
  settingDesc: { fontSize: 12, marginTop: 2 },
  skipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skipChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  schemeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  schemeCard: {
    width: '47%',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderStyle: 'solid',
  },
  schemeCardActive: { borderWidth: 2 },
  schemeSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 8,
  },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' },
  pickerContent: { borderRadius: 16, padding: 20, marginHorizontal: 20, width: '90%', alignSelf: 'center' },
  pickerTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  paletteSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paletteSwatchActive: { borderWidth: 3, borderColor: '#fff' },
  paletteCheck: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  pickerBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});