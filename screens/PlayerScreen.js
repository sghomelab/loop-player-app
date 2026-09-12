import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Modal, TextInput, Vibration,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Svg, Rect } from 'react-native-svg';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/playerStore';
import { formatTime, defaultLoopName, parseTime } from '../utils/formatTime';
import { fetchSurah, searchSurah } from '../utils/quranText';
import { COLOR_SCHEMES, getTheme } from '../lib/theme';
import { PanResponder } from 'react-native';

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
    quranSurahEnabled, colorScheme, customAccent, skipSeconds,
    loadError,
  } = store;
  const theme = getTheme(colorScheme, customAccent);
  const s = makeStyles(theme);

  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [showLoopsSheet, setShowLoopsSheet] = useState(false);
  const [showMaxSheet, setShowMaxSheet] = useState(false);
  const [showAyahSheet, setShowAyahSheet] = useState(false);
  const [showSurahSearch, setShowSurahSearch] = useState(false);
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [timeA, setTimeA] = useState('');
  const [timeB, setTimeB] = useState('');
  const [timeError, setTimeError] = useState(null);
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
      showToast(`${milestone} repeats!`);
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
    toastTimeoutRef.current = setTimeout(() => setToast(null), 2000);
  };

  const handleSetA = () => {
    const newRegion = loopRegion
      ? { ...loopRegion, pointA: currentTime }
      : { pointA: currentTime, pointB: null, delay: 0, enabled: false };
    setLoopRegion(newRegion);
    showToast(`A: ${formatTime(currentTime)}`);
  };

  const handleSetB = () => {
    const newRegion = loopRegion
      ? { ...loopRegion, pointB: currentTime, enabled: loopRegion.pointA != null && loopRegion.pointA < currentTime }
      : { pointA: null, pointB: currentTime, delay: 0, enabled: false };
    setLoopRegion(newRegion);
    showToast(`B: ${formatTime(currentTime)}`);
  };

  const handleOpenTimeInput = () => {
    setTimeA(loopRegion?.pointA != null ? formatTime(loopRegion.pointA) : '');
    setTimeB(loopRegion?.pointB != null ? formatTime(loopRegion.pointB) : '');
    setTimeError(null);
    setShowTimeInput(true);
  };

  const handleApplyTime = () => {
    const a = timeA.trim() === '' ? null : parseTime(timeA);
    const b = timeB.trim() === '' ? null : parseTime(timeB);
    if (timeA.trim() !== '' && a === null) { setTimeError('Invalid time for A'); return; }
    if (timeB.trim() !== '' && b === null) { setTimeError('Invalid time for B'); return; }
    if (a !== null && a < 0) { setTimeError('Time A must be 0 or greater'); return; }
    if (b !== null && b < 0) { setTimeError('Time B must be 0 or greater'); return; }
    if (a !== null && b !== null && a >= b) { setTimeError('A must be before B'); return; }
    if (a !== null && duration > 0 && a > duration) { setTimeError('A is beyond track length'); return; }
    if (b !== null && duration > 0 && b > duration) { setTimeError('B is beyond track length'); return; }
    const next = loopRegion ? { ...loopRegion } : { delay: 0, enabled: false };
    if (a !== null) next.pointA = a;
    if (b !== null) next.pointB = b;
    if (a !== null && b !== null) next.enabled = true;
    setLoopRegion(next);
    setShowTimeInput(false);
    showToast('Loop time updated');
  };

  const handleResetA = () => {
    if (loopRegion) {
      setLoopRegion({ ...loopRegion, pointA: 0 });
      showToast('A reset to 0');
    }
  };

  const handleResetB = () => {
    if (loopRegion) {
      setLoopRegion({ ...loopRegion, pointB: duration });
      showToast('B reset to end');
    }
  };

  const handleToggleLoop = () => {
    if (!loopRegion) {
      setLoopRegion({ pointA: 0, pointB: duration, delay: 0, enabled: true });
      showToast('Loop enabled');
    } else {
      const newState = !loopRegion.enabled;
      setLoopRegion({ ...loopRegion, enabled: newState });
      showToast(newState ? 'Loop enabled' : 'Loop disabled');
    }
  };

  const handleJumpLoopStart = () => {
    const hasLoop = loopRegion?.pointA != null;
    const target = hasLoop ? loopRegion.pointA : 0;
    seekTo(target);
    showToast(hasLoop ? `Loop start: ${formatTime(target)}` : 'Jumped to start');
  };

  const handleJumpLoopEnd = () => {
    const hasLoop = loopRegion?.pointB != null;
    const target = hasLoop ? loopRegion.pointB : duration;
    seekTo(target);
    showToast(hasLoop ? `Loop end: ${formatTime(target)}` : 'Jumped to end');
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
      <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
        <View style={s.center}>
          {loadError ? (
            <>
              <Text style={{ color: '#F85149', fontWeight: '600', marginBottom: 8 }}>Failed to load audio</Text>
              <Text style={{ color: theme.muted, paddingHorizontal: 24, textAlign: 'center' }}>{loadError}</Text>
            </>
          ) : (
            <Text style={{ color: theme.muted }}>Loading...</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const loopActive = loopRegion?.enabled && loopRegion.pointA != null && loopRegion.pointB != null;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
      {/* Toast */}
      {toast && (
        <View style={s.toast}>
          <Text style={s.toastText}>{toast}</Text>
        </View>
      )}

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{audioFile.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Waveform */}
        {duration > 0 && (
          <View style={s.waveformContainer}>
            <WaveformWithMarkers
              duration={duration}
              currentTime={currentTime}
              loopRegion={loopRegion}
              ayahMarkers={ayahMarkers}
              onSeek={seekTo}
              theme={theme}
              s={s}
            />
          </View>
        )}

        {/* Current ayah */}
        {quranSurahEnabled && currentAyahMarker && (
          <View style={s.ayahCard}>
            <MaterialCommunityIcons name="bookmark" size={14} color="#D29922" />
            <Text style={s.ayahLabel}>{currentAyahMarker.label}</Text>
            <Text style={s.ayahTime}>{formatTime(currentAyahMarker.time)}</Text>
          </View>
        )}

        {/* Surah chip */}
        {quranSurahEnabled && (
          surahData ? (
            <TouchableOpacity style={s.surahChip} onPress={() => setShowSurahSearch(true)}>
              <MaterialCommunityIcons name="book-open-variant" size={15} color={theme.accent} />
              <Text style={s.surahChipText}>{surahData.englishName} ({surahData.numberOfAyahs})</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.surahChip} onPress={() => setShowSurahSearch(true)}>
              <MaterialCommunityIcons name="book-open-variant-outline" size={15} color={theme.muted} />
              <Text style={[s.surahChipText, { color: theme.muted }]}>Select Surah</Text>
            </TouchableOpacity>
          )
        )}

        {/* A/B / Loop row */}
        <View style={s.loopControlRow}>
          <TouchableOpacity onPress={handleSetA} style={[s.pillBtn, loopRegion?.pointA != null && s.pillBtnActive]}>
            <MaterialCommunityIcons
              name={loopRegion?.pointA != null ? 'flag-checkered' : 'flag-outline'}
              size={16}
              color={loopRegion?.pointA != null ? '#58A6FF' : theme.muted}
            />
            <Text style={[s.pillText, loopRegion?.pointA != null && { color: '#58A6FF' }]}>
              {loopRegion?.pointA != null ? formatTime(loopRegion.pointA) : 'Set A'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleToggleLoop} style={[s.pillBtn, loopActive && s.pillBtnLoopActive]}>
            <MaterialCommunityIcons
              name={loopActive ? 'loop' : 'loop-off'}
              size={16}
              color={loopActive ? theme.accent : theme.muted}
            />
            <Text style={[s.pillText, loopActive && { color: theme.accent }]}>
              {loopActive ? 'On' : 'Loop'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSetB} style={[s.pillBtn, loopRegion?.pointB != null && s.pillBtnActive]}>
            <MaterialCommunityIcons
              name={loopRegion?.pointB != null ? 'flag-checkered' : 'flag-outline'}
              size={16}
              color={loopRegion?.pointB != null ? '#D29922' : theme.muted}
            />
            <Text style={[s.pillText, loopRegion?.pointB != null && { color: '#D29922' }]}>
              {loopRegion?.pointB != null ? formatTime(loopRegion.pointB) : 'Set B'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleOpenTimeInput} style={s.pillBtn}>
            <MaterialCommunityIcons name="clock-edit-outline" size={16} color={theme.accent} />
            <Text style={[s.pillText, { color: theme.accent }]}>Time</Text>
          </TouchableOpacity>
        </View>

        {/* Action chips */}
        <View style={s.actionRow}>
          <TouchableOpacity style={[s.actionChip, { backgroundColor: theme.card }]} onPress={() => setShowLoopsSheet(true)}>
            <MaterialCommunityIcons name="playlist-play" size={16} color={theme.text} />
            <Text style={[s.actionChipText, { color: theme.text }]}>
              Saved ({audioFile?.savedLoops?.length || 0})
            </Text>
          </TouchableOpacity>
          {loopActive && loopRegion.pointB > loopRegion.pointA && (
            <TouchableOpacity style={[s.actionChip, { backgroundColor: theme.card }]} onPress={() => setShowSaveSheet(true)}>
              <MaterialCommunityIcons name="content-save" size={16} color={theme.accent} />
              <Text style={[s.actionChipText, { color: theme.accent }]}>Save</Text>
            </TouchableOpacity>
          )}
          {quranSurahEnabled && (
            <TouchableOpacity style={[s.actionChip, { backgroundColor: theme.card }]} onPress={() => setShowAyahSheet(true)}>
              <MaterialCommunityIcons name="bookmark" size={16} color={theme.text} />
              <Text style={[s.actionChipText, { color: theme.text }]}>Ayah ({ayahMarkers.length})</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Speed */}
        <View style={s.speedSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 13, color: theme.muted }}>Speed</Text>
            <Text style={{ fontSize: 15, color: theme.accent, fontWeight: '600', fontFamily: 'monospace' }}>
              {playbackRate.toFixed(2)}x
            </Text>
          </View>
          <Slider
            value={playbackRate}
            onValueChange={setPlaybackRate}
            minimumValue={0.25}
            maximumValue={4.0}
            minimumTrackTintColor={theme.accent}
            maximumTrackTintColor={theme.divider}
            thumbTintColor={theme.accent}
            step={0.05}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {['0.25x', '1.0x', '2.0x', '4.0x'].map(l => (
              <Text key={l} style={{ fontSize: 11, color: theme.muted }}>{l}</Text>
            ))}
          </View>
        </View>

        {/* Loop info card */}
        {loopActive && (
          <View style={[s.loopInfoCard, { backgroundColor: theme.card }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: theme.accent, fontWeight: '600' }}>
                Loop Active
              </Text>
              <TouchableOpacity onPress={handleToggleLoop}>
                <MaterialCommunityIcons name="close-circle" size={20} color={theme.muted} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity onPress={handleResetA} style={{ minWidth: 80 }}>
                <Text style={{ fontSize: 11, color: '#58A6FF' }}>A</Text>
                <Text style={[s.loopTime, { color: '#58A6FF' }]}>{formatTime(loopRegion.pointA)}</Text>
              </TouchableOpacity>
              <View>
                <Text style={{ fontSize: 11, color: theme.muted, textAlign: 'center' }}>Delay</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => setLoopRegion({ ...loopRegion, delay: Math.max(0, loopRegion.delay - 0.5) })}>
                    <Text style={{ color: theme.accent, fontSize: 16, fontWeight: 'bold' }}>−</Text>
                  </TouchableOpacity>
                  <Text style={[s.loopTime, { color: theme.text }]}>{loopRegion.delay.toFixed(1)}s</Text>
                  <TouchableOpacity onPress={() => setLoopRegion({ ...loopRegion, delay: Math.min(5, loopRegion.delay + 0.5) })}>
                    <Text style={{ color: theme.accent, fontSize: 16, fontWeight: 'bold' }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity onPress={handleResetB} style={{ minWidth: 80, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11, color: '#D29922' }}>B</Text>
                <Text style={[s.loopTime, { color: '#D29922' }]}>{formatTime(loopRegion.pointB)}</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, color: theme.muted, marginTop: 6, textAlign: 'center' }}>
              {(loopRegion.pointB - loopRegion.pointA).toFixed(1)}s{loopRegion.delay > 0 ? ` + ${loopRegion.delay.toFixed(1)}s pause` : ''}
            </Text>

            {/* Counter */}
            <View style={[s.counterRow, { borderTopColor: theme.divider }]}>
              <Text style={[s.counterLabel, { color: theme.muted }]}>
                Repeat: <Text style={[s.counterValue, { color: theme.text }]}>{loopCounter}</Text>
                {loopMax > 0 ? ` / ${loopMax}` : ''}
              </Text>
              <TouchableOpacity onPress={() => setShowMaxSheet(true)} style={[s.counterBtn, { backgroundColor: theme.divider }]}>
                <Text style={[s.counterBtnText, { color: theme.accent }]}>
                  {loopMax > 0 ? `Stop at ${loopMax}` : 'Set limit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Progress bar — outside ScrollView so Slider works */}
      <View style={s.progressContainer}>
        <LoopProgressTrack
          progress={duration > 0 ? currentTime / duration : 0}
          loopRegion={loopRegion}
          duration={duration}
          onSeek={seekTo}
          s={s}
          theme={theme}
        />
      </View>

      {/* Time row */}
      <View style={s.timeRow}>
        <Text style={[s.timeText, { color: theme.muted }]}>{formatTime(currentTime)}</Text>
        <Text style={[s.timeText, { color: theme.muted }]}>−{formatTime(Math.max(0, duration - currentTime))}</Text>
      </View>

      {/* Transport controls */}
      <View style={s.transportRow}>
        <TouchableOpacity onPress={handleJumpLoopStart} style={s.transportBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="progress-start" size={26} color={theme.text} />
          <Text style={[s.skipLabel, { color: theme.muted }]}>Start</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => seekTo(Math.max(0, currentTime - skipSeconds))} style={s.transportBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="rewind" size={26} color={theme.text} />
          <Text style={[s.skipLabel, { color: theme.muted }]}>{skipSeconds}s</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={togglePlayPause} style={[s.playBtn, { backgroundColor: theme.accent }]}>
          <MaterialCommunityIcons name={isPlaying ? 'pause' : 'play'} size={32} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => seekTo(Math.min(duration, currentTime + skipSeconds))} style={s.transportBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="fast-forward" size={26} color={theme.text} />
          <Text style={[s.skipLabel, { color: theme.muted }]}>{skipSeconds}s</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleJumpLoopEnd} style={s.transportBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="progress-end" size={26} color={theme.text} />
          <Text style={[s.skipLabel, { color: theme.muted }]}>End</Text>
        </TouchableOpacity>
      </View>

      {/* Save Loop Modal */}
      <Modal visible={showSaveSheet} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[s.modalTitle, { color: theme.text }]}>Save Loop</Text>
            <Text style={{ fontSize: 13, color: theme.muted, marginBottom: 8 }}>
              {formatTime(loopRegion?.pointA || 0)} → {formatTime(loopRegion?.pointB || 0)}
              {'\n'}{(loopRegion?.pointB - loopRegion?.pointA).toFixed(1)}s
              {loopRegion?.delay > 0 ? ` + ${loopRegion.delay.toFixed(1)}s delay` : ''}
            </Text>
            <TextInput
              style={[s.input, { color: theme.text, borderColor: theme.divider, backgroundColor: theme.bg }]}
              placeholder="Loop name"
              placeholderTextColor={theme.muted}
              value={newLoopName}
              onChangeText={setNewLoopName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveLoop}
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.divider }]} onPress={() => setShowSaveSheet(false)}>
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.accent }]} onPress={handleSaveLoop}>
                <Text style={{ color: '#fff' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Set Time Modal */}
      <Modal visible={showTimeInput} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[s.modalTitle, { color: theme.text }]}>Set Loop Time</Text>
            <Text style={{ fontSize: 13, color: theme.muted, marginBottom: 12 }}>
              Enter exact times for A and/or B. Use M:SS (e.g. 1:30) or seconds (e.g. 90).
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#58A6FF', marginBottom: 4, fontWeight: '600' }}>Point A</Text>
                <TextInput
                  style={[s.input, { color: theme.text, borderColor: theme.divider, backgroundColor: theme.bg, fontFamily: 'monospace' }]}
                  placeholder="0:00"
                  placeholderTextColor={theme.muted}
                  value={timeA}
                  onChangeText={setTimeA}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoFocus
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#D29922', marginBottom: 4, fontWeight: '600' }}>Point B</Text>
                <TextInput
                  style={[s.input, { color: theme.text, borderColor: theme.divider, backgroundColor: theme.bg, fontFamily: 'monospace' }]}
                  placeholder={duration > 0 ? formatTime(duration) : '0:00'}
                  placeholderTextColor={theme.muted}
                  value={timeB}
                  onChangeText={setTimeB}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                />
              </View>
            </View>
            {timeError ? (
              <Text style={{ fontSize: 13, color: '#F85149', marginTop: 10 }}>{timeError}</Text>
            ) : (
              <Text style={{ fontSize: 12, color: theme.muted, marginTop: 10, textAlign: 'center' }}>
                Leave a field blank to keep its current value.
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.divider }]} onPress={() => setShowTimeInput(false)}>
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.accent }]} onPress={handleApplyTime}>
                <Text style={{ color: '#fff' }}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Saved Loops Modal */}
      <Modal visible={showLoopsSheet} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { maxHeight: '70%', backgroundColor: theme.card }]}>
            <Text style={[s.modalTitle, { color: theme.text }]}>Saved Loops</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              {!(audioFile?.savedLoops?.length) ? (
                <Text style={{ color: theme.muted, textAlign: 'center', padding: 20 }}>No saved loops yet</Text>
              ) : (
                (audioFile?.savedLoops || []).map(loop => (
                  <View key={loop.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.divider }}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => handlePlaySavedLoop(loop)}>
                      <Text style={{ color: theme.text, fontWeight: '500' }}>{loop.name}</Text>
                      <Text style={{ color: theme.muted, fontSize: 12 }}>
                        {formatTime(loop.pointA)} → {formatTime(loop.pointB)}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteSavedLoop(loop.id)} style={{ padding: 8 }}>
                      <MaterialCommunityIcons name="delete" size={20} color="#F85149" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.divider, marginTop: 12 }]} onPress={() => setShowLoopsSheet(false)}>
              <Text style={{ color: theme.text }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Loop Max Modal */}
      <Modal visible={showMaxSheet} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[s.modalTitle, { color: theme.text }]}>Repeat Limit</Text>
            <Text style={{ fontSize: 13, color: theme.muted, marginBottom: 12 }}>
              Auto-stop after this many repeats. Set to 0 for unlimited.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {LOOP_MAX_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    s.optionChip,
                    { backgroundColor: theme.divider },
                    loopMax === opt && { backgroundColor: theme.accent },
                  ]}
                  onPress={() => handleSetLoopMax(opt)}
                >
                  <Text style={[s.optionChipText, { color: loopMax === opt ? '#fff' : theme.text }]}>
                    {opt > 0 ? opt : '∞'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.divider, marginTop: 16 }]} onPress={() => setShowMaxSheet(false)}>
              <Text style={{ color: theme.text }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Ayah Markers Modal */}
      {quranSurahEnabled && (
        <Modal visible={showAyahSheet} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={[s.modalContent, { maxHeight: '80%', backgroundColor: theme.card }]}>
              <Text style={[s.modalTitle, { color: theme.text }]}>Ayah Markers</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {surahData && (
                  <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.accent }]} onPress={handleAutoSplit}>
                    <Text style={{ color: '#fff' }}>Auto Split ({surahData.numberOfAyahs})</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#238636' }]} onPress={handleAddAyahMarker}>
                  <Text style={{ color: '#fff' }}>+ Mark Here</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 300 }}>
                {ayahMarkers.length === 0 ? (
                  <Text style={{ color: theme.muted, textAlign: 'center', padding: 20 }}>
                    {surahData
                      ? 'Tap "Auto Split" to create markers for all ayahs, or "Mark Here" to add one manually.'
                      : 'Select a surah first, then create ayah markers.'}
                  </Text>
                ) : (
                  ayahMarkers.map((marker, idx) => (
                    <View key={marker.id} style={{
                      flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
                      borderBottomWidth: 1, borderBottomColor: theme.divider,
                      backgroundColor: idx === currentAyahIndex ? theme.accent + '15' : 'transparent',
                    }}>
                      <TouchableOpacity style={{ flex: 1 }} onPress={() => { handleSeekToAyah(marker); setShowAyahSheet(false); }}>
                        <Text style={{ color: theme.text, fontWeight: '500' }}>{marker.label}</Text>
                        <Text style={{ color: theme.muted, fontSize: 12 }}>{formatTime(marker.time)}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteAyahMarker(marker.id)} style={{ padding: 8 }}>
                        <MaterialCommunityIcons name="delete" size={18} color="#F85149" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.divider, marginTop: 12 }]} onPress={() => setShowAyahSheet(false)}>
                <Text style={{ color: theme.text }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Surah Search Modal */}
      {quranSurahEnabled && (
        <Modal visible={showSurahSearch} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={[s.modalContent, { backgroundColor: theme.card }]}>
              <Text style={[s.modalTitle, { color: theme.text }]}>Select Surah</Text>
              <TextInput
                style={[s.input, { color: theme.text, borderColor: theme.divider, backgroundColor: theme.bg }]}
                placeholder="Search surah name..."
                placeholderTextColor={theme.muted}
                value={surahQuery}
                onChangeText={(text) => { setSurahQuery(text); handleSearchSurah(); }}
                autoFocus
                returnKeyType="done"
              />
              <ScrollView style={{ maxHeight: 250, marginTop: 8 }}>
                {surahLoading && <Text style={{ color: theme.muted, textAlign: 'center', padding: 12 }}>Searching...</Text>}
                {!surahLoading && surahResults.length === 0 && surahQuery.trim() && (
                  <Text style={{ color: theme.muted, textAlign: 'center', padding: 12 }}>No results</Text>
                )}
                {!surahLoading && surahResults.length === 0 && !surahQuery.trim() && (
                  <Text style={{ color: theme.muted, textAlign: 'center', padding: 12 }}>Type to search</Text>
                )}
                {surahResults.map(surah => (
                  <TouchableOpacity
                    key={surah.number}
                    style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.divider }}
                    onPress={() => handleSelectSurah(surah)}
                  >
                    <Text style={{ color: theme.text, fontWeight: '500' }}>{surah.number}. {surah.englishName}</Text>
                    <Text style={{ color: theme.muted, fontSize: 12 }}>{surah.name} · {surah.numberOfAyahs} ayahs</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.divider, marginTop: 12 }]} onPress={() => setShowSurahSearch(false)}>
                <Text style={{ color: theme.text }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// Waveform visualization with ayah markers
function WaveformWithMarkers({ duration, currentTime, loopRegion, ayahMarkers, onSeek, theme, s }) {
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
      style={s.waveformContainer}
    >
      <Svg height={40} width={(numBars) * (barWidth + barGap)} style={{ flex: 1 }}>
        {bars.map((bar, i) => {
          const h = Math.random() * 20 + 8;
          const y = 20 - h / 2;
          let fill = theme.divider;
          if (bar.inLoop) fill = theme.accent + '4D';
          if (bar.filled) fill = theme.accent;
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

function LoopProgressTrack({ progress, loopRegion, duration, onSeek, s, theme }) {
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  const displayValue = dragging ? dragValue : progress;

  return (
    <View style={s.progressBar}>
      {/* Loop highlight */}
      {loopRegion?.enabled && loopRegion.pointB != null && loopRegion.pointB > loopRegion.pointA && duration > 0 && (
        <View
          style={[
            s.loopHighlight,
            {
              left: (loopRegion.pointA / duration) * 100,
              width: ((loopRegion.pointB - loopRegion.pointA) / duration) * 100,
            },
          ]}
        />
      )}
      {/* A marker */}
      {loopRegion?.enabled && loopRegion.pointA != null && duration > 0 && (
        <View style={[s.marker, { left: (loopRegion.pointA / duration) * 100, backgroundColor: '#58A6FF' }]} />
      )}
      {/* B marker */}
      {loopRegion?.enabled && loopRegion.pointB != null && duration > 0 && (
        <View style={[s.marker, { left: (loopRegion.pointB / duration) * 100, backgroundColor: '#D29922' }]} />
      )}
      <Slider
        value={Number.isFinite(displayValue) ? displayValue : 0}
        onSlidingStart={() => setDragging(true)}
        onValueChange={(p) => setDragValue(p)}
        onSlidingComplete={(p) => {
          setDragging(false);
          setDragValue(p);
          if (duration > 0) onSeek(p * duration);
        }}
        minimumValue={0}
        maximumValue={1}
        minimumTrackTintColor={theme.accent}
        maximumTrackTintColor="#21262D"
        thumbTintColor="#F0F6FC"
        step={0.001}
        style={{ position: 'absolute', top: 0, height: 32, left: 0, right: 0 }}
      />
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    headerBtn: { padding: 8 },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: t.text, textAlign: 'center', marginHorizontal: 12 },
    scrollContent: { paddingBottom: 30 },
    waveformContainer: { paddingHorizontal: 20, marginVertical: 4 },
    ayahCard: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 6, marginBottom: 4 },
    ayahLabel: { fontSize: 13, color: '#D29922', fontWeight: '600' },
    ayahTime: { fontSize: 12, color: t.muted, fontFamily: 'monospace' },
    surahChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, backgroundColor: t.card, marginVertical: 6 },
    surahChipText: { fontSize: 13, color: t.accent, fontWeight: '500' },
    progressContainer: { paddingHorizontal: 20, marginVertical: 8 },
    progressBar: { height: 32, justifyContent: 'center', position: 'relative' },
    progressBg: { position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, backgroundColor: t.divider },
    progressFill: { position: 'absolute', left: 0, height: 6, borderRadius: 3, backgroundColor: t.accent },
    loopHighlight: { position: 'absolute', height: 6, borderRadius: 3, backgroundColor: t.accent + '40' },
    marker: { position: 'absolute', width: 10, height: 10, borderRadius: 5, top: 6, marginLeft: -5 },
    thumb: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#F0F6FC', shadowColor: '#000', shadowRadius: 3, marginLeft: -9, top: 2 },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 8 },
    timeText: { fontSize: 13, fontFamily: 'monospace' },
    transportRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 12 },
    transportBtn: { alignItems: 'center', padding: 8 },
    skipLabel: { fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
    playBtn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
    loopControlRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingHorizontal: 20, marginVertical: 4 },
    pillBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: t.card },
    pillBtnActive: { borderWidth: 1, borderColor: t.accent + '40' },
    pillBtnLoopActive: { borderWidth: 1, borderColor: t.accent, backgroundColor: t.accent + '15' },
    pillText: { fontSize: 12, color: t.muted, fontWeight: '500' },
    actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingHorizontal: 20, marginVertical: 8 },
    actionChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14 },
    actionChipText: { fontSize: 13, fontWeight: '500' },
    speedSection: { paddingHorizontal: 32, marginVertical: 16 },
    loopInfoCard: { marginHorizontal: 20, marginVertical: 12, padding: 16, borderRadius: 14 },
    loopTime: { fontSize: 14, fontFamily: 'monospace', fontWeight: '600' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '88%', borderRadius: 16, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
    input: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 16 },
    modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    toast: { position: 'absolute', top: 60, left: '10%', right: '10%', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, zIndex: 999 },
    toastText: { fontSize: 14, fontWeight: '600' },
    counterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
    counterLabel: { fontSize: 13 },
    counterValue: { fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
    counterBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
    counterBtnText: { fontSize: 12, fontWeight: '600' },
    optionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
    optionChipText: { fontSize: 14, fontWeight: '600' },
  });
}

const styles = makeStyles(COLOR_SCHEMES.dark);