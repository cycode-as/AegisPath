import * as SMS from 'expo-sms';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Loads emergency contacts from AsyncStorage.
 * Returns array of { name, phone, relation } or empty array.
 */
export async function getEmergencyContacts() {
  try {
    const raw = await AsyncStorage.getItem('@aegispath_emergency_contacts');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

/**
 * Calls the first emergency contact using the native dialer.
 * Falls back silently if no contacts or call not available.
 */
export async function callFirstContact() {
  try {
    const contacts = await getEmergencyContacts();
    if (contacts.length > 0 && contacts[0].phone) {
      const url = `tel:${contacts[0].phone}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
    }
  } catch (_) {
    // Silent — never crash during emergency
  }
}

/**
 * Sends emergency SMS to all stored contacts.
 * Falls back silently if SMS unavailable.
 */
export async function sendSOS() {
  try {
    const contacts = await getEmergencyContacts();
    const phones = contacts.map(c => c.phone).filter(Boolean);
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      await SMS.sendSMSAsync(
        phones.length > 0 ? phones : [],
        'I need help. Please track my location. — Sent via AegisPath'
      );
    }
  } catch (_) {
    // Swallow all errors silently — never throw
  }
}
