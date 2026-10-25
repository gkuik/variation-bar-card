// Injected by Vite from package.json (see vite.config.ts).
declare const __CARD_VERSION__: string;

export const CARD_VERSION = __CARD_VERSION__;
export const CARD_NAME = 'variation-bar-card';
export const EDITOR_NAME = `${CARD_NAME}-editor`;

/** Scale from -amplitude to +amplitude: zero is always in the middle. */
export const DEFAULT_AMPLITUDE = 3;
export const DEFAULT_COLOR_POSITIVE = 'orange';
export const DEFAULT_COLOR_NEGATIVE = 'blue';

// Named colours of the `ui_color` selector: they map to the `--<name>-color` variables of the
// HA theme (same logic as the frontend's computeCssColor).
export const THEME_COLORS = new Set([
  'primary',
  'accent',
  'disabled',
  'red',
  'pink',
  'purple',
  'deep-purple',
  'indigo',
  'blue',
  'light-blue',
  'cyan',
  'teal',
  'green',
  'light-green',
  'lime',
  'yellow',
  'amber',
  'orange',
  'deep-orange',
  'brown',
  'light-grey',
  'grey',
  'dark-grey',
  'blue-grey',
  'black',
  'white',
]);
