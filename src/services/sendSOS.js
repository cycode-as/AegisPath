import * as SMS from 'expo-sms';

export async function sendSOS() {
  try {
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      await SMS.sendSMSAsync([], 'I need help. Please track my location.');
    }
  } catch (_error) {
    // Swallow all errors silently — never throw
  }
}
