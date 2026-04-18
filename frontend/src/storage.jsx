// src/utils/storage.js
import CryptoJS from 'crypto-js';

const SECRET_KEY = 'finance-tracker-secret-2025';

/**
 * Safely load and decrypt data from localStorage
 */
export const loadData = (key) => {
  try {
    const data = localStorage.getItem(key);
    if (!data) return [];
    
    // Try to parse as plain JSON first
    try {
      return JSON.parse(data);
    } catch (jsonError) {
      // If that fails, try to decrypt
      try {
        const decryptedBytes = CryptoJS.AES.decrypt(data, SECRET_KEY);
        const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8);
        if (decryptedData) {
          return JSON.parse(decryptedData);
        }
        return [];
      } catch (decryptError) {
        console.error(`Error decrypting ${key}:`, decryptError);
        return [];
      }
    }
  } catch (error) {
    console.error(`Error loading ${key}:`, error);
    return [];
  }
};

/**
 * Save data to localStorage (unencrypted for now)
 */
export const saveData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
    return false;
  }
};

/**
 * Clear specific key from localStorage
 */
export const clearData = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error clearing ${key}:`, error);
    return false;
  }
};

/**
 * Clear all app data
 */
export const clearAllData = () => {
  try {
    localStorage.removeItem('transactions');
    localStorage.removeItem('budgets');
    localStorage.removeItem('currentUser');
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
};