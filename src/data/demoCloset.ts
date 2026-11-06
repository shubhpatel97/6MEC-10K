import { Garment, GarmentKind, OutfitBoard, SavedLook, WearEvent } from '../types';
import { Category } from '../theme/tokens';
import { KINDS_BY_CATEGORY } from '../lib/garmentFacts';
import { addDays, dateKey } from '../lib/date';

/**
 * A deterministic demo wardrobe.
 *
 * The original 188-item catalog and its photography were not present in this
 * repository, so the demo rack is rebuilt from vector cutouts with the same
 * shape: 188 pieces, mixed categories, believable wear history and outfit
 * boards. It is demo material and is labelled that way throughout.
 */

export const DEMO_CLOSET_SIZE = 188;

type Colorway = {
  name: string;
  hex: string;
  accent: string;
  family: Garment['colorFamily'];
};

const COLORWAYS: Colorway[] = [
  { name: 'black', hex: '#181816', accent: '#2c2c29', family: 'neutral' },
  { name: 'washed black', hex: '#2c2a26', accent: '#3e3b36', family: 'neutral' },
  { name: 'charcoal', hex: '#3c3b37', accent: '#4e4d48', family: 'neutral' },
  { name: 'grey marl', hex: '#8e8c84', accent: '#7b7971', family: 'neutral' },
  { name: 'stone', hex: '#b6aea0', accent: '#a29a8c', family: 'neutral' },
  { name: 'bone', hex: '#e5decf', accent: '#d2cab9', family: 'neutral' },
  { name: 'ecru', hex: '#dcd2bd', accent: '#c8bda6', family: 'neutral' },
  { name: 'cream', hex: '#efe7d6', accent: '#ddd3c0', family: 'neutral' },
  { name: 'sand', hex: '#cbb798', accent: '#b7a283', family: 'earth' },
  { name: 'taupe', hex: '#9c8d78', accent: '#877964', family: 'earth' },
  { name: 'clay', hex: '#a87359', accent: '#946148', family: 'earth' },
  { name: 'rust', hex: '#9a5434', accent: '#834429', family: 'earth' },
  { name: 'oxblood', hex: '#5e2a27', accent: '#4a201e', family: 'warm' },
  { name: 'olive', hex: '#6c6f4f', accent: '#585b40', family: 'earth' },
  { name: 'moss', hex: '#4b5640', accent: '#3c4633', family: 'earth' },
  { name: 'navy', hex: '#202b3c', accent: '#2b3a4f', family: 'cool' },
  { name: 'indigo', hex: '#303b56', accent: '#3e4a66', family: 'cool' },
  { name: 'slate', hex: '#55687a', accent: '#455767', family: 'cool' },
  { name: 'powder', hex: '#a8b7c0', accent: '#94a3ac', family: 'cool' },
  { name: 'mustard', hex: '#b0893e', accent: '#987332', family: 'earth' },
  { name: 'forest', hex: '#2f4435', accent: '#26392c', family: 'cool' },
];

const DESCRIPTORS: Record<GarmentKind, string[]> = {
  tee: ['boxy', 'washed', 'heavyweight', 'relaxed', 'ribbed', 'long sleeve'],
  shirt: ['oxford', 'poplin', 'camp collar', 'oversized', 'linen', 'brushed'],
  knit: ['merino', 'loopback', 'ribbed', 'chunky', 'fine gauge', 'half zip'],
  hoodie: ['loopback', 'garment dyed', 'heavyweight', 'zip', 'boxy'],
  flannel: ['brushed', 'checked', 'heavyweight', 'oversized', 'wool blend'],
  trousers: ['pleated', 'pressed', 'wide leg', 'tapered', 'drawstring', 'wool'],
  jeans: ['straight', 'relaxed', 'rigid', 'faded', 'cropped'],
  shorts: ['tailored', 'cotton', 'pleated', 'swim'],
  jacket: ['field', 'bomber', 'overshirt', 'harrington', 'wool', 'shell'],
  coat: ['longline', 'belted', 'double breasted', 'quilted', 'rain', 'wool'],
  sneaker: ['leather', 'canvas', 'runner', 'court', 'trail'],
  boot: ['chelsea', 'hiking', 'work', 'chukka'],
  loafer: ['penny', 'suede', 'driving'],
  cap: ['six panel', 'washed', 'corduroy', 'wool'],
  bag: ['tote', 'weekender', 'crossbody', 'rucksack', 'document'],
};

const NOUNS: Record<Category, string> = {
  tops: 'top',
  bottoms: 'bottom',
  jackets: 'jacket',
  shoes: 'shoe',
  caps: 'cap',
  bags: 'bag',
};

const FABRIC: Record<GarmentKind, string> = {
  tee: 'heavy cotton jersey',
  shirt: 'brushed cotton poplin',
  knit: 'merino wool',
  hoodie: 'loopback cotton',
  flannel: 'brushed cotton flannel',
  trousers: 'wool twill',
  jeans: 'rigid denim',
  shorts: 'dry cotton twill',
  jacket: 'dry waxed cotton',
  coat: 'double faced wool',
  sneaker: 'full grain leather',
  boot: 'oiled suede',
  loafer: 'polished leather',
  cap: 'washed cotton',
  bag: 'coated canvas',
};

const NOTES: Record<GarmentKind, string[]> = {
  tee: ['it sits away from the body and holds its shape.', 'soft from the first wear, with a clean hem.'],
  shirt: ['sharp enough for the office, easy enough for the weekend.', 'breaks in slowly and only gets better.'],
  knit: ['warm without bulk, and quiet under a jacket.', 'an easy layer for the shoulder seasons.'],
  hoodie: ['a soft hood and a heavy body.', 'made for slow mornings and cold kitchens.'],
  flannel: ['brushed until it is soft, checked enough to carry a plain outfit.', 'worn open over a tee, or buttoned to the neck.'],
  trousers: ['a straight line from waist to hem.', 'pressed enough to look intentional.'],
  jeans: ['worn in at the knee, honest at the hem.', 'the kind of denim that maps to your week.'],
  shorts: ['cut clean above the knee.', 'made for slow, warm afternoons.'],
  jacket: ['the piece that finishes the whole thing.', 'structured enough to carry a plain outfit.'],
  coat: ['long enough to cover a suit, easy enough for denim.', 'the outer layer that does the most work.'],
  sneaker: ['broken in, never beaten up.', 'quiet enough to go with everything.'],
  boot: ['a solid sole and a clean toe.', 'made for wet pavements and long walks.'],
  loafer: ['slim, polished, and a little formal.', 'the easy answer to a smart request.'],
  cap: ['a low crown and a soft brim.', 'good for bad hair days and long walks.'],
  bag: ['holds a laptop, a book and the rest.', 'structured enough to stand on its own.'],
};

const BRANDS = [
  'arket',
  'cos',
  'our legacy',
  'studio nicholson',
  'acne studios',
  'lemaire',
  'mfpen',
  'norse projects',
  'common projects',
  'paraboot',
  'porter',
  'nanamica',
];

const CATEGORY_TARGETS: Record<Category, number> = {
  tops: 44,
  bottoms: 36,
  jackets: 32,
  shoes: 32,
  caps: 22,
  bags: 22,
};

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, list: T[]): T {
  return list[Math.floor(rng() * list.length) % list.length];
}

function dedupeWords(value: string): string {
  const seen = new Set<string>();
  return value
    .split(' ')
    .filter((word) => {
      if (seen.has(word)) return false;
      seen.add(word);
      return true;
    })
    .join(' ');
}

export type DemoCloset = {
  garments: Garment[];
  wearEvents: WearEvent[];
  boards: OutfitBoard[];
  savedLooks: SavedLook[];
};

export function buildDemoCloset(now: Date = new Date()): DemoCloset {
  const rng = mulberry32(0x63726573); // "cres"
  const garments: Garment[] = [];
  const usedNames = new Set<string>();
  let index = 0;

  (Object.keys(CATEGORY_TARGETS) as Category[]).forEach((category, categoryIndex) => {
    const kinds = KINDS_BY_CATEGORY[category];
    for (let i = 0; i < CATEGORY_TARGETS[category]; i += 1) {
      const kind = kinds[i % kinds.length];
      // 8 and 21 are coprime, so colourways cycle through the whole palette.
      const color = COLORWAYS[(i * 8 + categoryIndex * 5 + 3) % COLORWAYS.length];
      let descriptor = DESCRIPTORS[kind][i % DESCRIPTORS[kind].length];
      let name = dedupeWords(`${color.name} ${descriptor} ${kind}`);
      let attempts = 0;
      while (usedNames.has(name) && attempts < 40) {
        descriptor = DESCRIPTORS[kind][(i + attempts + 1) % DESCRIPTORS[kind].length];
        name = dedupeWords(`${color.name} ${descriptor} ${kind}`);
        attempts += 1;
      }
      if (usedNames.has(name)) name = `${name} ${index + 1}`;
      usedNames.add(name);

      const id = `g${`${index + 1}`.padStart(3, '0')}`;
      const note = NOTES[kind][hash(`${id}-note`) % NOTES[kind].length];
      garments.push({
        id,
        name,
        category,
        kind,
        colorName: color.name,
        color: color.hex,
        accent: color.accent,
        colorFamily: color.family,
        description: `a ${color.name} ${NOUNS[category]} in ${FABRIC[kind]}. ${note}`,
        sourceBrand: BRANDS[hash(`${id}-brand`) % BRANDS.length],
        addedAt: addDays(now, -(20 + (hash(id) % 320))).toISOString(),
        sourceOutfitIds: [],
        demo: true,
      });
      index += 1;
    }
  });

  // Outfit boards: one piece from each of the core slots, plus an optional layer.
  const byCategory: Record<Category, Garment[]> = {
    tops: [],
    bottoms: [],
    jackets: [],
    shoes: [],
    caps: [],
    bags: [],
  };
  garments.forEach((garment) => byCategory[garment.category].push(garment));

  const boards: OutfitBoard[] = [];
  for (let i = 0; i < 12; i += 1) {
    const useLayer = i % 3 !== 2;
    const itemIds = [
      byCategory.tops[(i * 3 + 1) % byCategory.tops.length].id,
      byCategory.bottoms[(i * 5 + 2) % byCategory.bottoms.length].id,
      byCategory.shoes[(i * 7 + 3) % byCategory.shoes.length].id,
      useLayer ? byCategory.jackets[(i * 11 + 4) % byCategory.jackets.length].id : undefined,
      i % 4 === 1 ? byCategory.caps[i % byCategory.caps.length].id : undefined,
      i % 4 === 3 ? byCategory.bags[i % byCategory.bags.length].id : undefined,
    ].filter((value): value is string => Boolean(value));

    boards.push({
      id: `board-${`${i + 1}`.padStart(2, '0')}`,
      label: `look ${`${i + 1}`.padStart(2, '0')}`,
      itemIds,
      demo: true,
    });
  }

  boards.forEach((board) => {
    board.itemIds.forEach((id) => {
      const garment = garments.find((piece) => piece.id === id);
      if (garment && !garment.sourceOutfitIds.includes(board.id)) {
        garment.sourceOutfitIds.push(board.id);
      }
    });
  });

  // Deterministic wear history: a believable rotation with real neglected pieces.
  const wearEvents: WearEvent[] = [];
  garments.forEach((garment, garmentIndex) => {
    const never = garmentIndex % 9 === 0;
    if (never) return;
    const count = 1 + (hash(`${garment.id}-wear`) % 11);
    for (let k = 0; k < count; k += 1) {
      const offset = 2 + (hash(`${garment.id}-${k}`) % 170);
      const wornAt = addDays(now, -offset);
      wearEvents.push({
        id: `seed-${garment.id}-${k}`,
        garmentIds: [garment.id],
        date: dateKey(wornAt),
        loggedAt: wornAt.toISOString(),
        source: 'seed',
      });
    }
  });

  // Two saved looks so the You tab has something honest to show in the demo.
  const savedLookTitles = ['off duty', 'work, sorted'];
  const savedLooks: SavedLook[] = boards.slice(0, 2).map((board, i) => {
    const itemIds = board.itemIds;
    return {
      id: `saved-demo-${i + 1}`,
      key: lookKey(itemIds),
      title: savedLookTitles[i],
      note: i === 0 ? 'denim, a soft top, and the boots that go with everything.' : 'the quiet office uniform.',
      itemIds,
      savedAt: addDays(now, -(i + 2)).toISOString(),
      demo: true,
    };
  });

  return { garments, wearEvents, boards, savedLooks };
}

export function lookKey(itemIds: string[]): string {
  return [...itemIds].sort().join('|');
}

export function demoBoardsForGarment(boards: OutfitBoard[], garment: Garment): OutfitBoard[] {
  return boards.filter((board) => garment.sourceOutfitIds.includes(board.id) || board.itemIds.includes(garment.id));
}
