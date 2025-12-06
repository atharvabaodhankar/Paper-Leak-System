import forge from 'node-forge';

/**
 * Generate a random AES key
 * @returns {string} Hex encoded 256-bit key
 */
export const generateAESKey = () => {
  return forge.random.getBytesSync(32);
};

/**
 * Encrypt data with AES-CBC
 * @param {Uint8Array} data 
 * @param {string} key - binary string
 * @returns {Object} { iv: hex, data: hex }
 */
export const encryptAES = (data, key) => {
  const iv = forge.random.getBytesSync(16);
  const cipher = forge.cipher.createCipher('AES-CBC', key);
  cipher.start({ iv: iv });
  
  // Convert Uint8Array to binary string
  const binaryData = forge.util.createBuffer(data);
  cipher.update(binaryData);
  cipher.finish();
  
  return {
    iv: forge.util.encode64(iv),
    encryptedData: forge.util.encode64(cipher.output.getBytes())
  };
};

/**
 * Decrypt data with AES-CBC
 * @param {string} encryptedDataBase64 
 * @param {string} key - binary string
 * @param {string} ivBase64 
 * @returns {Uint8Array}
 */
export const decryptAES = (encryptedDataBase64, key, ivBase64) => {
  const iv = forge.util.decode64(ivBase64);
  const encryptedData = forge.util.decode64(encryptedDataBase64);
  
  const decipher = forge.cipher.createDecipher('AES-CBC', key);
  decipher.start({ iv: iv });
  decipher.update(forge.util.createBuffer(encryptedData));
  const result = decipher.finish();
  
  if (!result) {
    throw new Error('AES decryption failed');
  }
  
  // Convert binary string to Uint8Array
  const bytes = decipher.output.getBytes();
  const uint8 = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    uint8[i] = bytes.charCodeAt(i);
  }
  return uint8;
};

/**
 * Encrypt a small piece of data (like an AES key) with a public key
 * @param {string} data - binary string
 * @param {string} publicKeyPem 
 * @returns {string} Base64 encoded encrypted data
 */
export const encryptWithPublicKey = (data, publicKeyPem) => {
  const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
  const encrypted = publicKey.encrypt(data, 'RSA-OAEP');
  return forge.util.encode64(encrypted);
};

/**
 * Decrypt data with a private key
 * @param {string} encryptedDataBase64 
 * @param {string} privateKeyPem 
 * @returns {string} binary string
 */
export const decryptWithPrivateKey = (encryptedDataBase64, privateKeyPem) => {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const encryptedData = forge.util.decode64(encryptedDataBase64);
  const decrypted = privateKey.decrypt(encryptedData, 'RSA-OAEP');
  return decrypted;
};

/**
 * Generate a new RSA Key Pair
 * @returns {Object} { publicKey, privateKey } in PEM format
 */
export const generateKeyPair = () => {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  return {
    publicKey: forge.pki.publicKeyToPem(keys.publicKey),
    privateKey: forge.pki.privateKeyToPem(keys.privateKey)
  };
};
