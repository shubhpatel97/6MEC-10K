import { Category } from './theme/tokens';

export type { Category };

export type GarmentKind =
  | 'tee'
  | 'shirt'
  | 'knit'
  | 'hoodie'
  | 'flannel'
  | 'trousers'
  | 'jeans'
  | 'shorts'
  | 'jacket'
  | 'coat'
  | 'sneaker'
  | 'boot'
  | 'loafer'
  | 'cap'
  | 'bag';

export type Garment = {
  id: string;
  name: string;
  category: Category;
  kind: GarmentKind;
  colorName: string;
  color: string;
  accent: string;
  colorFamily: 'neutral' | 'earth' | 'cool' | 'warm';
  description: string;
  /** source brand is stored for the record and never rendered */
  sourceBrand?: string;
  addedAt: string;
  sourceOutfitIds: string[];
  /** every demo piece is flagged so the interface can never imply otherwise */
  demo: boolean;
  /** real camera-roll photo kept as the outfit reference, when one exists */
  photoUri?: string;
  /** transparent PNG cutout produced on this device from a real photo */
  cutoutUri?: string;
};

export type GarmentView = Garment & {
  wearCount: number;
  lastWornAt: string | null;
  lastWornDays: number | null;
};

export type WearEvent = {
  id: string;
  garmentIds: string[];
  /** local calendar day, YYYY-MM-DD — one wear per garment per day */
  date: string;
  loggedAt: string;
  source: 'seed' | 'look' | 'item';
};

export type OutfitBoard = {
  id: string;
  label: string;
  itemIds: string[];
  demo: boolean;
  photoUri?: string;
};

export type SavedLook = {
  id: string;
  key: string;
  title: string;
  note: string;
  itemIds: string[];
  savedAt: string;
  demo: boolean;
};

export type ProposedLook = {
  key: string;
  title: string;
  note: string;
  itemIds: string[];
};

export type PackingSection = {
  label: string;
  itemIds: string[];
};

export type PackingPlan = {
  title: string;
  days: number;
  sections: PackingSection[];
  looks: ProposedLook[];
};

export type Occasion = 'work' | 'dinner' | 'casual' | 'formal' | 'gym' | 'travel' | 'none';

export type WeatherKey = 'cold' | 'mild' | 'warm' | 'rainy';

export type LookRequest = {
  occasion: Occasion;
  anchorIds: string[];
  salt: number;
  weather: WeatherKey | null;
  skipOuter?: boolean;
};

export type ChatContext = {
  occasion: Occasion | null;
  mood: string | null;
  weather: WeatherKey | null;
  anchorIds: string[];
  lastLookKeys: string[];
  dislikedLookKeys: string[];
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'stylist';
  text: string[];
  chips?: string[];
  looks?: ProposedLook[];
  lookRequest?: LookRequest;
  pieces?: string[];
  packing?: PackingPlan;
  viaVoice?: boolean;
  createdAt: string;
};

export type PersistedApp = {
  version: 1;
  onboardingComplete: boolean;
  demoCloset: boolean;
  garments: Garment[];
  wearEvents: WearEvent[];
  boards: OutfitBoard[];
  savedLooks: SavedLook[];
  messages: ChatMessage[];
  context: ChatContext;
  weather: WeatherKey | null;
};

export const emptyContext: ChatContext = {
  occasion: null,
  mood: null,
  weather: null,
  anchorIds: [],
  lastLookKeys: [],
  dislikedLookKeys: [],
};
