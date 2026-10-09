import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

/**
 * HoopTicker art direction (apps/mobile/src/theme/tokens.scss): ink arena, one lime accent,
 * Outfit everywhere, Barlow Condensed for scoreboard digits, amber shot clock for urgency.
 */
export const C = {
  ink: '#121417',
  inkDeep: '#0b0c0e',
  surface: '#1d2025',
  surface2: '#282c33',
  text: '#f2f4f5',
  muted: '#a9b0b8',
  faint: '#868e97',
  lime: '#e3fb4a',
  limeStrong: '#d2ef26',
  amber: '#ffb23e',
  loss: '#ff5b4f',
  gain: '#5fe08f',
} as const;

export const FONT = 'HT Outfit';
export const LED = 'HT Barlow Condensed';

loadFont({family: FONT, url: staticFile('fonts/outfit-variable.woff2'), weight: '100 900'});
loadFont({family: LED, url: staticFile('fonts/barlow-condensed-600.woff2'), weight: '600'});

/** Canvas and the TikTok-safe layout (1080 x 1920). Nothing below SAFE_BOTTOM (bottom 25%). */
export const W = 1080;
export const H = 1920;
export const SAFE_X = 120; // right-side action buttons
export const SAFE_TOP = 250; // TikTok top bar
export const SAFE_BOTTOM = 1440; // caption, sound and buttons below
export const MIDDLE_THIRD = {top: 640, bottom: 1280};
