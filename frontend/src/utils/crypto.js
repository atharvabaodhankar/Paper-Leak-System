/**
 * Crypto utilities for AES and RSA encryption/decryption
 */
import forge from 'node-forge';

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

/**
 * Encrypt a small piece of data (like an AES key) with a public key
 * @param {string} data - binary string or base64
 * @param {string} publicKeyPem 
 * @returns {string} Base64 encoded encrypted data
 */
export const encryptWithPublicKey = (data, publicKeyPem) => {
  console.log('🔍 encryptWithPublicKey called with:', {
    dataType: typeof data,
    dataLength: data?.length,
    dataPreview: data?.substring?.(0, 50) + '...',
    publicKeyLength: publicKeyPem?.length,
    publicKeyPreview: publicKeyPem?.substring?.(0, 50) + '...'
  });
  
  if (!data) {
    throw new Error('Data to encrypt is undefined or null');
  }
  
  if (!publicKeyPem) {
    throw new Error('Public key PEM is undefined or null');
  }
  
  try {
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    console.log('✅ Successfully parsed public key from PEM');
    
    const encrypted = publicKey.encrypt(data, 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha1.create()
      }
    });
    
    console.log('✅ Successfully encrypted data');
    return forge.util.encode64(encrypted);
  } catch (error) {
    console.error('❌ Encryption failed:', error);
    throw error;
  }
};

/**
 * Decrypt data with a private key
 * @param {string} encryptedDataBase64 
 * @param {string} privateKeyPem 
 * @returns {string} decrypted string
 */
export const decryptWithPrivateKey = (encryptedDataBase64, privateKeyPem) => {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const encryptedData = forge.util.decode64(encryptedDataBase64);
  const decrypted = privateKey.decrypt(encryptedData, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: {
      md: forge.md.sha1.create()
    }
  });
  return decrypted;
};

/**
 * Generate a deterministic RSA Key Pair from a signature
 * This ensures the same wallet always gets the same keys
 * @param {string} signature - MetaMask signature to derive keys from
 * @returns {Promise<Object>} { publicKey, privateKey } in PEM format
 */
export const generateDeterministicKeyPair = async (signature) => {
  // Create a deterministic seed from the signature
  const encoder = new TextEncoder();
  const data = encoder.encode(signature);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Convert hash to hex seed
  const seed = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  console.log('🔍 Deterministic key generation debug:', {
    signature: signature.substring(0, 20) + '...',
    signatureLength: signature.length,
    seed: seed.substring(0, 20) + '...',
    seedLength: seed.length
  });
  
  // Use a fixed approach: generate keys using a deterministic method
  // We'll create the private key components deterministically
  
  // For RSA, we need p, q (primes), n = p*q, e (public exponent), d (private exponent)
  // Let's use a simpler approach: derive a consistent private key from the seed
  
  try {
    // Method: Use the seed to create a deterministic entropy source
    // and generate the same key every time
    
    // Create multiple hash rounds to get enough entropy
    let currentHash = seed;
    const entropy = [];
    
    for (let i = 0; i < 32; i++) { // Generate 32 rounds of entropy
      const roundData = encoder.encode(currentHash + i.toString());
      const roundHash = await crypto.subtle.digest('SHA-256', roundData);
      const roundArray = Array.from(new Uint8Array(roundHash));
      entropy.push(...roundArray);
      currentHash = roundArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // Convert entropy to a deterministic byte string for forge
    // Create a truly deterministic PRNG that will always produce the same sequence
    let entropyIndex = 0;
    const trulyDeterministicPRNG = {
      getBytesSync: function(count) {
        const bytes = [];
        for (let i = 0; i < count; i++) {
          // Use entropy in a repeating, deterministic pattern
          const byte = entropy[entropyIndex % entropy.length];
          bytes.push(String.fromCharCode(byte));
          entropyIndex++;
        }
        return bytes.join('');
      }
    };
    
    // Generate keypair with our truly deterministic PRNG
    const keypair = forge.pki.rsa.generateKeyPair({ 
      bits: 2048, 
      workers: 0, // Disable workers for consistency
      prng: trulyDeterministicPRNG,
      algorithm: 'PRIMEINC' // Use incremental prime search for more determinism
    });
    
    const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
    const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
    
    console.log('🔑 Generated deterministic keys:', {
      publicKeyLength: publicKeyPem.length,
      privateKeyLength: privateKeyPem.length,
      publicKeyPreview: publicKeyPem.substring(0, 100) + '...',
      entropyLength: entropy.length,
      signature: signature.substring(0, 20) + '...'
    });
    
    return {
      publicKey: publicKeyPem,
      privateKey: privateKeyPem
    };
  } catch (error) {
    console.error('Deterministic key generation failed:', error);
    throw new Error(`Key generation failed: ${error.message}`);
  }
};

/**
 * Generate a time-locked AES key that can only be decrypted at a specific time
 * @param {number} unlockTimestamp - Unix timestamp when key should be unlockable
 * @param {string} salt - Random salt for key derivation
 * @returns {Object} { timeLockedKey: string, actualAESKey: string }
 */
export const generateTimeLockedKey = async (unlockTimestamp, salt) => {
  // Generate a random AES key
  const actualAESKey = generateAESKey();
  
  // Create a deterministic seed from unlock time and salt
  const timeData = `${unlockTimestamp}:${salt}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(timeData);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const timeSeed = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Create a proper 256-bit key from the time seed (first 64 hex chars = 32 bytes = 256 bits)
  const timeKeyHex = timeSeed.substring(0, 64);
  const timeKeyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    timeKeyBytes[i] = parseInt(timeKeyHex.substring(i * 2, i * 2 + 2), 16);
  }
  const timeKey = arrayToBase64(timeKeyBytes);
  
  // Encrypt the actual AES key with the time-derived key
  const timeLockedKey = await encryptAES(
    new TextEncoder().encode(actualAESKey),
    timeKey
  );
  
  console.log('🔒 Generated time-locked key:', {
    unlockTimestamp,
    salt: salt.substring(0, 10) + '...',
    timeSeed: timeSeed.substring(0, 20) + '...',
    timeKeyLength: timeKey.length,
    actualAESKeyLength: actualAESKey.length,
    timeLockedKeyLength: timeLockedKey.encryptedData.length
  });
  
  return {
    timeLockedKey: JSON.stringify(timeLockedKey), // Store as JSON string
    actualAESKey // Return for immediate use by teacher
  };
};

/**
 * Decrypt a time-locked key (only works at or after unlock time)
 * @param {string} timeLockedKeyJson - JSON string of encrypted key
 * @param {number} unlockTimestamp - Unix timestamp when key should be unlockable
 * @param {string} salt - Salt used during key generation
 * @returns {Promise<string>} Decrypted AES key
 */
export const decryptTimeLockedKey = async (timeLockedKeyJson, unlockTimestamp, salt) => {
  const currentTime = Math.floor(Date.now() / 1000);
  
  // Check if it's time to unlock
  if (currentTime < unlockTimestamp) {
    throw new Error(`Time lock active. Key unlocks at ${new Date(unlockTimestamp * 1000).toLocaleString()}`);
  }
  
  // Recreate the time seed
  const timeData = `${unlockTimestamp}:${salt}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(timeData);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const timeSeed = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Recreate the time key
  const timeKeyHex = timeSeed.substring(0, 64);
  const timeKeyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    timeKeyBytes[i] = parseInt(timeKeyHex.substring(i * 2, i * 2 + 2), 16);
  }
  const timeKey = arrayToBase64(timeKeyBytes);
  
  // Parse the time-locked key
  const timeLockedKey = JSON.parse(timeLockedKeyJson);
  
  // Decrypt the actual AES key
  const decryptedData = await decryptAES(
    timeLockedKey.encryptedData,
    timeLockedKey.iv,
    timeKey
  );
  
  const actualAESKey = new TextDecoder().decode(decryptedData);
  
  console.log('🔓 Decrypted time-locked key:', {
    unlockTimestamp,
    currentTime,
    timeDifference: currentTime - unlockTimestamp,
    actualAESKeyLength: actualAESKey.length
  });
  
  return actualAESKey;
};