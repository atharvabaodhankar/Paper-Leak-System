/**
 * Simple test for crypto functions
 */
import { generateAESKey, encryptAES, decryptAES } from './crypto.js';

export const testCrypto = async () => {
  try {
    console.log('🧪 Testing crypto functions...');
    
    // Generate a key
    const key = generateAESKey();
    console.log('✅ Generated AES key:', key.substring(0, 20) + '...');
    
    // Test data
    const testData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    console.log('📝 Test data:', testData);
    
    // Encrypt
    const encrypted = await encryptAES(testData, key);
    console.log('🔒 Encrypted:', {
      iv: encrypted.iv.substring(0, 20) + '...',
      data: encrypted.encryptedData.substring(0, 20) + '...'
    });
    
    // Decrypt
    const decrypted = await decryptAES(encrypted.encryptedData, encrypted.iv, key);
    console.log('🔓 Decrypted:', decrypted);
    
    // Verify
    const isEqual = testData.every((val, i) => val === decrypted[i]);
    console.log('✅ Test result:', isEqual ? 'PASSED' : 'FAILED');
    
    return isEqual;
  } catch (error) {
    console.error('❌ Crypto test failed:', error);
    return false;
  }
};

// Auto-run test in development
if (import.meta.env.DEV) {
  testCrypto();
}