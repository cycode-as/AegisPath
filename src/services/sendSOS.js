import * as SMS from 'expo-sms';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Load emergency contacts from AsyncStorage. */
export async function getEmergencyContacts() {
  try {
    const raw = await AsyncStorage.getItem('@aegispath_emergency_contacts');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

/** Call the first emergency contact via native dialer. */
export async function callFirstContact() {
  try {
    const contacts = await getEmergencyContacts();
    if (contacts.length > 0 && contacts[0].phone) {
      await dialNumber(contacts[0].phone);
    }
  } catch (_) {}
}

/** Call 112 emergency services. */
export async function call112() {
  await dialNumber('112');
}

/** Open native dialer for a given number. Handles platform gracefully. */
export async function dialNumber(number) {
  try {
    const url = `tel:${number}`;
    // canOpenURL may return false on some Android emulators — try anyway
    const canOpen = await Linking.canOpenURL(url).catch(() => true);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      // Fallback: try without the check
      await Linking.openURL(url);
    }
  } catch (_) {
    // Silent — never crash during emergency
  }
}

/**
 * Sends emergency SMS to all stored contacts.
 * Includes username, coordinates, travel mode, and cab details if applicable.
 */
export async function sendSOS() {
  try {
    const contacts = await getEmergencyContacts();
    const phones = contacts.map(c => c.phone).filter(Boolean);

    // Load user profile
    let userName = 'User';
    try {
      const raw = await AsyncStorage.getItem('@aegispath_user_profile');
      if (raw) { const p = JSON.parse(raw); if (p.name) userName = p.name; }
    } catch (_) {}

    // Load travel mode
    let travelMode = 'Unknown';
    try {
      const mode = await AsyncStorage.getItem('@aegispath_travel_pref');
      if (mode) travelMode = mode.charAt(0).toUpperCase() + mode.slice(1);
    } catch (_) {}

    // Load cab details (stored during CabVerificationScreen)
    let cabDetails = null;
    try {
      const raw = await AsyncStorage.getItem('@aegispath_cab_details');
      if (raw) cabDetails = JSON.parse(raw);
    } catch (_) {}

    const coords = '28.5494° N, 77.2001° E';
    const mapsLink = `https://maps.google.com/?q=28.5494,77.2001`;

    let message =
      `Emergency alert from ${userName}.\n` +
      `I may be in danger.\n\n` +
      `Current Location:\n${mapsLink}\n` +
      `Coordinates: ${coords}\n\n` +
      `Travel Mode: ${travelMode}\n`;

    // Append cab details only in cab mode
    if (travelMode.toLowerCase() === 'cab' && cabDetails) {
      if (cabDetails.driverName)    message += `Driver Name: ${cabDetails.driverName}\n`;
      if (cabDetails.vehicleNumber) message += `Vehicle Number: ${cabDetails.vehicleNumber}\n`;
      if (cabDetails.vehicleModel)  message += `Vehicle Model: ${cabDetails.vehicleModel}\n`;
      if (cabDetails.provider)      message += `Cab Service: ${cabDetails.provider}\n`;
    }

    message += `\nLive tracking has been enabled.\n\n— Sent via AegisPath`;

    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      await SMS.sendSMSAsync(phones.length > 0 ? phones : [], message);
    }
  } catch (_) {
    // Swallow all errors silently — never throw
  }
}
