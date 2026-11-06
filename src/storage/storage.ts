import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatContext, ChatMessage, Garment, OutfitBoard, PersistedApp, SavedLook, WearEvent } from '../types';
import { emptyContext } from '../types';

const KEY = 'crest.app.v1';
export const STORAGE_VERSION = 1;

export function emptyPersisted(): PersistedApp {
  return {
    version: STORAGE_VERSION,
    onboardingComplete: false,
    demoCloset: false,
    garments: [],
    wearEvents: [],
    boards: [],
    savedLooks: [],
    messages: [],
    context: { ...emptyContext },
    weather: null,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Storage is user data: validate the shape and drop anything unrecognised. */
export function parsePersisted(raw: string | null): PersistedApp | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed)) return null;
    if (parsed.version !== STORAGE_VERSION) return null;
    const garments = Array.isArray(parsed.garments) ? (parsed.garments as Garment[]) : [];
    const wearEvents = Array.isArray(parsed.wearEvents) ? (parsed.wearEvents as WearEvent[]) : [];
    const boards = Array.isArray(parsed.boards) ? (parsed.boards as OutfitBoard[]) : [];
    const savedLooks = Array.isArray(parsed.savedLooks) ? (parsed.savedLooks as SavedLook[]) : [];
    const messages = Array.isArray(parsed.messages) ? (parsed.messages as ChatMessage[]) : [];
    return {
      version: STORAGE_VERSION,
      onboardingComplete: parsed.onboardingComplete === true,
      demoCloset: parsed.demoCloset === true,
      garments,
      wearEvents,
      boards,
      savedLooks,
      messages,
      context: isObject(parsed.context) ? ({ ...emptyContext, ...parsed.context } as ChatContext) : { ...emptyContext },
      weather: (parsed.weather as PersistedApp['weather']) ?? null,
    };
  } catch {
    return null;
  }
}

export async function loadPersisted(): Promise<PersistedApp | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return parsePersisted(raw);
}

export async function savePersisted(state: PersistedApp): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}

export async function clearPersisted(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
