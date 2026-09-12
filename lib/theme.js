export const COLOR_SCHEMES = {
  dark: { bg: '#0D1117', card: '#161B22', accent: '#1F6FEB', text: '#F0F6FC', muted: '#8B949E', divider: '#21262D' },
  midnight: { bg: '#0A192F', card: '#112240', accent: '#64FFDA', text: '#E6F1FF', muted: '#8892B0', divider: '#1D3557' },
  ocean: { bg: '#0B1622', card: '#152238', accent: '#00B4D8', text: '#E0F7FA', muted: '#7FB3CE', divider: '#1A365D' },
  charcoal: { bg: '#3C3F41', card: '#4A4D4F', accent: '#E06C75', text: '#F0F0F0', muted: '#999', divider: '#555' },
  white: { bg: '#FFFFFF', card: '#F6F8FA', accent: '#0969DA', text: '#1F2328', muted: '#656D76', divider: '#D0D7DE' },
};

export function getTheme(scheme, customAccent) {
  if (scheme === 'custom' && customAccent) {
    return generateTheme(customAccent);
  }
  return COLOR_SCHEMES[scheme] || COLOR_SCHEMES.dark;
}

// Generate a full theme from a chosen accent color (hex string like '#FF0000')
function generateTheme(accent) {
  const { r, g, b } = hexToRgb(accent);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const isDark = luminance < 128;

  if (isDark) {
    const bg = darken('#1A1A1A', 0);
    const card = darken('#252525', 0);
    const text = '#F0F0F0';
    const muted = '#888';
    const divider = '#333';
    return { bg, card, accent, text, muted, divider };
  } else {
    const bg = '#FFFFFF';
    const card = '#F6F8FA';
    const text = '#1F2328';
    const muted = '#656D76';
    const divider = '#D0D7DE';
    return { bg, card, accent, text, muted, divider };
  }
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function darken(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const clamp = v => Math.max(0, Math.min(255, v - amount));
  return '#' + [clamp(r), clamp(g), clamp(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}