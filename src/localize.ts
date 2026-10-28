import type { HomeAssistant } from './types';

const translations = {
  en: {
    'card.name': 'Variation bar',
    'card.description':
      'Vertical or horizontal bar centred on zero: orange for positive values, blue for negative ones. Ideal for a rate of change.',
    'card.no_entity': 'Choose an entity in the card editor.',
    'card.entity_not_found': 'Entity not found: {entity}',
    'card.invalid_config': 'Invalid configuration',
    'card.invalid_amplitude': 'Amplitude must be a number greater than 0',
    'card.invalid_orientation': 'Orientation must be "vertical" or "horizontal"',
    'editor.entity': 'Entity',
    'editor.name': 'Name (optional)',
    'editor.amplitude': 'Amplitude (scale from -amplitude to +amplitude)',
    'editor.orientation': 'Orientation',
    'editor.orientation.vertical': 'Vertical',
    'editor.orientation.horizontal': 'Horizontal',
    'editor.color_positive': 'Colour above 0',
    'editor.color_negative': 'Colour below 0',
    'editor.interactions': 'Interactions',
    'editor.tap_action': 'Tap behaviour',
  },
  fr: {
    'card.name': 'Barre de variation',
    'card.description':
      'Barre verticale ou horizontale centrée sur 0 : orange pour les valeurs positives, bleue pour les négatives. Idéale pour une vitesse de variation.',
    'card.no_entity': "Choisissez une entité dans l'éditeur de la carte.",
    'card.entity_not_found': 'Entité introuvable : {entity}',
    'card.invalid_config': 'Configuration invalide',
    'card.invalid_amplitude': "L'amplitude doit être un nombre supérieur à 0",
    'card.invalid_orientation': "L'orientation doit être « vertical » ou « horizontal »",
    'editor.entity': 'Entité',
    'editor.name': 'Nom (facultatif)',
    'editor.amplitude': 'Amplitude (échelle de -amplitude à +amplitude)',
    'editor.orientation': 'Orientation',
    'editor.orientation.vertical': 'Verticale',
    'editor.orientation.horizontal': 'Horizontale',
    'editor.color_positive': 'Couleur au-dessus de 0',
    'editor.color_negative': 'Couleur en dessous de 0',
    'editor.interactions': 'Interactions',
    'editor.tap_action': 'Comportement au clic',
  },
} as const;

export type Key = keyof (typeof translations)['en'];

export function localize(
  key: Key,
  hass?: HomeAssistant,
  placeholders: Record<string, string> = {},
): string {
  const lang = (hass?.locale?.language ?? navigator.language).split('-')[0];
  const dict =
    lang in translations ? translations[lang as keyof typeof translations] : translations.en;
  return Object.entries(placeholders).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, value),
    dict[key] as string,
  );
}
