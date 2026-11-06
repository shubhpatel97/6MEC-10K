import { Category, GarmentKind } from '../types';

export const KINDS_BY_CATEGORY: Record<Category, GarmentKind[]> = {
  tops: ['tee', 'shirt', 'knit', 'hoodie', 'flannel'],
  bottoms: ['trousers', 'jeans', 'shorts'],
  jackets: ['jacket', 'coat'],
  shoes: ['sneaker', 'boot', 'loafer'],
  caps: ['cap'],
  bags: ['bag'],
};

export const KIND_CATEGORY: Record<GarmentKind, Category> = {
  tee: 'tops',
  shirt: 'tops',
  knit: 'tops',
  hoodie: 'tops',
  flannel: 'tops',
  trousers: 'bottoms',
  jeans: 'bottoms',
  shorts: 'bottoms',
  jacket: 'jackets',
  coat: 'jackets',
  sneaker: 'shoes',
  boot: 'shoes',
  loafer: 'shoes',
  cap: 'caps',
  bag: 'bags',
};

export const KIND_NOUN: Record<GarmentKind, string> = {
  tee: 'tee',
  shirt: 'shirt',
  knit: 'knit',
  hoodie: 'hoodie',
  flannel: 'flannel',
  trousers: 'trousers',
  jeans: 'jeans',
  shorts: 'shorts',
  jacket: 'jacket',
  coat: 'coat',
  sneaker: 'sneakers',
  boot: 'boots',
  loafer: 'loafers',
  cap: 'cap',
  bag: 'bag',
};

export const KIND_PLURAL: Record<GarmentKind, string> = {
  tee: 'tees',
  shirt: 'shirts',
  knit: 'knits',
  hoodie: 'hoodies',
  flannel: 'flannels',
  trousers: 'trousers',
  jeans: 'jeans',
  shorts: 'shorts',
  jacket: 'jackets',
  coat: 'coats',
  sneaker: 'sneakers',
  boot: 'boots',
  loafer: 'loafers',
  cap: 'caps',
  bag: 'bags',
};

/** 0.5 = gym kit, 4 = ceremony */
export const KIND_FORMALITY: Record<GarmentKind, number> = {
  tee: 1,
  shirt: 3,
  knit: 2,
  hoodie: 0.9,
  flannel: 1.4,
  trousers: 3,
  jeans: 1.2,
  shorts: 0.6,
  jacket: 2.2,
  coat: 3.2,
  sneaker: 1,
  boot: 2,
  loafer: 3,
  cap: 0.8,
  bag: 1.5,
};

export function categoryOf(kind: GarmentKind): Category {
  return KIND_CATEGORY[kind];
}

export function isNeutral(colorName: string): boolean {
  return /black|charcoal|grey|gray|stone|bone|ecru|cream|sand|taupe|white|ink/.test(colorName);
}

export function fitNote(top: string, bottom: string, shoes: string): string {
  return `${top} on top, ${bottom} below, ${shoes} to finish.`;
}
