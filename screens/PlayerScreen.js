import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Slider, Alert, Modal, TextInput,
} from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { formatTime, defaultLoopName } from '../utils/formatTime';

export default function PlayerScreen({ navigation }) {
  const { selectedFile } = usePlayerStore();

  const store = usePlayerStore();
  const {
    audioFile, isPlaying, currentTime, duration, playbackRate,
    loopRegion, loadFile, togglePlayPause, seekTo, setPlaybackRate,
    setLoopRegion, saveLoop, loadLoop: loadSavedLoop, deleteLoop,
  } = store;

  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [showLoopsSheet, setShowLoopsSheet] = useState(false);
  const [newLoopName, setNewLoopName] = useState('');

  useEffect(() => {
    if (selectedFile) loadFile(selectedFile);
  }, [selectedFile]);

  // Update default name when save sheet opens
  useEffect(() => {
    if (showSaveSheet && audioFile) {
      setNewLoopName(defaultLoopName(audioFile.name, audioFile.savedLoops.length));
    }
  }, [showSaveSheet, audioFile]);

  const handleSetA = () => {
    const newRegion = loopRegion
      ? { ...loopRegion, pointA: currentTime }
      : { pointA: currentTime, pointB: duration, delay: 0, enabled: true };
    setLoopRegion(newRegion);
  };

  const handleSetB = () => {
    const newRegion = loopRegion
      ? { ...loopRegion, pointB: currentTime }
      : { pointA: 0, pointB: currentTime, delay: 0, enabled: true };
    setLoopRegion(newRegion);
  };

  const handleToggleLoop = () => {
    if (!loopRegion) {
      setLoopRegion({ pointA: 0, pointB: duration, delay: 0, enabled: true });
    } else {
      setLoopRegion({ ...loopRegion, enabled: !loopRegion.enabled });
    }
  };

  const handleSaveLoop = () => {
    if (!loopRegion || !newLoopName.trim()) return;
    saveLoop(newLoopName.trim(), loopRegion.pointA, loopRegion.pointB, loopRegion.delay);
    setShowSaveSheet(false);
  };

  const handlePlaySavedLoop = (loop) => {
    loadSavedLoop(loop);
    setShowLoopsSheet(false);
    togglePlayPause();
  };

  const handleDeleteSavedLoop = (loopId) => {
    deleteLoop(loopId);
  };

  if (!audioFile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={{ color: '#8B949E' }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Text style={{ color: '#1F6FEB', fontSize: 16 }}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.trackName} numberOfLines={1}>{audioFile.name}</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <LoopProgressTrack
            progress={duration > 0 ? currentTime / duration : 0}
            loopRegion={loopRegion}
            duration={duration}
            onSeek={seekTo}
          />
        </View>

        {/* Time display */}
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <Text style={styles.timeText}>−{formatTime(Math.max(0, duration - currentTime))}</Text>
        </View>

        {/* Transport controls */}
        <View style={styles.transportRow}>
          <TouchableOpacity onPress={handleSetA} style={styles.controlBtn}>
            <Text style={[styles.controlIcon, { color: loopRegion?.pointA > 0 ? '#58A6FF' : '#484F58' }]}>
              {loopRegion?.pointA > 0 ? '🚩' : '🏳️'}
            </Text>
            <Text style={styles.controlLabel}>A</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => seekTo(Math.max(0, currentTime - 10))} style={styles.controlBtn}>
            <Text style={styles.controlIcon}>⏪</Text>
            <Text style={styles.controlLabel}>-10s</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlayPause} style={styles.playBtn}>
            <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶️'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => seekTo(Math.min(duration, currentTime + 10))} style={styles.controlBtn}>
            <Text style={styles.controlIcon}>⏩</Text>
            <Text style={styles.controlLabel}>+10s</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSetB} style={styles.controlBtn}>
            <Text style={[styles.controlIcon, { color: '#D29922' }]}>🚩</Text>
            <Text style={styles.controlLabel}>B</Text>
          </TouchableOpacity>
        </View>

        {/* Saved loops & save buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionChip} onPress={() => setShowLoopsSheet(true)}>
            <Text style={styles.actionChipText}>
              📑 Saved ({audioFile.savedLoops.length})
            </Text>
          </TouchableOpacity>
          {loopRegion?.enabled && loopRegion.pointB > loopRegion.pointA && (
            <TouchableOpacity style={[styles.actionChip, styles.saveChip]} onPress={() => setShowSaveSheet(true)}>
              <Text style={[styles.actionChipText, { color: '#1F6FEB' }]}>💾 Save Loop</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Speed slider */}
        <View style={styles.speedSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 13, color: '#8B949E' }}>Speed</Text>
            <Text style={{ fontSize: 16, color: '#1F6FEB', fontWeight: '600', fontFamily: 'monospace' }}>
              {playbackRate.toFixed(2)}x
            </Text>
          </View>
          <Slider
            value={playbackRate}
            onValueChange={setPlaybackRate}
            minimumValue={0.25}
            maximumValue={4.0}
            minimumTrackTintColor="#1F6FEB"
            maximumTrackTintColor="#30363D"
            thumbTintColor="#1F6FEB"
            step={0.05}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {['0.25x', '1.0x', '2.0x', '4.0x'].map(l => (
              <Text key={l} style={{ fontSize: 11, color: '#484F58' }}>{l}</Text>
            ))}
          </View>
        </View>

        {/* Active loop info */}
        {loopRegion?.enabled && (
          <View style={styles.loopInfoCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: '#1F6FEB', fontWeight: '600' }}>
                🔄 Loop Active
              </Text>
              <TouchableOpacity onPress={handleToggleLoop}>
                <Text style={{ color: '#8B949E', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 11, color: '#58A6FF' }}>A</Text>
                <Text style={[styles.loopTime, { color: '#58A6FF' }]}>{formatTime(loopRegion.pointA)}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 11, color: '#8B949E', textAlign: 'center' }}>Delay</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => setLoopRegion({ ...loopRegion, delay: Math.max(0, loopRegion.delay - 0.5) })}>
                    <Text style={{ color: '#1F6FEB', fontSize: 16, fontWeight: 'bold' }}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.loopTime}>{loopRegion.delay.toFixed(1)}s</Text>
                  <TouchableOpacity onPress={() => setLoopRegion({ ...loopRegion, delay: Math.min(5, loopRegion.delay + 0.5) })}>
                    <Text style={{ color: '#1F6FEB', fontSize: 16, fontWeight: 'bold' }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11, color: '#D29922' }}>B</Text>
                <Text style={[styles.loopTime, { color: '#D29922' }]}>{formatTime(loopRegion.pointB)}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: '#484F58', marginTop: 6, textAlign: 'center' }}>
              {(loopRegion.pointB - loopRegion.pointA).toFixed(1)}s{loopRegion.delay > 0 ? ` + ${loopRegion.delay.toFixed(1)}s pause` : ''}
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Save Loop Modal */}
      <Modal visible={showSaveSheet} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save Loop</Text>
            <Text style={{ fontSize: 13, color: '#8B949E', marginBottom: 8 }}>
              {formatTime(loopRegion?.pointA || 0)} → {formatTime(loopRegion?.pointB || 0)}
              {'\n'}{(loopRegion?.pointB - loopRegion?.pointA).toFixed(1)}s
              {loopRegion?.delay > 0 ? ` + ${loopRegion.delay.toFixed(1)}s delay` : ''}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Loop name"
              value={newLoopName}
              onChangeText={setNewLoopName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveLoop}
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#21262D' }]} onPress={() => setShowSaveSheet(false)}>
                <Text style={{ color: '#F0F6FC' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#1F6FEB' }]} onPress={handleSaveLoop}>
                <Text style={{ color: '#fff' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Saved Loops Modal */}
      <Modal visible={showLoopsSheet} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <Text style={styles.modalTitle}>Saved Loops ({audioFile.savedLoops.length})</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              {audioFile.savedLoops.length === 0 ? (
                <Text style={{ color: '#8B949E', textAlign: 'center', padding: 20 }}>No saved loops yet</Text>
              ) : (
                audioFile.savedLoops.map(loop => (
                  <View key={loop.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#21262D' }}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => handlePlaySavedLoop(loop)}>
                      <Text style={{ color: '#F0F6FC', fontWeight: '500' }}>{loop.name}</Text>
                      <Text style={{ color: '#8B949E', fontSize: 12 }}>
                        {formatTime(loop.pointA)} → {formatTime(loop.pointB)}
                        {loop.delay > 0 ? ` (+${loop.delay.toFixed(1)}s)` : ''}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteSavedLoop(loop.id)} style={{ padding: 8 }}>
                      <Text style={{ color: '#F85149' }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#21262D', marginTop: 12 }]} onPress={() => setShowLoopsSheet(false)}>
              <Text style={{ color: '#F0F6FC' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Progress bar with loop region highlight
function LoopProgressTrack({ progress, loopRegion, duration, onSeek }) {
  const [dragging, setDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(progress);

  useEffect(() => {
    if (!dragging) setDragProgress(progress);
  }, [progress, dragging]);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={() => setDragging(true)}
      onPressOut={() => {
        setDragging(false);
        onSeek(dragProgress * duration);
      }}
      style={styles.progressBar}
    >
      {/* Background */}
      <View style={styles.progressBg} />
      {/* Loop highlight */}
      {loopRegion?.enabled && loopRegion.pointB > loopRegion.pointA && duration > 0 && (
        <View
          style={[
            styles.loopHighlight,
            {
              left: (loopRegion.pointA / duration) * 100,
              width: ((loopRegion.pointB - loopRegion.pointA) / duration) * 100,
            },
          ]}
        />
      )}
      {/* Progress fill */}
      <View style={[styles.progressFill, { width: `${(dragging ? dragProgress : progress) * 100}%` }]} />
      {/* A marker */}
      {loopRegion?.enabled && duration > 0 && (
        <View style={[styles.marker, { left: (loopRegion.pointA / duration) * 100, backgroundColor: '#58A6FF' }]} />
      )}
      {/* B marker */}
      {loopRegion?.enabled && duration > 0 && (
        <View style={[styles.marker, { left: (loopRegion.pointB / duration) * 100, backgroundColor: '#D29922' }]} />
      )}
      {/* Thumb */}
      <View style={[styles.thumb, { left: `${((dragging ? dragProgress : progress) * 100)}%` }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  trackName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#F0F6FC', textAlign: 'center', marginHorizontal: 12 },
  scrollContent: { paddingBottom: 30 },
  progressContainer: { paddingHorizontal: 20, marginVertical: 8 },
  progressBar: { height: 32, justifyContent: 'center', position: 'relative' },
  progressBg: { position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, backgroundColor: '#21262D' },
  progressFill: { position: 'absolute', left: 0, height: 6, borderRadius: 3, backgroundColor: '#1F6FEB' },
  loopHighlight: { position: 'absolute', height: 6, borderRadius: 3, backgroundColor: 'rgba(31,111,235,0.25)' },
  marker: { position: 'absolute', width: 10, height: 10, borderRadius: 5, top: 6, marginLeft: -5 },
  thumb: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#F0F6FC', shadowColor: '#000', shadowRadius: 3, marginLeft: -9, top: 2 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 12 },
  timeText: { fontSize: 14, color: '#8B949E', fontFamily: 'monospace' },
  transportRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 12 },
  controlBtn: { alignItems: 'center', padding: 8 },
  controlIcon: { fontSize: 24 },
  controlLabel: { fontSize: 10, color: '#8B949E', marginTop: 2 },
  playBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1F6FEB', alignItems: 'center', justifyContent: 'center' },
  playIcon: { fontSize: 32 },
  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingHorizontal: 20, marginVertical: 8 },
  actionChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: '#161B22' },
  saveChip: { backgroundColor: 'rgba(31,111,235,0.15)' },
  actionChipText: { fontSize: 13, color: '#F0F6FC' },
  speedSection: { paddingHorizontal: 32, marginVertical: 16 },
  loopInfoCard: { marginHorizontal: 20, marginVertical: 12, padding: 14, backgroundColor: '#161B22', borderRadius: 12 },
  loopTime: { fontSize: 15, fontFamily: 'monospace', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#161B22', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#F0F6FC', marginBottom: 12 },
  input: { height: 44, borderWidth: 1, borderColor: '#30363D', borderRadius: 8, paddingHorizontal: 12, color: '#F0F6FC', fontSize: 16 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
});
