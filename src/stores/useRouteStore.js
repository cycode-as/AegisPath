import { create } from 'zustand';
import { getDynamicRoutes } from '../services/routingEngine';

export const useRouteStore = create((set, get) => ({
  routes:        [],
  selectedRoute: null,
  timeMode:      'night',
  travelMode:    'walking',
  isLoading:     false,
  error:         null,
  sosActive:     false,

  // Trip context — set from HomeScreen before navigating
  source:       '',
  destination:  '',
  sourceCoords: null, // { lat, lon }
  destCoords:   null, // { lat, lon }
  
  // User's live GPS location
  userLocation: null, // { lat, lon }
  setUserLocation: (loc) => set({ userLocation: loc }),

  // Dynamic route coordinates for NavigationScreen
  // Format: [[lat, lng], ...] — at least 2 points
  routeCoords: null,

  setTripContext: (source, destination, sourceCoords, destCoords) => 
    set({ source, destination, sourceCoords, destCoords }),
  setRouteCoords: (coords) => set({ routeCoords: coords }),
  setTravelMode: (mode) => set({ travelMode: mode }),

  fetchRoutes: async () => {
    const { sourceCoords, destCoords, timeMode, travelMode } = get();
    if (!sourceCoords || !destCoords) {
      set({ error: 'Please select both source and destination', isLoading: false });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const data = await getDynamicRoutes(sourceCoords, destCoords, timeMode, travelMode);
      set({ routes: data, isLoading: false });
    } catch (e) {
      set({ error: e.message, isLoading: false });
    }
  },

  setTimeMode: async (mode) => {
    set({ timeMode: mode, isLoading: true, error: null });
    const { sourceCoords, destCoords, travelMode } = get();
    if (!sourceCoords || !destCoords) {
      set({ isLoading: false });
      return;
    }
    try {
      const data = await getDynamicRoutes(sourceCoords, destCoords, mode, travelMode);
      set({ routes: data, isLoading: false });
    } catch (e) {
      set({ error: e.message, isLoading: false });
    }
  },

  setSelectedRoute: (route) => set({ 
    selectedRoute: route, 
    routeCoords: route?.routeCoords || null,
  }),
  setSosActive: (value) => set({ sosActive: value }),
}));