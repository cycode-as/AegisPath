import React from 'react';
import {
  View, Text, TextInput,
  TouchableOpacity, StyleSheet, SafeAreaView
} from 'react-native';
import { colors } from '../config/colors';

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>

        <Text style={styles.logo}>🛡</Text>
        <Text style={styles.appName}>RakshaPath</Text>
        <Text style={styles.tagline}>Your Safest Path</Text>

        <View style={styles.form}>
          <View style={styles.inputRow}>
            <Text style={styles.inputIcon}>📍</Text>
            <TextInput
              style={styles.input}
              defaultValue="Connaught Place, Delhi"
              placeholder="From"
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputIcon}>🏁</Text>
            <TextInput
              style={styles.input}
              defaultValue="Lajpat Nagar Metro"
              placeholder="To"
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputIcon}>🕐</Text>
            <TextInput
              style={styles.input}
              defaultValue="9:00 PM"
              placeholder="Time"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.cta}
          onPress={() => navigation.navigate('RouteComparison')}
        >
          <Text style={styles.ctaText}>Find Safe Route →</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo:    { fontSize: 56, marginBottom: 8 },
  appName: { fontSize: 32, fontWeight: '800', color: colors.textPrimary },
  tagline: { fontSize: 16, color: colors.textSecondary, marginBottom: 40 },
  form: { width: '100%', marginBottom: 32 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  cta: {
    backgroundColor: colors.brand,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});