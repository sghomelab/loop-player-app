import React from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  SafeAreaView, Alert,
} from 'react-native';
import { usePlayerStore } from '../store/playerStore';

// Synchronous mock for expo-document-picker — available immediately
let DocumentPicker = {
  getDocumentAsync: () => Promise.resolve({ canceled: true }),
};
try {
  const realDP = require('expo-document-picker');
  if (realDP && realDP.getDocumentAsync) {
    DocumentPicker = realDP;
  }
} catch (e) {
  // expo-document-picker not available in Expo Go — use mock
}

export default function LibraryScreen({ navigation }) {
  const { library, scanFiles, importFile, deleteFile } = usePlayerStore();

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

  const renderItem = ({ item: file }) => (
    <TouchableOpacity
      style={styles.fileRow}
      onPress={() => {
        usePlayerStore.setState({ selectedFile: file });
        navigation.navigate('Player');
      }}
    >
      <View style={styles.fileIcon}>
        <Text style={{ fontSize: 22 }}>🎵</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.fileMeta}>
            {file.savedLoops?.length > 0
              ? `${file.savedLoops.length} loop${file.savedLoops.length > 1 ? 's' : ''}  ·  `
              : ''}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => handleDelete(file)} style={{ padding: 8 }}>
        <Text style={{ color: '#F85149', fontSize: 18 }}>🗑️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Loop Player</Text>
        <TouchableOpacity onPress={handleImport} style={styles.importBtn}>
          <Text style={styles.importBtnText}>+ Import</Text>
        </TouchableOpacity>
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
  listContent: { paddingVertical: 8 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fileIcon: { width: 40, alignItems: 'center', marginRight: 10 },
  fileName: { fontSize: 16, color: '#F0F6FC', fontWeight: '500' },
  fileMeta: { fontSize: 13, color: '#8B949E' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#F0F6FC', marginTop: 12 },
  emptyDesc: { fontSize: 14, color: '#8B949E', textAlign: 'center', marginTop: 6, marginBottom: 20 },
  emptyImportBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#1F6FEB', borderRadius: 12, marginTop: 8 },
  emptyImportText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
