import {
  ChatContext,
  GarmentView,
  LookRequest,
  Occasion,
  PackingPlan,
  ProposedLook,
  WeatherKey,
} from '../types';
import { KIND_FORMALITY, KIND_NOUN, isNeutral } from '../lib/garmentFacts';

/**
 * The stylist is deliberately local: every suggestion is composed from pieces
 * actually in the wardrobe, and every answer can name the pieces it used.
 * No network model is called, so nothing is invented.
 */

export type StylistReply =
  | { kind: 'message'; text: string[]; chips?: string[]; pieces?: string[] }
  | { kind: 'looks'; text: string[]; looks: ProposedLook[]; chips?: string[] }
  | { kind: 'packing'; text: string[]; plan: PackingPlan; chips?: string[] }
  | { kind: 'clarify'; text: string[]; chips: string[] };

export type StylistResponse = {
  reply: StylistReply;
  context: ChatContext;
  lookRequest?: LookRequest;
};

export type StylistOptions = {
  garments: GarmentView[];
  context: ChatContext;
  weather: WeatherKey | null;
  now?: Date;
  anchorOverride?: string[];
};

const WEATHER_LABEL: Record<WeatherKey, string> = {
  cold: 'cold',
  mild: 'mild',
  warm: 'warm',
  rainy: 'rainy',
};

const TITLES: Record<Occasion, [string, string]> = {
  work: ['work, sorted', 'work, softer'],
  dinner: ['tonight', 'dinner, later'],
  casual: ['off duty', 'off duty, again'],
  formal: ['the ceremony', 'after hours'],
  gym: ['training', 'cool down'],
  travel: ['travel day', 'landing'],
  none: ['today', 'today, otherwise'],
};

const TARGET_FORMALITY: Record<Occasion, number> = {
  work: 3,
  dinner: 2.6,
  casual: 1.3,
  formal: 4,
  gym: 0.7,
  travel: 1.6,
  none: 2,
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
};

const KIND_WORDS: Record<string, GarmentView['kind']> = {
  tee: 'tee',
  tees: 'tee',
  tshirt: 'tee',
  't-shirt': 'tee',
  shirt: 'shirt',
  shirts: 'shirt',
  knit: 'knit',
  sweater: 'knit',
  jumper: 'knit',
  trousers: 'trousers',
  pants: 'trousers',
  slacks: 'trousers',
  jeans: 'jeans',
  denim: 'jeans',
  shorts: 'shorts',
  jacket: 'jacket',
  jackets: 'jacket',
  blazer: 'jacket',
  overshirt: 'jacket',
  coat: 'coat',
  coats: 'coat',
  trench: 'coat',
  overcoat: 'coat',
  shoe: 'sneaker',
  shoes: 'sneaker',
  sneaker: 'sneaker',
  sneakers: 'sneaker',
  trainers: 'sneaker',
  boot: 'boot',
  boots: 'boot',
  loafer: 'loafer',
  loafers: 'loafer',
  cap: 'cap',
  hat: 'cap',
  bag: 'bag',
  tote: 'bag',
  rucksack: 'bag',
};

function seededUnit(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function formatList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function numberWord(value: number): string {
  const entry = Object.entries(NUMBER_WORDS).find(([, n]) => n === value);
  return entry ? entry[0] : `${value}`;
}

function normalise(input: string): string {
  return input.toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();
}

function detectOccasion(text: string): Occasion | null {
  if (/(wedding|ceremony|black tie|gala|funeral)/.test(text)) return 'formal';
  if (/(work|office|meeting|interview|presentation|client|commute)/.test(text)) return 'work';
  if (/(dinner|date night|date|drinks|restaurant|evening|night out|party)/.test(text)) return 'dinner';
  if (/(gym|workout|training|running|run\b)/.test(text)) return 'gym';
  if (/(travel|flight|airport|trip\b)/.test(text)) return 'travel';
  if (/(casual|off duty|weekend|errand|coffee|walk|brunch|relaxed)/.test(text)) return 'casual';
  return null;
}

function detectWeather(text: string): WeatherKey | null {
  if (/(rain|raining|wet|drizzle|storm|snow)/.test(text)) return 'rainy';
  if (/(cold|freezing|chilly|frost)/.test(text)) return 'cold';
  if (/(hot|warm|heat|sunny|humid)/.test(text)) return 'warm';
  return null;
}

type AnchorMatch = {
  anchor: GarmentView | null;
  candidates: GarmentView[];
};

function resolveAnchor(text: string, garments: GarmentView[]): AnchorMatch {
  const exact = garments
    .filter((garment) => garment.name.length >= 5 && text.includes(garment.name))
    .sort((a, b) => b.name.length - a.name.length);
  if (exact.length > 0) {
    const uniqueNames = exact.filter(
      (garment, index, list) => list.findIndex((entry) => entry.name === garment.name) === index,
    );
    if (uniqueNames.length === 1) return { anchor: uniqueNames[0], candidates: uniqueNames };
    return { anchor: null, candidates: uniqueNames.slice(0, 3) };
  }

  const tokens = text.split(/[^a-z-]+/).filter(Boolean);
  const kindTokens = tokens
    .map((token) => KIND_WORDS[token])
    .filter((kind): kind is GarmentView['kind'] => Boolean(kind));
  if (kindTokens.length === 0) return { anchor: null, candidates: [] };

  const wantedKinds = new Set(kindTokens);
  const colorTokens = new Set(
    garments
      .flatMap((garment) => garment.colorName.split(' '))
      .filter((token) => token.length > 2 && text.includes(token)),
  );

  let candidates = garments.filter((garment) => wantedKinds.has(garment.kind));
  if (colorTokens.size > 0) {
    const phrase = [...colorTokens].join(' ');
    const exactName = candidates.filter((garment) => garment.colorName === phrase);
    const contains = candidates.filter((garment) =>
      [...colorTokens].every((token) => garment.colorName.includes(token)),
    );
    if (exactName.length > 0) candidates = exactName;
    else if (contains.length > 0) candidates = contains;
  }

  const unique = candidates.filter(
    (garment, index, list) => list.findIndex((entry) => entry.id === garment.id) === index,
  );
  if (unique.length === 1) return { anchor: unique[0], candidates: unique };
  return { anchor: null, candidates: unique.slice(0, 3) };
}

function candidatesFor(garments: GarmentView[], category: GarmentView['category'], occasion: Occasion) {
  let list = garments.filter((garment) => garment.category === category);
  if (occasion === 'gym') {
    if (category === 'tops') list = list.filter((garment) => ['tee', 'hoodie'].includes(garment.kind));
    if (category === 'bottoms') list = list.filter((garment) => garment.kind === 'shorts');
    if (category === 'shoes') list = list.filter((garment) => garment.kind === 'sneaker');
    if (category === 'jackets' || category === 'caps' || category === 'bags') list = [];
  }
  if (occasion === 'formal') {
    if (category === 'tops') list = list.filter((garment) => garment.kind === 'shirt' || garment.kind === 'knit');
    if (category === 'bottoms') list = list.filter((garment) => garment.kind === 'trousers');
    if (category === 'shoes') list = list.filter((garment) => garment.kind === 'loafer' || garment.kind === 'boot');
    if (category === 'caps') list = [];
  }
  return list;
}

function weatherFit(garment: GarmentView, weather: WeatherKey | null): number {
  if (!weather) return 0;
  if (weather === 'cold') {
    if (['coat', 'knit', 'boot', 'jacket', 'hoodie', 'flannel'].includes(garment.kind)) return 1.1;
    if (['tee', 'shorts', 'sneaker'].includes(garment.kind)) return -0.6;
  }
  if (weather === 'warm') {
    if (['tee', 'shorts', 'sneaker', 'cap'].includes(garment.kind)) return 0.9;
    if (['coat', 'boot'].includes(garment.kind)) return -1;
  }
  if (weather === 'rainy') {
    if (garment.kind === 'sneaker') return -0.8;
    if (['boot', 'coat', 'jacket'].includes(garment.kind)) return 1;
  }
  if (weather === 'mild') {
    if (['knit', 'shirt', 'jacket', 'loafer', 'sneaker'].includes(garment.kind)) return 0.4;
  }
  return 0;
}

function pickForSlot(
  list: GarmentView[],
  options: {
    target: number;
    weather: WeatherKey | null;
    key: string;
    excluded: Set<string>;
    locked?: GarmentView | null;
  },
): GarmentView | null {
  if (options.locked) return options.locked;
  if (list.length === 0) return null;
  const scored = list
    .map((garment) => {
      let score = 4.4 - Math.abs(KIND_FORMALITY[garment.kind] - options.target) * 1.25;
      score += weatherFit(garment, options.weather);
      score += isNeutral(garment.colorName) ? 0.35 : 0;
      score += garment.wearCount === 0 ? 0.45 : 0;
      score += Math.min(garment.wearCount, 8) * 0.02;
      score += seededUnit(`${options.key}:${garment.id}`) * 1.3;
      if (options.excluded.has(garment.id)) score -= 3;
      return { garment, score };
    })
    .sort((a, b) => b.score - a.score || a.garment.id.localeCompare(b.garment.id));
  return scored[0]?.garment ?? null;
}

function describePiece(garment: GarmentView): string {
  return `${garment.colorName} ${KIND_NOUN[garment.kind]}`;
}

function lookNote(
  look: { top: GarmentView | null; bottom: GarmentView | null; shoes: GarmentView | null; outer: GarmentView | null },
  anchor: GarmentView | null,
  seed: string,
): string {
  const starts = ['clean and easy.', 'quiet, but considered.', 'built for a long day.', 'sharp without trying.'];
  const start = starts[Math.floor(seededUnit(`note:${seed}`) * starts.length) % starts.length];
  if (anchor) {
    return `${start} the ${anchor.name} stays on. ${look.bottom ? `${describePiece(look.bottom)} below` : ''}${
      look.shoes ? `, ${describePiece(look.shoes)} to finish.` : '.'
    }`.replace(/\s+/g, ' ').replace(' .', '.');
  }
  const parts: string[] = [];
  if (look.top) parts.push(`${describePiece(look.top)} on top`);
  if (look.bottom) parts.push(`${describePiece(look.bottom)} below`);
  if (look.shoes) parts.push(`${describePiece(look.shoes)} to finish`);
  if (look.outer) parts.unshift(`the ${look.outer.name} does the work`);
  return `${start} ${formatList(parts)}.`.replace(/\s+/g, ' ');
}

/**
 * Builds two grounded looks. Anchors are always included; the second look
 * deliberately differs from the first on the core slots.
 */
export function composeLooks(
  garments: GarmentView[],
  request: LookRequest,
  options: { count?: number; excludeKeys?: string[] } = {},
): ProposedLook[] {
  const count = options.count ?? 2;
  const excludedKeys = new Set(options.excludeKeys ?? []);
  const anchorSet = new Set(request.anchorIds);
  const anchors = garments.filter((garment) => anchorSet.has(garment.id));
  const target = TARGET_FORMALITY[request.occasion];
  const looks: ProposedLook[] = [];
  const usedCore = new Set<string>();

  for (let variant = 0; variant < count + 1 && looks.length < count; variant += 1) {
    const excluded = new Set<string>([...usedCore]);
    const anchorFor = (category: GarmentView['category']) =>
      anchors.find((anchor) => anchor.category === category) ?? null;

    const top = pickForSlot(candidatesFor(garments, 'tops', request.occasion), {
      target,
      weather: request.weather,
      key: `${request.occasion}:${request.salt}:${variant}:top`,
      excluded,
      locked: anchorFor('tops'),
    });
    const bottom = pickForSlot(candidatesFor(garments, 'bottoms', request.occasion), {
      target,
      weather: request.weather,
      key: `${request.occasion}:${request.salt}:${variant}:bottom`,
      excluded,
      locked: anchorFor('bottoms'),
    });
    const shoes = pickForSlot(candidatesFor(garments, 'shoes', request.occasion), {
      target,
      weather: request.weather,
      key: `${request.occasion}:${request.salt}:${variant}:shoes`,
      excluded,
      locked: anchorFor('shoes'),
    });

    const wantsOuter =
      !request.skipOuter &&
      Boolean(anchorFor('jackets')) ||
      (!request.skipOuter &&
        (['work', 'formal', 'dinner', 'travel'].includes(request.occasion) ||
          request.weather === 'cold' ||
          request.weather === 'rainy' ||
          (request.occasion === 'none' && seededUnit(`outer:${request.salt}:${variant}`) > 0.5)));

    const outer = wantsOuter
      ? pickForSlot(candidatesFor(garments, 'jackets', request.occasion), {
          target: target + 0.4,
          weather: request.weather,
          key: `${request.occasion}:${request.salt}:${variant}:outer`,
          excluded,
          locked: anchorFor('jackets'),
        })
      : null;

    const wantsCap =
      Boolean(anchorFor('caps')) ||
      (request.occasion !== 'formal' &&
        request.occasion !== 'gym' &&
        request.occasion !== 'work' &&
        seededUnit(`cap:${request.salt}:${variant}`) > 0.55);
    const cap = wantsCap
      ? pickForSlot(candidatesFor(garments, 'caps', request.occasion), {
          target,
          weather: request.weather,
          key: `${request.occasion}:${request.salt}:${variant}:cap`,
          excluded,
          locked: anchorFor('caps'),
        })
      : null;

    const wantsBag =
      Boolean(anchorFor('bags')) || ['work', 'travel', 'formal'].includes(request.occasion);
    const bag = wantsBag
      ? pickForSlot(candidatesFor(garments, 'bags', request.occasion), {
          target,
          weather: request.weather,
          key: `${request.occasion}:${request.salt}:${variant}:bag`,
          excluded,
          locked: anchorFor('bags'),
        })
      : null;

    const chosen = [top, bottom, outer, shoes, cap, bag].filter(
      (garment): garment is GarmentView => Boolean(garment),
    );
    const unique = chosen.filter(
      (garment, index, list) => list.findIndex((entry) => entry.id === garment.id) === index,
    );
    if (unique.length < 2) continue;

    const key = unique
      .map((garment) => garment.id)
      .sort()
      .join('|');
    if (excludedKeys.has(key) || looks.some((look) => look.key === key)) continue;

    looks.push({
      key,
      title: TITLES[request.occasion][Math.min(variant, 1)],
      note: lookNote({ top, bottom, shoes, outer }, anchors[0] ?? null, `${key}:${variant}`),
      itemIds: unique.map((garment) => garment.id),
    });

    [top, bottom, shoes].forEach((garment) => {
      if (garment && !anchorSet.has(garment.id)) usedCore.add(garment.id);
    });
  }

  return looks;
}

function underusedPieces(garments: GarmentView[], now: Date, limit = 6): GarmentView[] {
  return [...garments]
    .filter((garment) => garment.wearCount <= 2 || (garment.lastWornDays ?? 999) > 50)
    .sort((a, b) => {
      if (a.wearCount !== b.wearCount) return a.wearCount - b.wearCount;
      return (b.lastWornDays ?? 999) - (a.lastWornDays ?? 999);
    })
    .slice(0, limit);
}

function similarPieces(reference: GarmentView, garments: GarmentView[], limit = 4): GarmentView[] {
  return garments
    .filter((garment) => garment.id !== reference.id)
    .map((garment) => {
      let score = 0;
      if (garment.kind === reference.kind) score += 3;
      if (garment.category === reference.category) score += 1;
      if (garment.colorFamily === reference.colorFamily) score += 2;
      if (isNeutral(garment.colorName)) score += 0.3;
      return { garment, score };
    })
    .filter((entry) => entry.score >= 2)
    .sort((a, b) => b.score - a.score || a.garment.id.localeCompare(b.garment.id))
    .slice(0, limit)
    .map((entry) => entry.garment);
}

function packingDays(text: string): number {
  const digit = text.match(/\b(\d{1,2})\b/);
  if (digit) return Math.max(1, Math.min(14, Number(digit[1])));
  if (/\bweekend\b/.test(text)) return 2;
  if (/\b(week|seven days)\b/.test(text)) return 7;
  for (const [word, days] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) return days;
  }
  return 5;
}

export function buildPackingPlan(
  garments: GarmentView[],
  days: number,
  weather: WeatherKey | null,
  salt: number,
): PackingPlan | null {
  if (garments.length === 0) return null;
  const ordered = [...garments].sort((a, b) => {
    if (a.wearCount !== b.wearCount) return a.wearCount - b.wearCount;
    return (b.lastWornDays ?? 999) - (a.lastWornDays ?? 999);
  });
  const used = new Set<string>();
  const pickMany = (category: GarmentView['category'], amount: number) => {
    const picked = ordered
      .filter((garment) => garment.category === category && !used.has(garment.id))
      .slice(0, amount);
    picked.forEach((garment) => used.add(garment.id));
    return picked;
  };

  const tops = pickMany('tops', Math.min(days + 1, 6));
  const bottoms = pickMany('bottoms', Math.max(2, Math.ceil(days / 2)));
  const jackets = pickMany('jackets', weather === 'cold' || weather === 'rainy' ? 2 : 1);
  const shoes = pickMany('shoes', 2);
  const caps = pickMany('caps', 1);
  const bags = pickMany('bags', 1);

  const sections = [
    { label: 'tops', items: tops },
    { label: 'bottoms', items: bottoms },
    { label: 'jackets', items: jackets },
    { label: 'shoes', items: shoes },
    { label: 'caps', items: caps },
    { label: 'bags', items: bags },
  ]
    .filter((section) => section.items.length > 0)
    .map((section) => ({ label: section.label, itemIds: section.items.map((garment) => garment.id) }));

  const capsuleGarments = [tops, bottoms, jackets, shoes, caps, bags].flat();
  const looks = composeLooks(capsuleGarments, {
    occasion: 'travel',
    anchorIds: [],
    salt: salt + 7,
    weather,
  });

  return {
    title: `${numberWord(days)} ${days === 1 ? 'day' : 'days'}, one bag`,
    days,
    sections,
    looks,
  };
}

function looksResponse(
  garments: GarmentView[],
  occasion: Occasion,
  weather: WeatherKey | null,
  context: ChatContext,
  salt: number,
  anchorIds: string[] = [],
  intro = 'two ways in.',
): StylistResponse {
  const request: LookRequest = { occasion, anchorIds, salt, weather };
  const looks = composeLooks(garments, request);
  if (looks.length === 0) {
    return {
      reply: {
        kind: 'message',
        text: ['i need one more piece before i can put a full look together. add a top, a bottom and shoes to your closet.'],
        chips: ['what can you do?'],
      },
      context: { ...context, occasion, anchorIds, weather },
    };
  }
  const keys = looks.map((look) => look.key);
  return {
    reply: {
      kind: 'looks',
      text: [intro],
      looks,
      chips: ['make it warmer', 'something more casual', 'shuffle'],
    },
    context: {
      ...context,
      occasion,
      weather,
      anchorIds,
      lastLookKeys: [...context.lastLookKeys, ...keys].slice(-6),
    },
    lookRequest: request,
  };
}

export function respond(input: string, options: StylistOptions): StylistResponse {
  const now = options.now ?? new Date();
  const text = normalise(input);
  const baseContext: ChatContext = { ...options.context, weather: options.weather };
  const anchorOverride = options.anchorOverride ?? [];

  if (!text && anchorOverride.length === 0) {
    return {
      reply: { kind: 'clarify', text: ['what would you like to wear?'], chips: ['work', 'dinner', 'off duty'] },
      context: baseContext,
    };
  }

  // 1. anchored request ("style this", "build around my black jacket")
  const overrideGarments = options.garments.filter((garment) => anchorOverride.includes(garment.id));
  const match = resolveAnchor(text, options.garments);
  const explicitAnchor = overrideGarments[0] ?? match.anchor;
  const anchorCandidates = match.candidates;

  // 2. packing
  if (/\b(pack|packing|suitcase|trip)\b|days? away|for (a )?(week|weekend|\w+ days)/.test(text)) {
    const days = packingDays(text);
    const weather = detectWeather(text) ?? options.weather;
    const plan = buildPackingPlan(options.garments, days, weather, days);
    if (!plan) {
      return {
        reply: { kind: 'message', text: ['your closet is empty, so there is nothing to pack yet.'], chips: ['what can you do?'] },
        context: baseContext,
      };
    }
    const pieces = plan.sections.reduce((sum, section) => sum + section.itemIds.length, 0);
    return {
      reply: {
        kind: 'packing',
        text: [
          `${plan.title}. ${pieces} pieces, built around what you already wear least.`,
          'the two looks are starting points — the capsule is made to mix.',
        ],
        plan,
        chips: ['make it warmer', 'what haven’t i worn lately?'],
      },
      context: { ...baseContext, occasion: 'travel', weather, anchorIds: baseContext.anchorIds },
    };
  }

  // 3. underused review
  if (/(haven'?t|have not) (i )?worn|not worn|underused|neglected|forgotten|worn lately|rotation/.test(text)) {
    const pieces = underusedPieces(options.garments, now);
    if (pieces.length === 0) {
      return {
        reply: { kind: 'message', text: ['you are rotating everything. nothing is sitting idle right now.'], chips: ['what should i wear today?'] },
        context: baseContext,
      };
    }
    const names = pieces.slice(0, 3).map((piece) => piece.name);
    return {
      reply: {
        kind: 'message',
        text: [
          `${pieces.length} pieces have been quiet for a while.`,
          `${formatList(names)} are the easiest pieces to start with.`,
        ],
        pieces: pieces.map((piece) => piece.id),
        chips: [...pieces.slice(0, 2).map((piece) => `build a look around the ${piece.name}`), 'surprise me'],
      },
      context: baseContext,
    };
  }

  // 4. similarity check
  if (/similar|already own|duplicate|anything like|same as/.test(text)) {
    const reference = explicitAnchor ?? options.garments.find((garment) => baseContext.anchorIds.includes(garment.id));
    if (!reference) {
      return {
        reply: {
          kind: 'clarify',
          text: ['similar to what? name a piece and i’ll compare it with the rest of your closet.'],
          chips: options.garments.slice(0, 3).map((garment) => `similar to the ${garment.name}`),
        },
        context: baseContext,
      };
    }
    const similar = similarPieces(reference, options.garments);
    if (similar.length === 0) {
      return {
        reply: {
          kind: 'message',
          text: [`nothing in your closet sits close to the ${reference.name}. it is doing its own thing.`],
          chips: [`build a look around the ${reference.name}`, 'what should i wear today?'],
        },
        context: { ...baseContext, anchorIds: [reference.id] },
      };
    }
    return {
      reply: {
        kind: 'message',
        text: [
          `${similar.length} pieces sit close to the ${reference.name}.`,
          'same shape, a different note. worth trying before you buy anything new.',
        ],
        pieces: similar.map((garment) => garment.id),
        chips: [`build a look around the ${reference.name}`, 'show me underused pieces'],
      },
      context: { ...baseContext, anchorIds: [reference.id] },
    };
  }

  // 5. weather
  if (/weather|is it (going to )?rain|how (cold|warm) is it/.test(text) && !detectOccasion(text)) {
    if (options.weather) {
      return {
        reply: {
          kind: 'message',
          text: [`i have it as ${WEATHER_LABEL[options.weather]}. i’ll style for that.`],
          chips: ['what should i wear today?', 'pack for five days'],
        },
        context: { ...baseContext, weather: options.weather },
      };
    }
    return {
      reply: {
        kind: 'clarify',
        text: ['i can’t see live weather here. what is it like outside?'],
        chips: ['cold', 'mild', 'warm', 'raining'],
      },
      context: baseContext,
    };
  }

  // 6. an exact weather answer to a clarification (chips send a single word)
  const weatherAnswer = detectWeather(text);
  const isWeatherWord = /^(cold|mild|warm|hot|raining|rainy|chilly|freezing|snow)$/.test(text);
  if (weatherAnswer && isWeatherWord && !detectOccasion(text)) {
    return {
      reply: {
        kind: 'message',
        text: [`noted, ${WEATHER_LABEL[weatherAnswer]}. where are you going?`],
        chips: ['work', 'dinner', 'off duty'],
      },
      context: { ...baseContext, weather: weatherAnswer },
    };
  }

  // 7. shuffle / another
  if (/shuffle|another|something else|different|try again/.test(text) && !detectOccasion(text)) {
    const occasion = baseContext.occasion ?? 'none';
    const anchorIds = baseContext.anchorIds;
    const request: LookRequest = {
      occasion,
      anchorIds,
      salt: baseContext.lastLookKeys.length + 3,
      weather: options.weather,
    };
    const looks = composeLooks(options.garments, request, { excludeKeys: baseContext.lastLookKeys });
    if (looks.length > 0) {
      return {
        reply: {
          kind: 'looks',
          text: ['another pass.'],
          looks,
          chips: ['make it warmer', 'shuffle'],
        },
        context: {
          ...baseContext,
          occasion,
          anchorIds,
          lastLookKeys: [...baseContext.lastLookKeys, ...looks.map((look) => look.key)].slice(-6),
        },
        lookRequest: request,
      };
    }
  }

  // 8. conversational basics
  if (/^(hi|hey|hello|yo|good (morning|afternoon|evening))\b/.test(text)) {
    return {
      reply: {
        kind: 'message',
        text: ['hello. tell me where you’re going, or name a piece you want to start with.'],
        chips: ['what should i wear for dinner?', 'what haven’t i worn lately?'],
      },
      context: baseContext,
    };
  }
  if (/thank/.test(text)) {
    return {
      reply: { kind: 'message', text: ['anytime. i’ll be here.'], chips: ['build another look'] },
      context: baseContext,
    };
  }
  if (/(what can you do|how does this work|help|who are you)/.test(text)) {
    return {
      reply: {
        kind: 'message',
        text: [
          'i am your stylist. i only use what is already in your closet.',
          'ask for an occasion, name a piece to build around, ask what you haven’t worn, or ask me to pack a bag.',
        ],
        chips: ['what should i wear for dinner?', 'what haven’t i worn lately?', 'pack for five days'],
      },
      context: baseContext,
    };
  }

  // 9. a modifier follow-up ("make it warmer", "less formal")
  if (/(warmer|warm me|less formal|more casual|colder|smarter|more formal)/.test(text)) {
    const adjustedWeather = /colder/.test(text) ? 'cold' : /warmer/.test(text) ? 'warm' : options.weather;
    const adjustedOccasion: Occasion = /more casual|less formal/.test(text)
      ? 'casual'
      : /smarter|more formal/.test(text)
        ? 'work'
        : baseContext.occasion ?? 'none';
    return looksResponse(
      options.garments,
      adjustedOccasion,
      adjustedWeather,
      baseContext,
      (baseContext.lastLookKeys.length + 2) % 97,
      baseContext.anchorIds,
      'adjusted.',
    );
  }

  // 10. garment reference with no occasion: build around it
  if (explicitAnchor) {
    return looksResponse(
      options.garments,
      baseContext.occasion ?? 'none',
      options.weather,
      baseContext,
      (baseContext.lastLookKeys.length + 1) % 97,
      [explicitAnchor.id],
      `starting with the ${explicitAnchor.name}.`,
    );
  }

  if (anchorCandidates.length > 1) {
    return {
      reply: {
        kind: 'clarify',
        text: [`i have a few pieces that could be it. which one?`],
        chips: anchorCandidates.map((garment) => garment.name),
      },
      context: baseContext,
    };
  }

  // 11. occasion detected without a full request
  const occasion = detectOccasion(text);
  if (occasion) {
    const weather = detectWeather(text) ?? options.weather;
    return looksResponse(
      options.garments,
      occasion,
      weather,
      baseContext,
      (baseContext.lastLookKeys.length + 1) % 97,
      baseContext.anchorIds,
      `two for ${occasion === 'none' ? 'today' : occasion}.`,
    );
  }

  if (/surprise me|surprise/.test(text)) {
    return looksResponse(options.garments, 'casual', options.weather, baseContext, 5, [], 'off the cuff.');
  }

  // 12. generic styling request: ask rather than guess
  if (/wear|outfit|look|style|dress|put together/.test(text)) {
    return {
      reply: {
        kind: 'clarify',
        text: ['where are you headed? i’ll keep it to what you own.'],
        chips: ['work', 'dinner', 'off duty', 'pack for five days'],
      },
      context: baseContext,
    };
  }

  return {
    reply: {
      kind: 'message',
      text: ['i didn’t quite catch that. do you want a look, a review of your closet, or packing?'],
      chips: ['what should i wear today?', 'what haven’t i worn lately?', 'pack for five days'],
    },
    context: baseContext,
  };
}
