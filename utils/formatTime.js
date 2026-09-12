export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Parse a user-entered time string into seconds.
// Accepts: "83", "83.5", "1:23", "1:23.5", "01:23"
// Returns null if invalid.
export function parseTime(input) {
  if (typeof input === 'number' && isFinite(input)) {
    return Math.max(0, input);
  }
  const str = String(input).trim();
  if (!str) return null;
  if (str.includes(':')) {
    const parts = str.split(':');
    if (parts.length > 2) return null;
    const nums = parts.map((p) => p.trim());
    if (nums.some((p) => p === '' || isNaN(Number(p)))) return null;
    if (parts.length === 1) return Number(nums[0]);
    const minutes = Number(nums[0]);
    const secs = Number(nums[1]);
    if (secs < 0 || secs >= 60) return null;
    return minutes * 60 + secs;
  }
  if (isNaN(Number(str))) return null;
  return Math.max(0, Number(str));
}

export function defaultLoopName(fileName, existingCount) {
  const base = fileName.replace(/\.[^.]+$/, '');
  return `${base}-${existingCount + 1}`;
}
