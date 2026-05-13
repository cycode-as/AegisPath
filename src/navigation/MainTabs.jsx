/**
 * MainTabs — Floating bottom tab navigator for AegisPath.
 *
 * Tabs: Home · Routes · Navigate · Time · Safety
 *
 * Design: floating pill bar, subtle active glow, smooth icon scale animation.
 * All deep flows (TravelMode, SOS, CabVerification, etc.) are pushed as
 * stack screens on top of these tabs — tab state is preserved.
 */

import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Platform,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen            from '../screens/HomeScreen';
import RouteComparisonScreen from '../screens/RouteComparisonScreen';
import NavigationScreen      from '../screens/NavigationScreen';
import TimeImpactScreen      from '../screens/TimeImpactScreen';
import SOSScreen             from '../screens/SOSScreen';

import { colors } from '../config/colors';

const Tab = createBottomTabNavigator();

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  {
    name:   'Home',
    label:  'Home',
    icon:   'home',
    screen: HomeScreen,
  },
  {
    name:   'Routes',
    label:  'Routes',
    icon:   'git-branch-outline',
    screen: RouteComparisonScreen,
  },
  {
    name:   'Navigate',
    label:  'Navigate',
    icon:   'navigate',
    screen: NavigationScreen,
  },
  {
    name:   'TimeImpact',
    label:  'Time',
    icon:   'time-outline',
    screen: TimeImpactScreen,
  },
  {
    name:   'Safety',
    label:  'Safety',
    icon:   'shield-checkmark-outline',
    screen: SOSScreen,
  },
];

// ─── Single animated tab button ───────────────────────────────────────────────
function TabButton({ label, iconName, active, onPress }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(active ? 1 : 0.55)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: active ? 1.12 : 1,
        useNativeDriver: true,
        friction: 6,
        tension: 120,
      }),
      Animated.timing(opacity, {
        toValue: active ? 1 : 0.55,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [active]);

  return (
    <TouchableOpacity
      style={styles.tabBtn}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Animated.View
        style={[
          styles.tabIconWrap,
          active && styles.tabIconWrapActive,
          { transform: [{ scale }], opacity },
        ]}
      >
        <Ionicons
          name={iconName}
          size={active ? 22 : 20}
          color={active ? colors.brand : colors.textSecondary}
        />
      </Animated.View>
      <Animated.Text
        style={[
          styles.tabLabel,
          active && styles.tabLabelActive,
          { opacity },
        ]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>
    </TouchableOpacity>
  );
}

// ─── Custom floating tab bar ──────────────────────────────────────────────────
function FloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.barOuter, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const tab    = TABS.find(t => t.name === route.name);
          const active = state.index === index;

          return (
            <TabButton
              key={route.key}
              label={tab?.label ?? route.name}
              iconName={tab?.icon ?? 'ellipse-outline'}
              active={active}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!active && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── MainTabs ─────────────────────────────────────────────────────────────────
export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {TABS.map(tab => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.screen}
        />
      ))}
    </Tab.Navigator>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  barOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    // Transparent background so the floating bar sits above content
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'space-around',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 16,
    // Subtle border
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
  },
  tabIconWrap: {
    width: 40,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: colors.brandLight,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: colors.brand,
    fontWeight: '700',
  },
});
