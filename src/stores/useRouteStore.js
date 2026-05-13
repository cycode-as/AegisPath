import { create } from 'zustand';
import { getRoutes } from '../services/mockAPI';

export const useRouteStore = create((set, get) => ({
  routes:        [],
  selectedRoute: null,
  timeMode:      'night',
  isLoading:     false,
  error:         null,
  sosActive:     false,

  // Trip context — set from HomeScreen before navigating
  source:      'Connaught Place, Delhi',
  destination: 'Lajpat Nagar Metro',
  // Dynamic route coordinates for NavigationScreen
  // Format: [[lat, lng], ...] — at least 2 points
  routeCoords: null,

  setTripContext: (source, destination) => set({ source, destination }),
  setRouteCoords: (coords) => set({ routeCoords: coords }),

  fetchRoutes: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getRoutes(get().timeMode);
      set({ routes: data, isLoading: false });
    } catch (e) {
      set({ error: e.message, isLoading: false });
    }
  },

  setTimeMode: async (mode) => {
    set({ timeMode: mode, isLoading: true });
    try {
      const data = await getRoutes(mode);
      set({ routes: data, isLoading: false });
    } catch (e) {
      set({ error: e.message, isLoading: false });
    }
  },

  setSelectedRoute: (route) => set({ selectedRoute: route }),
  setSosActive: (value) => set({ sosActive: value }),
}));