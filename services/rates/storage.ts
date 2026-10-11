// Almacén persistente con fallback en memoria (web / módulos nativos ausentes).

import AsyncStorage from '@react-native-async-storage/async-storage';

const mem = new Map<string, string>();

export async function storageGet(key: string): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(key);
    if (v !== null) return v;
  } catch {
    // sin módulo nativo: usar memoria
  }
  return mem.get(key) ?? null;
}

export async function storageSet(key: string, value: string): Promise<void> {
  mem.set(key, value);
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // sin módulo nativo: queda en memoria
  }
}
