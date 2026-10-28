import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import {
  CARD_NAME,
  CARD_VERSION,
  DEFAULT_AMPLITUDE,
  DEFAULT_COLOR_NEGATIVE,
  DEFAULT_COLOR_POSITIVE,
  DEFAULT_ORIENTATION,
  EDITOR_NAME,
  ORIENTATIONS,
  THEME_COLORS,
} from './const';
import './editor';
import { localize } from './localize';
import type {
  ActionConfig,
  HomeAssistant,
  LovelaceCardEditor,
  VariationBarCardConfig,
} from './types';

// Console banner: shows at a glance which version the browser actually loaded (cache).
console.info(
  `%c ${CARD_NAME.toUpperCase()} %c v${CARD_VERSION} `,
  'color: white; background: var(--primary-color, #03a9f4); font-weight: 700;',
  'color: var(--primary-color, #03a9f4); background: white; font-weight: 700;',
);

const DEFAULT_TAP_ACTION: ActionConfig = { action: 'more-info' };

/** Total duration (s) of a bar transition, whatever the distance travelled. */
const ANIMATION_DURATION = 0.6;

interface FillTiming {
  duration: number;
  delay: number;
  easing: string;
}

/** Named theme colour → HA CSS variable; any other value is used as a CSS colour. */
function cssColor(color: string): string {
  return THEME_COLORS.has(color) ? `var(--${color}-color)` : color;
}

/** Offset (−50 to +50 %) of a value from the centre, clamped to the scale. */
function toOffset(value: number, amplitude: number): number {
  return (Math.min(Math.max(value, -amplitude), amplitude) / amplitude) * 50;
}

export class VariationBarCard extends LitElement {
  static override properties = {
    hass: { attribute: false },
    _config: { state: true },
  };

  // `declare`: lets Lit own these reactive properties (no class field).
  declare hass?: HomeAssistant;
  declare private _config?: VariationBarCardConfig;

  /** Last rendered offset: starting point of the next animation. */
  private _offset = 0;

  /** Visual editor shown in the dashboard edit UI. */
  public static getConfigElement(): LovelaceCardEditor {
    return document.createElement(EDITOR_NAME);
  }

  /** Config suggested when the card is added from the card picker. */
  public static getStubConfig(hass: HomeAssistant): Omit<VariationBarCardConfig, 'type'> {
    const numeric = Object.values(hass.states).find(
      (s) => s.entity_id.startsWith('sensor.') && !Number.isNaN(Number(s.state)),
    );
    return { entity: numeric?.entity_id ?? '', amplitude: DEFAULT_AMPLITUDE };
  }

  /** Called by HA whenever the config changes (YAML or visual editor). */
  public setConfig(config: VariationBarCardConfig): void {
    if (!config || (config.entity !== undefined && typeof config.entity !== 'string')) {
      throw new Error(localize('card.invalid_config', this.hass));
    }
    const amplitude = Number(config.amplitude ?? DEFAULT_AMPLITUDE);
    if (!Number.isFinite(amplitude) || amplitude <= 0) {
      throw new Error(localize('card.invalid_amplitude', this.hass));
    }
    if (config.orientation !== undefined && !ORIENTATIONS.includes(config.orientation)) {
      throw new Error(localize('card.invalid_orientation', this.hass));
    }
    this._config = { ...config, amplitude };
  }

  private get _horizontal(): boolean {
    return (this._config?.orientation ?? DEFAULT_ORIENTATION) === 'horizontal';
  }

  /** Approximate height (1 unit = 50 px) for the masonry view. */
  public getCardSize(): number {
    return this._horizontal ? 2 : 4;
  }

  /** Default size in the sections view. */
  public getGridOptions() {
    return this._horizontal
      ? { columns: 6, rows: 2, min_columns: 4, min_rows: 2 }
      : { columns: 3, rows: 4, min_columns: 2, min_rows: 3 };
  }

  // `hass` changes on EVERY state change of the whole instance:
  // only re-render when our entity (or the config) changed.
  protected override shouldUpdate(changed: PropertyValues): boolean {
    if (changed.has('_config')) {
      return true;
    }
    const oldHass = changed.get('hass') as HomeAssistant | undefined;
    const entity = this._config?.entity;
    if (!oldHass || !entity) {
      return true;
    }
    return oldHass.states[entity] !== this.hass?.states[entity];
  }

  private get _tapAction(): ActionConfig {
    return this._config?.tap_action ?? DEFAULT_TAP_ACTION;
  }

  private get _hasAction(): boolean {
    return this._tapAction.action !== 'none';
  }

  protected override render() {
    if (!this._config || !this.hass) {
      return nothing;
    }
    const { entity } = this._config;
    if (!entity) {
      return this._renderWarning(localize('card.no_entity', this.hass));
    }
    const stateObj = this.hass.states[entity];
    if (!stateObj) {
      return this._renderWarning(localize('card.entity_not_found', this.hass, { entity }));
    }

    const amplitude = this._config.amplitude ?? DEFAULT_AMPLITUDE;
    const value = Number(stateObj.state);
    const valid = stateObj.state !== '' && Number.isFinite(value);

    // The bar starts from the centre (0): upwards (or rightwards) when positive, downwards
    // (or leftwards) when negative.
    const offset = valid ? toOffset(value, amplitude) : 0;
    const size = this._horizontal ? 'width' : 'height';
    const name = this._config.name ?? stateObj.attributes.friendly_name ?? entity;
    const scale = new Intl.NumberFormat(this.hass.locale.language, {
      signDisplay: 'exceptZero',
      maximumFractionDigits: 2,
    });
    const [upTiming, downTiming] = this._timings(this._offset, offset);
    this._offset = offset;
    const formatted = this.hass.formatEntityState(stateObj);

    return html`
      <ha-card
        class=${this._hasAction ? 'actionable' : ''}
        role=${this._hasAction ? 'button' : nothing}
        tabindex=${this._hasAction ? '0' : nothing}
        @click=${this._handleTap}
        @keydown=${this._handleKeyDown}
      >
        <ha-ripple .disabled=${!this._hasAction}></ha-ripple>
        <div class="content ${this._horizontal ? 'horizontal' : 'vertical'}">
          <div class="header">
            <span class="name">${name}</span>
            <span class="value">${formatted}</span>
          </div>
          <div class="gauge">
            <div
              class="track"
              role="meter"
              aria-label=${name}
              aria-valuemin=${-amplitude}
              aria-valuemax=${amplitude}
              aria-valuenow=${valid ? value : nothing}
              aria-valuetext=${formatted}
            >
              <div
                class="fill up"
                style=${styleMap({
                  [size]: `${Math.max(offset, 0)}%`,
                  background: cssColor(this._config.color_positive ?? DEFAULT_COLOR_POSITIVE),
                  ...this._transition(upTiming),
                })}
              ></div>
              <div
                class="fill down"
                style=${styleMap({
                  [size]: `${Math.max(-offset, 0)}%`,
                  background: cssColor(this._config.color_negative ?? DEFAULT_COLOR_NEGATIVE),
                  ...this._transition(downTiming),
                })}
              ></div>
              <div class="zero"></div>
            </div>
            <div class="scale" aria-hidden="true">
              <span class="max">${scale.format(amplitude)}</span>
              <span class="mid">${scale.format(0)}</span>
              <span class="min">${scale.format(-amplitude)}</span>
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  /**
   * Timings of the upper and lower halves. When the sign changes, the bar first goes back to 0
   * (the emptying half) then grows on the other side (the filling half, delayed), each step
   * lasting in proportion to its distance so the speed stays constant.
   */
  private _timings(from: number, to: number): [up: FillTiming, down: FillTiming] {
    const direct = { duration: ANIMATION_DURATION, delay: 0, easing: 'ease-in-out' };
    if (from * to >= 0) {
      return [direct, direct];
    }
    const total = Math.abs(from) + Math.abs(to);
    const shrink = {
      duration: (ANIMATION_DURATION * Math.abs(from)) / total,
      delay: 0,
      easing: 'ease-in',
    };
    const grow = {
      duration: (ANIMATION_DURATION * Math.abs(to)) / total,
      delay: shrink.duration,
      easing: 'ease-out',
    };
    return from > 0 ? [shrink, grow] : [grow, shrink];
  }

  private _transition({ duration, delay, easing }: FillTiming) {
    return {
      'transition-duration': `${duration}s`,
      'transition-delay': `${delay}s`,
      'transition-timing-function': easing,
    };
  }

  private _renderWarning(message: string) {
    return html`<ha-card><div class="warning">${message}</div></ha-card>`;
  }

  // `hass-action`: the frontend runs the configured action exactly as for a built-in card
  // (more-info, navigate, perform action, confirmation…).
  private _handleTap(): void {
    if (!this._config || !this._hasAction) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent('hass-action', {
        detail: {
          config: { entity: this._config.entity, tap_action: this._tapAction },
          action: 'tap',
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _handleKeyDown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this._handleTap();
    }
  }

  // Only HA theme CSS variables: the card follows the light/dark theme.
  static override styles = css`
    ha-card {
      position: relative;
      height: 100%;
      overflow: hidden;
      --ha-ripple-color: var(--primary-text-color);
    }
    ha-card.actionable {
      cursor: pointer;
    }
    ha-card:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px var(--primary-color);
    }
    .content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      height: 100%;
      box-sizing: border-box;
      padding: 16px;
    }
    .header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      max-width: 100%;
    }
    .name {
      max-width: 100%;
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-m, 14px);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .value {
      color: var(--primary-text-color);
      font-size: var(--ha-font-size-xl, 24px);
      font-weight: var(--ha-font-weight-medium, 500);
      line-height: var(--ha-line-height-condensed, 1.2);
      white-space: nowrap;
    }
    .gauge {
      display: flex;
      flex: 1;
      gap: 8px;
      min-height: 120px;
    }
    .track {
      position: relative;
      width: 40px;
      overflow: hidden;
      border-radius: var(--ha-border-radius-lg, 12px);
      background: var(--secondary-background-color);
    }
    /* Two halves anchored at the centre: the bar always grows and shrinks from 0. */
    .fill {
      position: absolute;
      left: 0;
      right: 0;
      transition-property: height, width;
    }
    .fill.up {
      bottom: 50%;
    }
    .fill.down {
      top: 50%;
    }
    .zero {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 50%;
      height: 2px;
      transform: translateY(50%);
      background: var(--secondary-text-color);
      opacity: 0.5;
    }
    .scale {
      position: relative;
      min-width: 2ch;
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s, 12px);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .scale span {
      position: absolute;
      left: 0;
      white-space: nowrap;
    }
    .scale .max {
      top: 0;
    }
    .scale .mid {
      top: 50%;
      transform: translateY(-50%);
    }
    .scale .min {
      bottom: 0;
    }
    /* Horizontal: name and value on one line, bar across the card, scale below it (-, 0, +). */
    .horizontal {
      align-items: stretch;
      gap: 8px;
    }
    .horizontal .header {
      flex-direction: row;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
    }
    .horizontal .name {
      min-width: 0;
    }
    .horizontal .gauge {
      flex-direction: column;
      gap: 4px;
      min-height: 0;
    }
    .horizontal .track {
      flex: 1;
      width: auto;
      min-height: 16px;
      max-height: 40px;
    }
    .horizontal .fill {
      top: 0;
      bottom: 0;
      left: auto;
      right: auto;
    }
    .horizontal .fill.up {
      left: 50%;
    }
    .horizontal .fill.down {
      right: 50%;
    }
    .horizontal .zero {
      top: 0;
      bottom: 0;
      left: 50%;
      right: auto;
      width: 2px;
      height: auto;
      transform: translateX(-50%);
    }
    .horizontal .scale {
      min-width: 0;
      height: 1em;
    }
    .horizontal .scale span {
      top: 0;
      bottom: auto;
    }
    .horizontal .scale .max {
      left: auto;
      right: 0;
    }
    .horizontal .scale .mid {
      left: 50%;
      transform: translateX(-50%);
    }
    .warning {
      padding: 16px;
      color: var(--warning-color);
    }
    @media (prefers-reduced-motion: reduce) {
      .fill {
        transition: none !important;
      }
    }
  `;
}

if (!customElements.get(CARD_NAME)) {
  customElements.define(CARD_NAME, VariationBarCard);
}

// Makes the card show up in the "Add card" picker.
window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_NAME)) {
  window.customCards.push({
    type: CARD_NAME,
    name: localize('card.name'),
    description: localize('card.description'),
    preview: true,
    documentationURL: 'https://github.com/gkuik/variation-bar-card',
  });
}

declare global {
  interface HTMLElementTagNameMap {
    'variation-bar-card': VariationBarCard;
  }
}
