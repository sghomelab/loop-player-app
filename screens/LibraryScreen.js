import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  SafeAreaView, Alert, Modal, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/playerStore';
import { formatTime } from '../utils/formatTime';
import { getTheme, COLOR_SCHEMES } from '../lib/theme';

let DocumentPicker = {
  getDocumentAsync: () => Promise.resolve({ canceled: true }),
};
try {
  const realDP = require('expo-document-picker');
  if (realDP && realDP.getDocumentAsync) {
    DocumentPicker = realDP;
  }
} catch {}

export default function LibraryScreen({ navigation }) {
  const { library, scanFiles, importFile, deleteFile, sessionHistory, totalRepeats, totalPlayTime, colorScheme, customAccent } = usePlayerStore();
  const theme = getTheme(colorScheme, customAccent);
  const s = makeStyles(theme);
  const [showHistory, setShowHistory] = useState(false);
  const [showFileLoops, setShowFileLoops] = useState(null);

  React.useEffect(() => { scanFiles(); }, []);

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
               'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/ogg',
               'audio/*'],
        copyToCacheDirectory: false,
        multiple: false,
      });
      if (!result.canceled && result.assets?.[0]) {
        await importFile(result.assets[0].uri);
      }
    } catch (e) {
      console.error('import error:', e);
    }
  };

  const handleDelete = (file) => {
    Alert.alert('Delete File', `Delete "${file.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteFile(file) },
    ]);
  };

  const handleOpenFile = (file) => {
    usePlayerStore.setState({ selectedFile: file });
    navigation.navigate('Player');
  };

  const handleOpenLoop = (file, loop) => {
    usePlayerStore.setState({ selectedFile: file });
    usePlayerStore.getState().loadLoop(loop);
    navigation.navigate('Player');
  };

  const totalLoops = library?.reduce((sum, f) => sum + (f.savedLoops?.length || 0), 0) || 0;

  const renderItem = ({ item: file }) => (
    <TouchableOpacity
      style={[s.fileRow, { backgroundColor: theme.card }]}
      onPress={() => handleOpenFile(file)}
    >
      <View style={s.fileIcon}>
        <MaterialCommunityIcons name="music-note" size={24} color={theme.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.fileName, { color: theme.text }]} numberOfLines={1}>{file.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <Text style={[s.fileMeta, { color: theme.muted }]}>
            {file.savedLoops?.length > 0
              ? `${file.savedLoops.length} loop${file.savedLoops.length > 1 ? 's' : ''}`
              : 'No loops'}
          </Text>
          {file.ayahMarkers?.length > 0 && (
            <>
              <Text style={[s.fileMeta, { color: theme.muted }]}>·</Text>
              <Text style={[s.fileMeta, { color: theme.muted }]}>{file.ayahMarkers.length} ayah markers</Text>
            </>
          )}
        </View>
        {file.savedLoops?.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6, gap: 6 }}>
            {file.savedLoops.map(loop => (
              <TouchableOpacity
                key={loop.id}
                style={[s.loopChip, { backgroundColor: theme.accent + '20' }]}
                onPress={(e) => { e.stopPropagation(); handleOpenLoop(file, loop); }}
              >
                <Text style={[s.loopChipText, { color: theme.accent }]}>{loop.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
      <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDelete(file); }} style={{ padding: 8 }}>
        <MaterialCommunityIcons name="delete-outline" size={20} color="#F85149" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
      <View style={[s.header, { borderBottomColor: theme.divider }]}>
        <Text style={[s.title, { color: theme.text }]}>Loop Player</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => setShowHistory(true)} style={[s.iconBtn, { backgroundColor: theme.divider }]}>
            <MaterialCommunityIcons name="history" size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={[s.iconBtn, { backgroundColor: theme.divider }]}>
            <MaterialCommunityIcons name="cog-outline" size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleImport} style={[s.importBtn, { backgroundColor: theme.accent }]}>
            <MaterialCommunityIcons name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats bar */}
      <View style={[s.statsBar, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
        <View style={s.statItem}>
          <Text style={[s.statValue, { color: theme.accent }]}>{library?.length || 0}</Text>
          <Text style={[s.statLabel, { color: theme.muted }]}>Files</Text>
        </View>
        <View style={[s.statDivider, { backgroundColor: theme.divider }]} />
        <View style={s.statItem}>
          <Text style={[s.statValue, { color: theme.accent }]}>{totalLoops}</Text>
          <Text style={[s.statLabel, { color: theme.muted }]}>Loops</Text>
        </View>
        <View style={[s.statDivider, { backgroundColor: theme.divider }]} />
        <View style={s.statItem}>
          <Text style={[s.statValue, { color: theme.accent }]}>{totalRepeats || 0}</Text>
          <Text style={[s.statLabel, { color: theme.muted }]}>Repeats</Text>
        </View>
        <View style={[s.statDivider, { backgroundColor: theme.divider }]} />
        <View style={s.statItem}>
          <Text style={[s.statValue, { color: theme.accent }]}>{totalPlayTime > 0 ? formatTime(totalPlayTime) : '0:00'}</Text>
          <Text style={[s.statLabel, { color: theme.muted }]}>Play Time</Text>
        </View>
      </View>

      {library?.length === 0 ? (
        <View style={s.emptyState}>
          <View style={[s.emptyIcon, { backgroundColor: theme.accent + '15' }]}>
            <MaterialCommunityIcons name="music-note-off" size={48} color={theme.accent} />
          </View>
          <Text style={[s.emptyTitle, { color: theme.text }]}>No audio files</Text>
          <Text style={[s.emptyDesc, { color: theme.muted }]}>Import audio files to start looping</Text>
          <TouchableOpacity style={[s.emptyImportBtn, { backgroundColor: theme.accent }]} onPress={handleImport}>
            <MaterialCommunityIcons name="plus" size={18} color="#fff" />
            <Text style={s.emptyImportText}>Import Files</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={library}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.divider, marginHorizontal: 16 }} />}
        />
      )}

      {/* Session History Modal */}
      <Modal visible={showHistory} transparent animationType="fade">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowHistory(false)}>
          <View style={[s.modalContent, { maxHeight: '80%', backgroundColor: theme.card }]} onStartShouldSetResponder={() => true}>
            <Text style={[s.modalTitle, { color: theme.text }]}>Session History</Text>
            <View style={s.statsRow}>
              <View style={[s.statsCard, { backgroundColor: theme.bg }]}>
                <Text style={[s.statsCardValue, { color: theme.accent }]}>{totalRepeats || 0}</Text>
                <Text style={[s.statsCardLabel, { color: theme.muted }]}>Total Repeats</Text>
              </View>
              <View style={[s.statsCard, { backgroundColor: theme.bg }]}>
                <Text style={[s.statsCardValue, { color: theme.accent }]}>{totalPlayTime > 0 ? formatTime(totalPlayTime) : '0:00'}</Text>
                <Text style={[s.statsCardLabel, { color: theme.muted }]}>Play Time</Text>
              </View>
            </View>
            <ScrollView style={{ maxHeight: 350, marginTop: 12 }}>
              {sessionHistory?.length === 0 ? (
                <Text style={{ color: theme.muted, textAlign: 'center', padding: 20 }}>No sessions yet</Text>
              ) : (
                sessionHistory?.map((session, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.divider }}>
                    <View>
                      <Text style={{ color: theme.text, fontWeight: '500' }}>{session.fileName}</Text>
                      <Text style={{ color: theme.muted, fontSize: 12 }}>
                        {new Date(session.timestamp).toLocaleTimeString()} · {session.repeats || 0} repeats
                      </Text>
                    </View>
                    <Text style={{ color: theme.muted, fontSize: 12, fontFamily: 'monospace' }}>
                      {formatTime(session.currentTime)}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.divider, marginTop: 12 }]} onPress={() => setShowHistory(false)}>
              <Text style={{ color: theme.text }}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    title: { fontSize: 22, fontWeight: '700' },
    iconBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
    importBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
    statsBar: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 1,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 16, fontWeight: '700', fontFamily: 'monospace' },
    statLabel: { fontSize: 10, marginTop: 2 },
    statDivider: { width: 1, height: 24 },
    listContent: { paddingVertical: 8 },
    fileRow: {
      flexDirection: 'row', alignItems: 'flex-start',
      paddingHorizontal: 16, paddingVertical: 14,
    },
    fileIcon: { width: 40, alignItems: 'center', marginRight: 10, paddingTop: 2 },
    fileName: { fontSize: 16, fontWeight: '500' },
    fileMeta: { fontSize: 12 },
    loopChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    loopChipText: { fontSize: 11, fontWeight: '500' },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 12 },
    emptyDesc: { fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 20 },
    emptyImportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
    emptyImportText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', borderRadius: 16, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
    modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    statsRow: { flexDirection: 'row', gap: 12 },
    statsCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
    statsCardValue: { fontSize: 20, fontWeight: '700', fontFamily: 'monospace' },
    statsCardLabel: { fontSize: 11, marginTop: 4 },
  });
}

const styles = makeStyles(COLOR_SCHEMES.dark);