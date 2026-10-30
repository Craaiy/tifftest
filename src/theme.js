import { useLayoutEffect } from 'react';

// bg/card are only used for the preview tiles in Settings.
// Themes with an `accent` also switch the accent colour when picked.
export const THEMES = [
  { id: 'system', label: 'Auto', bg: 'linear-gradient(135deg, #f3f4f7 50%, #0f1115 50%)', card: 'linear-gradient(135deg, #ffffff 50%, #181b22 50%)' },
  { id: 'light', label: 'Light', bg: '#f3f4f7', card: '#ffffff' },
  { id: 'dark', label: 'Dark', bg: '#0f1115', card: '#181b22' },
  { id: 'black', label: 'Black', bg: '#000000', card: '#0b0c0f' },
  { id: 'ocean', label: 'Ocean', bg: '#0b1626', card: '#11223a', accent: '#38bdf8' },
  { id: 'forest', label: 'Forest', bg: '#0c1510', card: '#13221a', accent: '#22c55e' },
  { id: 'grape', label: 'Grape', bg: '#140f1f', card: '#1e1730', accent: '#a855f7' },
  { id: 'mocha', label: 'Mocha', bg: '#17120f', card: '#231b16', accent: '#f59e0b' },
  { id: 'rose', label: 'Rose', bg: '#fdf2f5', card: '#ffffff', accent: '#ec4899' },
  { id: 'sand', label: 'Sand', bg: '#f6f1e7', card: '#fffdf8', accent: '#f97316' },
];

export const ACCENTS = [
  { name: 'Blue', color: '#4f8cff' },
  { name: 'Sky', color: '#38bdf8' },
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Purple', color: '#a855f7' },
  { name: 'Pink', color: '#ec4899' },
  { name: 'Red', color: '#ef4444' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Teal', color: '#14b8a6' },
];

export const FONT_SIZES = {
  small: { label: 'Small', px: '15px' },
  normal: { label: 'Normal', px: '16px' },
  large: { label: 'Large', px: '18px' },
  xl: { label: 'XL', px: '20px' },
};

// Black text on light accent colours, white text on dark ones
function textOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? '#0b0d12' : '#ffffff';
}

/** Applies theme, accent colour, text size and motion settings to the page */
export function useAppearance(s) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: light)');

    const apply = () => {
      let theme = s.theme === 'system' ? (mq.matches ? 'light' : 'dark') : s.theme || 'dark';
      if (!THEMES.some((t) => t.id === theme)) theme = 'dark';
      root.dataset.theme = theme;
      root.dataset.motion = s.reduceMotion ? 'reduced' : 'full';
      root.style.setProperty('--accent', s.accent || '#4f8cff');
      root.style.setProperty('--on-accent', textOn(s.accent));
      root.style.fontSize = (FONT_SIZES[s.fontSize] ?? FONT_SIZES.normal).px;
      // Colour of the phone's status bar
      const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
    };

    apply();
    if (s.theme !== 'system') return;
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [s.theme, s.accent, s.fontSize, s.reduceMotion]);
}