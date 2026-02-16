const SYNONYMS: Record<string, string> = {
  aubergine: 'eggplant',
  courgette: 'zucchini',
  capsicum: 'bell pepper',
  coriander: 'cilantro',
  spring_onion: 'green onion',
  scallion: 'green onion',
  prawn: 'shrimp',
  mince: 'ground meat',
  rocket: 'arugula',
  caster_sugar: 'superfine sugar',
  icing_sugar: 'powdered sugar',
  confectioners_sugar: 'powdered sugar',
  cornstarch: 'corn starch',
  bicarbonate_of_soda: 'baking soda',
  bicarb: 'baking soda',
  plain_flour: 'all purpose flour',
  self_raising_flour: 'self rising flour',
  double_cream: 'heavy cream',
  single_cream: 'light cream',
  rapeseed_oil: 'canola oil',
  groundnut_oil: 'peanut oil',
  clingfilm: 'plastic wrap',
  mangetout: 'snow pea',
  swede: 'rutabaga',
  beetroot: 'beet',
  broad_bean: 'fava bean',
  chickpea: 'garbanzo bean',
  cos_lettuce: 'romaine lettuce',
};

const MODIFIERS = /\b(fresh|dried|chopped|minced|diced|sliced|whole|ground|crushed|large|medium|small|organic|fine|finely|coarsely|roughly|thinly|thick|thin|boneless|skinless|raw|cooked|frozen|canned|packed|loosely|firmly|heaping|level|flat|about|approximately|optional)\b/g;

export function depluralize(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('ves')) return word.slice(0, -3) + 'f';
  if (word.endsWith('ches') || word.endsWith('shes') || word.endsWith('sses') || word.endsWith('xes') || word.endsWith('zes')) {
    return word.slice(0, -2);
  }
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) {
    return word.slice(0, -1);
  }
  return word;
}

export function normalizeIngredientName(name: string): string {
  let n = name.trim().toLowerCase();
  // Remove parenthetical notes
  n = n.replace(/\([^)]*\)/g, '');
  // Remove non-alpha characters except spaces
  n = n.replace(/[^a-z ]/g, '');
  // Remove modifiers
  n = n.replace(MODIFIERS, '');
  // Collapse whitespace
  n = n.replace(/\s+/g, ' ').trim();
  // Depluralize each word
  n = n.split(' ').map(depluralize).join(' ');
  // Check synonym map
  const key = n.replace(/\s+/g, '_');
  return SYNONYMS[key] || n;
}
