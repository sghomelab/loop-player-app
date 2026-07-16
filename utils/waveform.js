import { Audio } from 'expo-av';

const NUM_BARS = 150;

async function generateWaveformBars(audioUri) {
  const sound = new Audio.Sound();
  try {
    await sound.loadAsync({ uri: audioUri }, {}, false);
    const status = await sound.getStatusAsync();
    const durationSec = (status.durationMillis || 0) / 1000;
    if (durationSec <= 0) return [];

    const segmentDuration = durationSec / NUM_BARS;
    const bars = [];

    for (let i = 0; i < NUM_BARS; i++) {
      const seekTime = i * segmentDuration;
      try {
        await sound.setPositionAsync(seekTime * 1000);
        await new Promise(r => setTimeout(r, 5));
        await sound.playAsync();
        await new Promise(r => setTimeout(r, segmentDuration * 800);
        const segStatus = await sound.getStatusAsync();
        const isPlaying = segStatus.isPlaying;
        bars.push(isPlaying ? Math.random() * 0.6 + 0.4 : 0);
      } catch {
        bars.push(0);
      }
    }

    await sound.stopAsync();
    return bars;
  } catch (e) {
    console.error('generateWaveformBars error:', e);
    return [];
  } finally {
    try { await sound.unloadAsync(); } catch {}
  }
}

export { generateWaveformBars, NUM_BARS };