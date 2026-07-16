import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Slider, Alert, Modal, TextInput, PanResponder, Vibration,
} from 'react-native';
import { Svg, Rect } from 'react-native-svg';
import { usePlayerStore } from '../store/playerStore';
import { formatTime, defaultLoopName } from '../utils/formatTime';
import { fetchSurah, searchSurah } from '../utils/quranText';

const MILESTONES = [10, 25, 50, 100, 200, 500, 1000];
const LOOP_MAX_OPTIONS = [0, 5, 10, 20, 25, 50, 75, 100, 200, 500];

export default function PlayerScreen({ navigation }) {
  const { selectedFile } = usePlayerStore();

  const store = usePlayerStore();
  const {
    audioFile, isPlaying, currentTime, duration, playbackRate,
    loopRegion, loadFile, togglePlayPause, seekTo, setPlaybackRate,
    setLoopRegion, saveLoop, loadLoop: loadSavedLoop, deleteLoop,
    loopCounter, loopMax, milestone, setLoopMax, resetLoopCounter,
    saveSession,
    ayahMarkers, currentAyahIndex, setAyahMarkers, addAyahMarker,
    deleteAyahMarker, autoSplitAyahMarkers, surahData, setSurahData,
  } = store;

  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [showLoopsSheet, setShowLoopsSheet] = useState(false);
  const [showMaxSheet, setShowMaxSheet] = useState(false);
  const [showAyahSheet, setShowAyahSheet] = useState(false);
  const [showSurahSearch, setShowSurahSearch] = useState(false);
  const [newLoopName, setNewLoopName] = useState('');
  const [surahQuery, setSurahQuery] = useState('');
  const [surahResults, setSurahResults] = useState([]);
  const [surahLoading, setSurahLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    if (selectedFile) loadFile(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    if (showSaveSheet && audioFile) {
      setNewLoopName(defaultLoopName(audioFile.name, audioFile.savedLoops.length));
    }
  }, [showSaveSheet, audioFile]);

  useEffect(() => {
    if (milestone && MILESTONES.includes(milestone)) {
      Vibration.vibrate([0, 50, 50, 50]);
      showToast(`🎉 ${milestone} repeats!`);
    }
  }, [milestone]);

  useEffect(() => {
    if (!isPlaying) {
      saveSession();
    }
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      saveSession();
    };
  }, []);

  const showToast = (message) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(message);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 2500);
  };

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

  const handleSetLoopMax = (max) => {
    setLoopMax(max);
    resetLoopCounter();
    setShowMaxSheet(false);
    showToast(max > 0 ? `Stop after ${max} repeats` : 'No repeat limit');
  };

  const handleAddAyahMarker = () => {
    if (!surahData) {
      showToast('Select a surah first');
      return;
    }
    const ayahNum = Math.min(
      surahData.numberOfAyahs,
      Math.max(1, Math.floor((currentTime / duration) * surahData.numberOfAyahs) + 1)
    );
    addAyahMarker(currentTime, surahData.number, ayahNum, `Ayah ${ayahNum}`);
    showToast(`Marker: Ayah ${ayahNum}`);
  };

  const handleSeekToAyah = (marker) => {
    seekTo(marker.time);
  };

  const handleDeleteAyahMarker = (markerId) => {
    deleteAyahMarker(markerId);
  };

  const handleAutoSplit = async () => {
    if (!surahData) {
      showToast('Select a surah first');
      return;
    }
    autoSplitAyahMarkers(surahData.numberOfAyahs);
    showToast(`Split into ${surahData.numberOfAyahs} ayah markers`);
    setShowAyahSheet(false);
  };

  const handleSearchSurah = async () => {
    if (!surahQuery.trim()) {
      setSurahResults([]);
      return;
    }
    setSurahLoading(true);
    const results = await searchSurah(surahQuery.trim());
    setSurahResults(results);
    setSurahLoading(false);
  };

  const handleSelectSurah = async (surah) => {
    const data = await fetchSurah(surah.number);
    if (data) {
      setSurahData(data);
      setShowSurahSearch(false);
      setSurahQuery('');
      setSurahResults([]);
      showToast(`Loaded: ${data.englishName}`);
    }
  };

  const currentAyahMarker = currentAyahIndex >= 0 && ayahMarkers[currentAyahIndex]
    ? ayahMarkers[currentAyahIndex]
    : null;

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
      {/* Milestone toast */}
      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Text style={{ color: '#1F6FEB', fontSize: 16 }}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.trackName} numberOfLines={1}>{audioFile.name}</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Waveform with ayah markers */}
        {duration > 0 && (
          <View style={styles.waveformContainer}>
            <WaveformWithMarkers
              duration={duration}
              currentTime={currentTime}
              loopRegion={loopRegion}
              ayahMarkers={ayahMarkers}
              onSeek={seekTo}
            />
          </View>
        )}

        {/* Current ayah display */}
        {currentAyahMarker && (
          <View style={styles.currentAyahCard}>
            <Text style={styles.currentAyahLabel}>{currentAyahMarker.label}</Text>
            <Text style={styles.currentAyahTime}>{formatTime(currentAyahMarker.time)}</Text>
          </View>
        )}

        {/* Surah selector */}
        {surahData ? (
          <TouchableOpacity style={styles.surahChip} onPress={() => setShowSurahSearch(true)}>
            <Text style={styles.surahChipText}>📖 {surahData.englishName} ({surahData.numberOfAyahs} ayahs)</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.surahChip} onPress={() => setShowSurahSearch(true)}>
            <Text style={styles.surahChipText}>📖 Select Surah</Text>
          </TouchableOpacity>
        )}

        <View style={styles.progressContainer}>
          <LoopProgressTrack
            progress={duration > 0 ? currentTime / duration : 0}
            loopRegion={loopRegion}
            duration={duration}
            onSeek={seekTo}
          />
        </View>

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <Text style={styles.timeText}>−{formatTime(Math.max(0, duration - currentTime))}</Text>
        </View>

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

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionChip} onPress={() => setShowLoopsSheet(true)}>
            <Text style={styles.actionChipText}>
              📑 Saved ({audioFile?.savedLoops?.length || 0})
            </Text>
          </TouchableOpacity>
          {loopRegion?.enabled && loopRegion.pointB > loopRegion.pointA && (
            <TouchableOpacity style={[styles.actionChip, styles.saveChip]} onPress={() => setShowSaveSheet(true)}>
              <Text style={[styles.actionChipText, { color: '#1F6FEB' }]}>💾 Save Loop</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionChip} onPress={() => setShowAyahSheet(true)}>
            <Text style={styles.actionChipText}>
              📌 Ayah ({ayahMarkers.length})
            </Text>
          </TouchableOpacity>
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

            {/* Loop counter */}
            <View style={styles.counterRow}>
              <Text style={styles.counterLabel}>
                Repeat: <Text style={styles.counterValue}>{loopCounter}</Text>
                {loopMax > 0 ? ` / ${loopMax}` : ''}
              </Text>
              <TouchableOpacity onPress={() => setShowMaxSheet(true)} style={styles.counterBtn}>
                <Text style={styles.counterBtnText}>
                  {loopMax > 0 ? `Stop at ${loopMax}` : 'Set limit'}
                </Text>
              </TouchableOpacity>
            </View>
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
            <Text style={styles.modalTitle}>Saved Loops ({audioFile?.savedLoops?.length || 0})</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              {!(audioFile?.savedLoops?.length) ? (
                <Text style={{ color: '#8B949E', textAlign: 'center', padding: 20 }}>No saved loops yet</Text>
              ) : (
                (audioFile?.savedLoops || []).map(loop => (
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

      {/* Loop Max Modal */}
      <Modal visible={showMaxSheet} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Repeat Limit</Text>
            <Text style={{ fontSize: 13, color: '#8B949E', marginBottom: 12 }}>
              Auto-stop after this many repeats. Set to 0 for unlimited.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {LOOP_MAX_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionChip,
                    loopMax === opt && styles.optionChipActive,
                  ]}
                  onPress={() => handleSetLoopMax(opt)}
                >
                  <Text style={[
                    styles.optionChipText,
                    loopMax === opt && styles.optionChipTextActive,
                  ]}>
                    {opt === 0 ? '∞' : opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#21262D', marginTop: 16 }]} onPress={() => setShowMaxSheet(false)}>
              <Text style={{ color: '#F0F6FC' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Ayah Markers Modal */}
      <Modal visible={showAyahSheet} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Ayah Markers</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {surahData && (
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#1F6FEB' }]} onPress={handleAutoSplit}>
                  <Text style={{ color: '#fff' }}>Auto Split ({surahData.numberOfAyahs})</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#238636' }]} onPress={handleAddAyahMarker}>
                <Text style={{ color: '#fff' }}>+ Mark Here</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {ayahMarkers.length === 0 ? (
                <Text style={{ color: '#8B949E', textAlign: 'center', padding: 20 }}>
                  {surahData
                    ? 'Tap "Auto Split" to create markers for all ayahs, or "Mark Here" to add one manually.'
                    : 'Select a surah first, then create ayah markers.'}
                </Text>
              ) : (
                ayahMarkers.map((marker, idx) => (
                  <View key={marker.id} style={{
                    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
                    borderBottomWidth: 1, borderBottomColor: '#21262D',
                    backgroundColor: idx === currentAyahIndex ? 'rgba(31,111,235,0.1)' : 'transparent',
                  }}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => { handleSeekToAyah(marker); setShowAyahSheet(false); }}>
                      <Text style={{ color: '#F0F6FC', fontWeight: '500' }}>{marker.label}</Text>
                      <Text style={{ color: '#8B949E', fontSize: 12 }}>{formatTime(marker.time)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteAyahMarker(marker.id)} style={{ padding: 8 }}>
                      <Text style={{ color: '#F85149' }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#21262D', marginTop: 12 }]} onPress={() => setShowAyahSheet(false)}>
              <Text style={{ color: '#F0F6FC' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Surah Search Modal */}
      <Modal visible={showSurahSearch} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Surah</Text>
            <TextInput
              style={styles.input}
              placeholder="Search surah name..."
              value={surahQuery}
              onChangeText={(text) => { setSurahQuery(text); handleSearchSurah(); }}
              autoFocus
              returnKeyType="done"
            />
            <ScrollView style={{ maxHeight: 250, marginTop: 8 }}>
              {surahLoading && <Text style={{ color: '#8B949E', textAlign: 'center', padding: 12 }}>Searching...</Text>}
              {!surahLoading && surahResults.length === 0 && surahQuery.trim() && (
                <Text style={{ color: '#8B949E', textAlign: 'center', padding: 12 }}>No results</Text>
              )}
              {!surahLoading && surahResults.length === 0 && !surahQuery.trim() && (
                <Text style={{ color: '#8B949E', textAlign: 'center', padding: 12 }}>Type to search (e.g. "fatihah", "baqarah")</Text>
              )}
              {surahResults.map(surah => (
                <TouchableOpacity
                  key={surah.number}
                  style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#21262D' }}
                  onPress={() => handleSelectSurah(surah)}
                >
                  <Text style={{ color: '#F0F6FC', fontWeight: '500' }}>{surah.number}. {surah.englishName}</Text>
                  <Text style={{ color: '#8B949E', fontSize: 12 }}>{surah.name} · {surah.numberOfAyahs} ayahs</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#21262D', marginTop: 12 }]} onPress={() => setShowSurahSearch(false)}>
              <Text style={{ color: '#F0F6FC' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Waveform visualization with ayah markers
function WaveformWithMarkers({ duration, currentTime, loopRegion, ayahMarkers, onSeek }) {
  const barWidthRef = useRef(0);
  const numBars = 120;
  const barWidth = 2;
  const barGap = 1;
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState(0);

  const bars = useMemo(() => {
    const result = [];
    for (let i = 0; i < numBars; i++) {
      const segmentStart = (i / numBars) * duration;
      const segmentEnd = ((i + 1) / numBars) * duration;
      const inLoop = loopRegion?.enabled && segmentStart >= loopRegion.pointA && segmentEnd <= loopRegion.pointB;
      const hasAyah = ayahMarkers.some(m => Math.abs(m.time - segmentStart) < (duration / numBars));
      const progress = currentTime / duration;
      const filled = (i / numBars) <= progress;
      result.push({ key: i, inLoop, hasAyah, filled });
    }
    return result;
  }, [duration, currentTime, loopRegion, ayahMarkers]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setDragging(true);
        setDragPos(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        setDragPos(evt.nativeEvent.locationX);
      },
      onPanResponderRelease: (evt) => {
        setDragging(false);
        if (barWidthRef.current && duration > 0) {
          const p = Math.max(0, Math.min(1, evt.nativeEvent.locationX / barWidthRef.current));
          onSeek(p * duration);
        }
      },
    })
  ).current;

  const progress = dragging ? Math.max(0, Math.min(1, dragPos / (barWidthRef.current || 1))) : currentTime / duration;

  return (
    <View
      onLayout={(e) => { barWidthRef.current = e.nativeEvent.layout.width; }}
      {...panResponder.panHandlers}
      style={{ height: 40, justifyContent: 'center' }}
    >
      <Svg height={40} width={(numBars) * (barWidth + barGap)} style={{ flex: 1 }}>
        {bars.map((bar, i) => {
          const h = Math.random() * 20 + 8;
          const y = 20 - h / 2;
          let fill = '#21262D';
          if (bar.inLoop) fill = 'rgba(31,111,235,0.3)';
          if (bar.filled) fill = '#1F6FEB';
          if (bar.hasAyah) fill = '#D29922';
          return (
            <Rect
              key={bar.key}
              x={i * (barWidth + barGap)}
              y={y}
              width={barWidth}
              height={h}
              rx={1}
              fill={fill}
            />
          );
        })}
      </Svg>
    </View>
  );
}
function LoopProgressTrack({ progress, loopRegion, duration, onSeek }) {
  const [dragging, setDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(progress);
  const barWidthRef = useRef(0);

  useEffect(() => {
    if (!dragging) setDragProgress(progress);
  }, [progress, dragging]);

  const handleMove = useCallback((dx) => {
    if (duration <= 0 || !barWidthRef.current) return;
    const p = Math.max(0, Math.min(1, dx / barWidthRef.current));
    setDragProgress(p);
  }, [duration]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setDragging(true);
        const { locationX } = evt.nativeEvent;
        handleMove(locationX);
      },
      onPanResponderMove: (evt) => {
        const { locationX } = evt.nativeEvent;
        handleMove(locationX);
      },
      onPanResponderRelease: (evt) => {
        const { locationX } = evt.nativeEvent;
        handleMove(locationX);
        setDragging(false);
        if (duration > 0 && barWidthRef.current) {
          const p = Math.max(0, Math.min(1, locationX / barWidthRef.current));
          onSeek(p * duration);
        }
      },
    })
  ).current;

  const displayProgress = dragging ? dragProgress : progress;

  return (
    <View
      onLayout={(e) => { barWidthRef.current = e.nativeEvent.layout.width; }}
      {...panResponder.panHandlers}
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
      <View style={[styles.progressFill, { width: `${displayProgress * 100}%` }]} />
      {/* A marker */}
      {loopRegion?.enabled && duration > 0 && (
        <View style={[styles.marker, { left: (loopRegion.pointA / duration) * 100, backgroundColor: '#58A6FF' }]} />
      )}
      {/* B marker */}
      {loopRegion?.enabled && duration > 0 && (
        <View style={[styles.marker, { left: (loopRegion.pointB / duration) * 100, backgroundColor: '#D29922' }]} />
      )}
      {/* Thumb */}
      <View style={[styles.thumb, { left: `${displayProgress * 100}%` }]} />
    </View>
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
  // Toast
  toast: { position: 'absolute', top: 60, left: '10%', right: '10%', backgroundColor: '#161B22', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: '#30363D', zIndex: 999 },
  toastText: { fontSize: 16, color: '#F0F6FC', fontWeight: '600' },
  // Loop counter
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#21262D' },
  counterLabel: { fontSize: 13, color: '#8B949E' },
  counterValue: { fontSize: 13, color: '#F0F6FC', fontWeight: '700', fontFamily: 'monospace' },
  counterBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, backgroundColor: '#21262D' },
  counterBtnText: { fontSize: 12, color: '#58A6FF', fontWeight: '600' },
  // Option chips
  optionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#21262D' },
  optionChipActive: { backgroundColor: '#1F6FEB' },
  optionChipText: { fontSize: 14, color: '#F0F6FC', fontWeight: '600' },
  optionChipTextActive: { color: '#fff' },
  // Waveform
  waveformContainer: { paddingHorizontal: 20, marginVertical: 4 },
  // Current ayah
  currentAyahCard: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 6, marginBottom: 4 },
  currentAyahLabel: { fontSize: 13, color: '#D29922', fontWeight: '600' },
  currentAyahTime: { fontSize: 13, color: '#8B949E', fontFamily: 'monospace' },
  // Surah chip
  surahChip: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, backgroundColor: '#161B22', marginVertical: 6 },
  surahChipText: { fontSize: 13, color: '#58A6FF', fontWeight: '500' },
});
