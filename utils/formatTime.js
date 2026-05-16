export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function defaultLoopName(fileName, existingCount) {
  const base = fileName.replace(/\.[^.]+$/, '');
  return `${base}-${existingCount + 1}`;
}
