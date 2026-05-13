import { create } from 'zustand';
import { getDynamicRoutes } from '../services/routingEngine';

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
  sourceCoords: null, // { lat, lon }
  destCoords:   null, // { lat, lon }
  
  // Dynamic route coordinates for NavigationScreen
  // Format: [[lat, lng], ...] — at least 2 points
  routeCoords: null,

  setTripContext: (source, destination, sourceCoords, destCoords) => 
    set({ source, destination, sourceCoords, destCoords }),
  setRouteCoords: (coords) => set({ routeCoords: coords }),

  fetchRoutes: async () => {
    set({ isLoading: true, error: null });
    const { sourceCoords, destCoords, timeMode } = get();
    try {
      const data = await getDynamicRoutes(sourceCoords, destCoords, timeMode);
      set({ routes: data, isLoading: false });
    } catch (e) {
      set({ error: e.message, isLoading: false });
    }
  },

  setTimeMode: async (mode) => {
    set({ timeMode: mode, isLoading: true });
    const { sourceCoords, destCoords } = get();
    try {
      const data = await getDynamicRoutes(sourceCoords, destCoords, mode);
      set({ routes: data, isLoading: false });
    } catch (e) {
      set({ error: e.message, isLoading: false });
    }
  },

  setSelectedRoute: (route) => set({ selectedRoute: route, routeCoords: route.routeCoords }),
  setSosActive: (value) => set({ sosActive: value }),
}));