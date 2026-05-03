import React, { useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  SafeAreaView, ActivityIndicator
} from 'react-native';
import RouteCard      from '../components/RouteCard';
import DayNightToggle from '../components/DayNightToggle';
import SkeletonCard   from '../components/SkeletonCard';
import { useRouteStore } from '../stores/useRouteStore';
import { colors } from '../config/colors';

export default function RouteComparisonScreen({ navigation }) {
  const { routes, isLoading, timeMode, fetchRoutes, setTimeMode, setSelectedRoute } = useRouteStore();

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleSeeWhy  = (route) => {
    // Day 3 task: open bottom sheet
    console.log('See Why:', route.id);
  };

  const handleNavigate = (route) => {
    setSelectedRoute(route);
    // Day 4 task: navigation.navigate('Navigation')
    console.log('Navigate:', route.id);
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Route Options</Text>
        <DayNightToggle timeMode={timeMode} onToggle={setTimeMode} />
      </View>

      {/* Route cards or skeleton */}
      {isLoading ? (
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={[...routes].sort((a) => a.isRecommended ? -1 : 1)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <RouteCard
              route={item}
              onSeeWhy={handleSeeWhy}
              onNavigate={handleNavigate}
            />
          )}
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  list: {
    padding: 16,
  },
});