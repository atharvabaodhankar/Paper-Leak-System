/**
 * Crypto utilities for AES encryption/decryption
 */

/**
 * Convert Uint8Array to base64 string safely (handles large arrays)
 * @param {Uint8Array} array 
 * @returns {string}
 */
const arrayToBase64 = (array) => {
  let binary = '';
  for (let i = 0; i < array.length; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary);
};

/**
 * Convert base64 string to Uint8Array safely
 * @param {string} base64 
 * @returns {Uint8Array}
 */
const base64ToArray = (base64) => {
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return array;
};

/**
 * Generate a random AES key
 * @returns {string} Base64 encoded key
 */
export const generateAESKey = () => {
  const key = new Uint8Array(32); // 256-bit key
  crypto.getRandomValues(key);
  return arrayToBase64(key);
};

/**
 * Encrypt data using AES-GCM
 * @param {Uint8Array} data 
 * @param {string} keyBase64 
 * @returns {Object} { iv: string, encryptedData: string }
 */
export const encryptAES = async (data, keyBase64) => {
  const key = await crypto.subtle.importKey(
    'raw',
    base64ToArray(keyBase64),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = new Uint8Array(12); // 96-bit IV for GCM
  crypto.getRandomValues(iv);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return {
    iv: arrayToBase64(iv),
    encryptedData: arrayToBase64(new Uint8Array(encrypted))
  };
};

/**
 * Decrypt data using AES-GCM
 * @param {string} encryptedDataBase64 
 * @param {string} ivBase64 
 * @param {string} keyBase64 
 * @returns {Promise<Uint8Array>} Decrypted data
 */
export const decryptAES = async (encryptedDataBase64, ivBase64, keyBase64) => {
  const key = await crypto.subtle.importKey(
    'raw',
    base64ToArray(keyBase64),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const iv = base64ToArray(ivBase64);
  const encryptedData = base64ToArray(encryptedDataBase64);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedData
  );

  return new Uint8Array(decrypted);
};