import { LitElement, css, html, nothing } from 'lit';
import {
  DEFAULT_AMPLITUDE,
  DEFAULT_COLOR_NEGATIVE,
  DEFAULT_COLOR_POSITIVE,
  DEFAULT_ORIENTATION,
  EDITOR_NAME,
  ORIENTATIONS,
} from './const';
import { localize, type Key } from './localize';
import type { HomeAssistant, LovelaceCardEditor, VariationBarCardConfig } from './types';

interface SchemaItem {
  name: string;
  type?: 'grid' | 'expandable';
  flatten?: boolean;
  selector?: Record<string, unknown>;
  schema?: SchemaItem[];
}

// `ha-form` is the HA frontend form component: entity, colour and action selectors identical
// to those of the built-in card editors. Built per language for the orientation labels.
const schema = (hass: HomeAssistant): SchemaItem[] => [
  { name: 'entity', selector: { entity: { domain: ['sensor', 'number', 'input_number'] } } },
  { name: 'name', selector: { text: {} } },
  {
    name: '',
    type: 'grid',
    schema: [
      { name: 'amplitude', selector: { number: { mode: 'box', step: 'any', min: 0 } } },
      {
        name: 'orientation',
        selector: {
          select: {
            mode: 'dropdown',
            options: ORIENTATIONS.map((value) => ({
              value,
              label: localize(`editor.orientation.${value}`, hass),
            })),
          },
        },
      },
    ],
  },
  {
    name: '',
    type: 'grid',
    schema: [
      { name: 'color_positive', selector: { ui_color: { default_color: DEFAULT_COLOR_POSITIVE } } },
      { name: 'color_negative', selector: { ui_color: { default_color: DEFAULT_COLOR_NEGATIVE } } },
    ],
  },
  {
    name: 'interactions',
    type: 'expandable',
    flatten: true,
    schema: [{ name: 'tap_action', selector: { ui_action: { default_action: 'more-info' } } }],
  },
];

export class VariationBarCardEditor extends LitElement implements LovelaceCardEditor {
  static override properties = {
    hass: { attribute: false },
    _config: { state: true },
  };

  // `declare`: lets Lit own these reactive properties (no class field).
  declare hass?: HomeAssistant;
  declare private _config?: VariationBarCardConfig;

  /** Same schema object between renders, rebuilt only when the language changes. */
  private _schema?: { language: string; items: SchemaItem[] };

  public setConfig(config: VariationBarCardConfig): void {
    this._config = config;
  }

  private _schemaFor(hass: HomeAssistant): SchemaItem[] {
    const { language } = hass.locale;
    if (this._schema?.language !== language) {
      this._schema = { language, items: schema(hass) };
    }
    return this._schema.items;
  }

  protected override render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${{ amplitude: DEFAULT_AMPLITUDE, orientation: DEFAULT_ORIENTATION, ...this._config }}
        .schema=${this._schemaFor(this.hass)}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _computeLabel = (schema: SchemaItem): string =>
    localize(`editor.${schema.name}` as Key, this.hass);

  private _valueChanged(ev: CustomEvent<{ value: VariationBarCardConfig }>): void {
    ev.stopPropagation();
    const config = { ...ev.detail.value };
    if (!config.name) {
      delete config.name;
    }
    this.dispatchEvent(
      new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }),
    );
  }

  static override styles = css`
    :host {
      display: block;
    }
  `;
}

if (!customElements.get(EDITOR_NAME)) {
  customElements.define(EDITOR_NAME, VariationBarCardEditor);
}

declare global {
  interface HTMLElementTagNameMap {
    'variation-bar-card-editor': VariationBarCardEditor;
  }
}
