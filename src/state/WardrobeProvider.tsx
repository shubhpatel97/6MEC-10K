import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChatContext, ChatMessage, Garment, GarmentView, OutfitBoard, ProposedLook, SavedLook, WearEvent, WeatherKey } from '../types';
import { emptyContext } from '../types';
import { buildDemoCloset, lookKey } from '../data/demoCloset';
import { addDays, dateKey, daysBetween } from '../lib/date';
import { clearPersisted, emptyPersisted, loadPersisted, savePersisted } from '../storage/storage';

type State = {
  hydrated: boolean;
  storageError: string | null;
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

const initialState: State = {
  hydrated: false,
  storageError: null,
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

export type WardrobeStats = {
  pieces: number;
  wears: number;
  neverWorn: number;
  wornThisWeek: number;
  categories: { category: string; count: number }[];
  colors: { name: string; color: string; count: number }[];
};

type WardrobeApi = State & {
  garmentViews: GarmentView[];
  garmentById: (id: string) => GarmentView | null;
  wearEventsForGarment: (id: string) => WearEvent[];
  boardsForGarment: (id: string) => OutfitBoard[];
  wornToday: Set<string>;
  stats: WardrobeStats;
  savedLookByKey: (key: string) => SavedLook | null;
  completeDemoCloset: (keptIds: string[]) => void;
  completePhotoCloset: (garments: Garment[], boards: OutfitBoard[]) => void;
  logWear: (ids: string[], source?: 'look' | 'item') => { logged: string[]; already: string[] };
  toggleSavedLook: (look: ProposedLook, demo?: boolean) => boolean;
  removeSavedLook: (id: string) => void;
  appendMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  clearConversation: () => void;
  setWeather: (weather: WeatherKey | null) => void;
  setContext: (patch: Partial<ChatContext>) => void;
  resetAll: () => Promise<void>;
  retryLoad: () => void;
};

const WardrobeContext = createContext<WardrobeApi | null>(null);

export function WardrobeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const loadAttempt = useRef(0);

  const hydrate = useCallback(async () => {
    loadAttempt.current += 1;
    setState((current) => ({ ...current, storageError: null }));
    try {
      const loaded = await loadPersisted();
      if (loaded) {
        setState({ ...loaded, hydrated: true, storageError: null });
      } else {
        setState({ ...initialState, hydrated: true });
      }
    } catch {
      setState({ ...initialState, hydrated: true, storageError: 'we couldn’t read your closet on this device.' });
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Persist every relevant change after a short debounce.
  useEffect(() => {
    if (!state.hydrated || state.storageError) return;
    const timer = setTimeout(() => {
      const persisted = {
        version: 1 as const,
        onboardingComplete: state.onboardingComplete,
        demoCloset: state.demoCloset,
        garments: state.garments,
        wearEvents: state.wearEvents,
        boards: state.boards,
        savedLooks: state.savedLooks,
        messages: state.messages,
        context: state.context,
        weather: state.weather,
      };
      savePersisted(persisted).catch(() => {
        setState((current) => ({ ...current, storageError: 'we couldn’t save your latest changes.' }));
      });
    }, 320);
    return () => clearTimeout(timer);
  }, [
    state.hydrated,
    state.storageError,
    state.onboardingComplete,
    state.demoCloset,
    state.garments,
    state.wearEvents,
    state.boards,
    state.savedLooks,
    state.messages,
    state.context,
    state.weather,
  ]);

  const wearEventsForGarment = useCallback(
    (id: string) => state.wearEvents.filter((event) => event.garmentIds.includes(id)),
    [state.wearEvents],
  );

  const wearMap = useMemo(() => {
    const map = new Map<string, { count: number; lastWornAt: string | null }>();
    state.wearEvents.forEach((event) => {
      event.garmentIds.forEach((id) => {
        const current = map.get(id) ?? { count: 0, lastWornAt: null };
        current.count += 1;
        if (!current.lastWornAt || event.loggedAt > current.lastWornAt) current.lastWornAt = event.loggedAt;
        map.set(id, current);
      });
    });
    return map;
  }, [state.wearEvents]);

  const garmentViews = useMemo<GarmentView[]>(
    () =>
      state.garments.map((garment) => {
        const wear = wearMap.get(garment.id);
        return {
          ...garment,
          wearCount: wear?.count ?? 0,
          lastWornAt: wear?.lastWornAt ?? null,
          lastWornDays: wear?.lastWornAt ? daysBetween(wear.lastWornAt, new Date()) : null,
        };
      }),
    [state.garments, wearMap],
  );

  const garmentById = useCallback(
    (id: string) => garmentViews.find((garment) => garment.id === id) ?? null,
    [garmentViews],
  );

  const boardsForGarment = useCallback(
    (id: string) =>
      state.boards.filter((board) => board.itemIds.includes(id) || board.itemIds.some((itemId) => itemId === id)),
    [state.boards],
  );

  const wornToday = useMemo(() => {
    const today = dateKey();
    const set = new Set<string>();
    state.wearEvents
      .filter((event) => event.date === today)
      .forEach((event) => event.garmentIds.forEach((id) => set.add(id)));
    return set;
  }, [state.wearEvents]);

  const stats = useMemo<WardrobeStats>(() => {
    const categories = new Map<string, number>();
    const colors = new Map<string, { color: string; count: number }>();
    garmentViews.forEach((garment) => {
      categories.set(garment.category, (categories.get(garment.category) ?? 0) + 1);
      const current = colors.get(garment.colorName) ?? { color: garment.color, count: 0 };
      current.count += 1;
      colors.set(garment.colorName, current);
    });
    const weekAgo = addDays(new Date(), -7).getTime();
    const wornThisWeek = new Set<string>();
    state.wearEvents.forEach((event) => {
      if (new Date(event.loggedAt).getTime() >= weekAgo) {
        event.garmentIds.forEach((id) => wornThisWeek.add(id));
      }
    });
    return {
      pieces: garmentViews.length,
      wears: state.wearEvents.length,
      neverWorn: garmentViews.filter((garment) => garment.wearCount === 0).length,
      wornThisWeek: wornThisWeek.size,
      categories: [...categories.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      colors: [...colors.entries()]
        .map(([name, entry]) => ({ name, color: entry.color, count: entry.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
    };
  }, [garmentViews, state.wearEvents]);

  const savedLookByKey = useCallback(
    (key: string) => state.savedLooks.find((look) => look.key === key) ?? null,
    [state.savedLooks],
  );

  const completeDemoCloset = useCallback((keptIds: string[]) => {
    const kept = new Set(keptIds);
    const demo = buildDemoCloset(new Date());
    const garments = demo.garments.filter((garment) => kept.has(garment.id));
    const wearEvents = demo.wearEvents.filter((event) => event.garmentIds.every((id) => kept.has(id)));
    const boards = demo.boards
      .map((board) => ({ ...board, itemIds: board.itemIds.filter((id) => kept.has(id)) }))
      .filter((board) => board.itemIds.length >= 2);
    const savedLooks = demo.savedLooks
      .map((look) => ({ ...look, itemIds: look.itemIds.filter((id) => kept.has(id)) }))
      .filter((look) => look.itemIds.length >= 2)
      .map((look) => ({ ...look, key: lookKey(look.itemIds) }));
    setState((current) => ({
      ...current,
      onboardingComplete: true,
      demoCloset: true,
      garments,
      wearEvents,
      boards,
      savedLooks,
      messages: [],
      context: { ...emptyContext },
    }));
  }, []);

  const completePhotoCloset = useCallback((garments: Garment[], boards: OutfitBoard[]) => {
    setState((current) => ({
      ...current,
      onboardingComplete: true,
      demoCloset: false,
      garments,
      wearEvents: [],
      boards,
      savedLooks: [],
      messages: [],
      context: { ...emptyContext },
    }));
  }, []);

  const logWear = useCallback(
    (ids: string[], source: 'look' | 'item' = 'look') => {
      const unique = [...new Set(ids)];
      const today = dateKey();
      const alreadyToday = new Set<string>();
      state.wearEvents
        .filter((event) => event.date === today)
        .forEach((event) => event.garmentIds.forEach((id) => alreadyToday.add(id)));
      const fresh = unique.filter((id) => !alreadyToday.has(id) && state.garments.some((garment) => garment.id === id));
      const already = unique.filter((id) => alreadyToday.has(id));
      if (fresh.length > 0) {
        const event: WearEvent = {
          id: `wear-${today}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          garmentIds: fresh,
          date: today,
          loggedAt: new Date().toISOString(),
          source,
        };
        setState((current) => ({ ...current, wearEvents: [...current.wearEvents, event] }));
      }
      return { logged: fresh, already };
    },
    [state.garments, state.wearEvents],
  );

  const toggleSavedLook = useCallback(
    (look: ProposedLook, demo = false) => {
      const key = lookKey(look.itemIds);
      const existing = state.savedLooks.find((saved) => saved.key === key);
      if (existing) {
        setState((current) => ({ ...current, savedLooks: current.savedLooks.filter((saved) => saved.id !== existing.id) }));
        return false;
      }
      const saved: SavedLook = {
        id: `saved-${Date.now().toString(36)}`,
        key,
        title: look.title,
        note: look.note,
        itemIds: look.itemIds,
        savedAt: new Date().toISOString(),
        demo,
      };
      setState((current) => ({ ...current, savedLooks: [saved, ...current.savedLooks] }));
      return true;
    },
    [state.savedLooks],
  );

  const removeSavedLook = useCallback((id: string) => {
    setState((current) => ({ ...current, savedLooks: current.savedLooks.filter((look) => look.id !== id) }));
  }, []);

  const appendMessage = useCallback((message: ChatMessage) => {
    setState((current) => ({ ...current, messages: [...current.messages, message] }));
  }, []);

  const updateMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setState((current) => ({
      ...current,
      messages: current.messages.map((message) => (message.id === id ? { ...message, ...patch } : message)),
    }));
  }, []);

  const clearConversation = useCallback(() => {
    setState((current) => ({ ...current, messages: [], context: { ...emptyContext, weather: current.weather } }));
  }, []);

  const setWeather = useCallback((weather: WeatherKey | null) => {
    setState((current) => ({ ...current, weather, context: { ...current.context, weather } }));
  }, []);

  const setContext = useCallback((patch: Partial<ChatContext>) => {
    setState((current) => ({ ...current, context: { ...current.context, ...patch } }));
  }, []);

  const resetAll = useCallback(async () => {
    await clearPersisted().catch(() => {});
    setState({ ...initialState, hydrated: true });
  }, []);

  const api: WardrobeApi = {
    ...state,
    garmentViews,
    garmentById,
    wearEventsForGarment,
    boardsForGarment,
    wornToday,
    stats,
    savedLookByKey,
    completeDemoCloset,
    completePhotoCloset,
    logWear,
    toggleSavedLook,
    removeSavedLook,
    appendMessage,
    updateMessage,
    clearConversation,
    setWeather,
    setContext,
    resetAll,
    retryLoad: () => {
      void hydrate();
    },
  };

  return <WardrobeContext.Provider value={api}>{children}</WardrobeContext.Provider>;
}

export function useWardrobe(): WardrobeApi {
  const value = useContext(WardrobeContext);
  if (!value) throw new Error('useWardrobe must be used inside WardrobeProvider');
  return value;
}
