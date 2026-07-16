import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  SafeAreaView, Alert, Modal, ScrollView,
} from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { formatTime } from '../utils/formatTime';

let DocumentPicker = {
  getDocumentAsync: () => Promise.resolve({ canceled: true }),
};
try {
  const realDP = require('expo-document-picker');
  if (realDP && realDP.getDocumentAsync) {
    DocumentPicker = realDP;
  }
} catch (e) {}

export default function LibraryScreen({ navigation }) {
  const { library, scanFiles, importFile, deleteFile, sessionHistory, totalRepeats, totalPlayTime } = usePlayerStore();
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
      Alert.alert('Not Available', 'File import requires a production build.\n\nUse EAS Build to test this feature.');
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
      style={styles.fileRow}
      onPress={() => handleOpenFile(file)}
    >
      <View style={styles.fileIcon}>
        <Text style={{ fontSize: 22 }}>🎵</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <Text style={styles.fileMeta}>
            {file.savedLoops?.length > 0
              ? `${file.savedLoops.length} loop${file.savedLoops.length > 1 ? 's' : ''}`
              : 'No loops'}
          </Text>
          {file.ayahMarkers?.length > 0 && (
            <>
              <Text style={styles.fileMeta}>·</Text>
              <Text style={styles.fileMeta}>{file.ayahMarkers.length} ayah markers</Text>
            </>
          )}
        </View>
        {file.savedLoops?.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6, gap: 6 }}>
            {file.savedLoops.map(loop => (
              <TouchableOpacity
                key={loop.id}
                style={styles.loopChip}
                onPress={(e) => { e.stopPropagation(); handleOpenLoop(file, loop); }}
              >
                <Text style={styles.loopChipText}>{loop.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
      <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDelete(file); }} style={{ padding: 8 }}>
        <Text style={{ color: '#F85149', fontSize: 18 }}>🗑️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Loop Player</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.historyBtn}>
            <Text style={styles.historyBtnText}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleImport} style={styles.importBtn}>
            <Text style={styles.importBtnText}>+ Import</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{library?.length || 0}</Text>
          <Text style={styles.statLabel}>Files</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalLoops}</Text>
          <Text style={styles.statLabel}>Loops</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalRepeats || 0}</Text>
          <Text style={styles.statLabel}>Repeats</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalPlayTime > 0 ? formatTime(totalPlayTime) : '0:00'}</Text>
          <Text style={styles.statLabel}>Play Time</Text>
        </View>
      </View>

      {library?.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 56 }}>🎵</Text>
          <Text style={styles.emptyTitle}>No audio files</Text>
          <Text style={styles.emptyDesc}>Import audio files from your device to start looping</Text>
          <TouchableOpacity style={styles.emptyImportBtn} onPress={handleImport}>
            <Text style={styles.emptyImportText}>Import Files</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={library}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#21262D', marginHorizontal: 16 }} />}
        />
      )}

      {/* Session History Modal */}
      <Modal visible={showHistory} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Session History</Text>
            <View style={styles.statsRow}>
              <View style={styles.statsCard}>
                <Text style={styles.statsCardValue}>{totalRepeats || 0}</Text>
                <Text style={styles.statsCardLabel}>Total Repeats</Text>
              </View>
              <View style={styles.statsCard}>
                <Text style={styles.statsCardValue}>{totalPlayTime > 0 ? formatTime(totalPlayTime) : '0:00'}</Text>
                <Text style={styles.statsCardLabel}>Total Play Time</Text>
              </View>
            </View>
            <ScrollView style={{ maxHeight: 350, marginTop: 12 }}>
              {sessionHistory?.length === 0 ? (
                <Text style={{ color: '#8B949E', textAlign: 'center', padding: 20 }}>No sessions yet</Text>
              ) : (
                sessionHistory?.map((session, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#21262D' }}>
                    <View>
                      <Text style={{ color: '#F0F6FC', fontWeight: '500' }}>{session.fileName}</Text>
                      <Text style={{ color: '#8B949E', fontSize: 12 }}>
                        {new Date(session.timestamp).toLocaleTimeString()} · {session.repeats || 0} repeats
                      </Text>
                    </View>
                    <Text style={{ color: '#484F58', fontSize: 12, fontFamily: 'monospace' }}>
                      {formatTime(session.currentTime)}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#21262D', marginTop: 12 }]} onPress={() => setShowHistory(false)}>
              <Text style={{ color: '#F0F6FC' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#F0F6FC' },
  importBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#1F6FEB', borderRadius: 8 },
  importBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  historyBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#21262D', borderRadius: 8 },
  historyBtnText: { fontSize: 16 },
  statsBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#21262D',
    backgroundColor: '#161B22',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#F0F6FC', fontFamily: 'monospace' },
  statLabel: { fontSize: 10, color: '#8B949E', marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: '#30363D' },
  listContent: { paddingVertical: 8 },
  fileRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  fileIcon: { width: 40, alignItems: 'center', marginRight: 10, paddingTop: 2 },
  fileName: { fontSize: 16, color: '#F0F6FC', fontWeight: '500' },
  fileMeta: { fontSize: 12, color: '#8B949E' },
  loopChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(31,111,235,0.15)' },
  loopChipText: { fontSize: 11, color: '#58A6FF', fontWeight: '500' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#F0F6FC', marginTop: 12 },
  emptyDesc: { fontSize: 14, color: '#8B949E', textAlign: 'center', marginTop: 6, marginBottom: 20 },
  emptyImportBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#1F6FEB', borderRadius: 12, marginTop: 8 },
  emptyImportText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: '#161B22', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#F0F6FC', marginBottom: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statsCard: { flex: 1, backgroundColor: '#0D1117', borderRadius: 12, padding: 14, alignItems: 'center' },
  statsCardValue: { fontSize: 20, fontWeight: '700', color: '#1F6FEB', fontFamily: 'monospace' },
  statsCardLabel: { fontSize: 11, color: '#8B949E', marginTop: 4 },
});