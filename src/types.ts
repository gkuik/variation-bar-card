// Typed subset of the `hass` object provided by the Home Assistant frontend.
// `custom-card-helpers` is unmaintained: only what the card uses is declared here.

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown> & { friendly_name?: string };
  last_changed: string;
  last_updated: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  locale: { language: string };
  language: string;
  formatEntityState(stateObj: HassEntity, state?: string): string;
}

export interface LovelaceCardConfig {
  type: string;
  [key: string]: unknown;
}

/** Tap action, in the built-in HA card format (`more-info`, `navigate`, `none`…). */
export interface ActionConfig {
  action: string;
  [key: string]: unknown;
}

export interface VariationBarCardConfig extends LovelaceCardConfig {
  entity?: string;
  name?: string;
  /** Maximum deviation shown on each side of 0 (scale -amplitude → +amplitude). */
  amplitude?: number;
  /** Named theme colour (`orange`…) or CSS colour (`#ff9800`, `rgb(…)`). */
  color_positive?: string;
  color_negative?: string;
  tap_action?: ActionConfig;
}

export interface LovelaceCardEditor extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: LovelaceCardConfig): void;
}

declare global {
  interface Window {
    customCards?: Array<{
      type: string;
      name: string;
      description: string;
      preview?: boolean;
      documentationURL?: string;
    }>;
  }
}
