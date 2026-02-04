import * as LitJsSdk from '@lit-protocol/lit-node-client';
import { LitNetwork } from '@lit-protocol/constants';

let litNodeClient = null;

/**
 * Initialize connection to Lit Protocol network
 * @returns {Promise<LitNodeClient>}
 */
export const initLit = async () => {
  if (litNodeClient && litNodeClient.ready) {
    console.log('✅ Lit client already connected');
    return litNodeClient;
  }

  try {
    console.log('🔌 Connecting to Lit Protocol network...');
    
    litNodeClient = new LitJsSdk.LitNodeClient({
      litNetwork: LitNetwork.Cayenne, // Using Cayenne testnet (more stable than DatilDev)
      debug: true,
    });

    await litNodeClient.connect();
    console.log('✅ Successfully connected to Lit Network');
    
    return litNodeClient;
  } catch (error) {
    console.error('❌ Failed to connect to Lit Network:', error);
    throw new Error(`Lit connection failed: ${error.message}`);
  }
};

/**
 * Get the current Lit client instance
 * @returns {LitNodeClient}
 */
export const getLitClient = () => {
  if (!litNodeClient || !litNodeClient.ready) {
    throw new Error('Lit client not initialized. Call initLit() first.');
  }
  return litNodeClient;
};

/**
 * Encrypt a string (AES key) with Lit Protocol using time-based access control
 * @param {string} dataToEncrypt - The AES key to encrypt
 * @param {number} unlockTimestamp - Unix timestamp when decryption is allowed
 * @param {string} chain - Blockchain to use for timestamp check (default: 'ethereum')
 * @returns {Promise<{ciphertext: string, dataToEncryptHash: string, accessControlConditions: array}>}
 */
export const encryptWithLit = async (dataToEncrypt, unlockTimestamp, chain = 'ethereum') => {
  try {
    const client = await initLit();

    console.log('🔐 Encrypting with Lit Protocol...', {
      unlockTimestamp,
      unlockDate: new Date(unlockTimestamp * 1000).toLocaleString(),
      chain,
    });

    // Define time-based access control condition
    const accessControlConditions = [
      {
        contractAddress: '',
        standardContractType: '',
        chain,
        method: '',
        parameters: [':currentBlockTimestamp'],
        returnValueTest: {
          comparator: '>=',
          value: unlockTimestamp.toString(),
        },
      },
    ];

    // Encrypt the data
    const { ciphertext, dataToEncryptHash } = await LitJsSdk.encryptString(
      {
        accessControlConditions,
        dataToEncrypt,
      },
      client
    );

    console.log('✅ Encryption successful', {
      ciphertextLength: ciphertext.length,
      dataToEncryptHash,
    });

    return {
      ciphertext,
      dataToEncryptHash,
      accessControlConditions,
    };
  } catch (error) {
    console.error('❌ Lit encryption failed:', error);
    throw new Error(`Lit encryption failed: ${error.message}`);
  }
};

/**
 * Decrypt a Lit-encrypted string
 * @param {string} ciphertext - The encrypted data
 * @param {string} dataToEncryptHash - Hash of the original data
 * @param {array} accessControlConditions - The access control conditions
 * @param {string} chain - Blockchain used for conditions
 * @returns {Promise<string>} Decrypted data
 */
export const decryptWithLit = async (ciphertext, dataToEncryptHash, accessControlConditions, chain = 'ethereum') => {
  try {
    const client = await initLit();

    console.log('🔓 Attempting to decrypt with Lit Protocol...', {
      ciphertextLength: ciphertext.length,
      dataToEncryptHash,
      chain,
    });

    // Attempt decryption
    const decryptedString = await LitJsSdk.decryptToString(
      {
        accessControlConditions,
        ciphertext,
        dataToEncryptHash,
        chain,
      },
      client
    );

    console.log('✅ Decryption successful');
    return decryptedString;
  } catch (error) {
    console.error('❌ Lit decryption failed:', error);
    
    // Provide user-friendly error messages
    if (error.message.includes('not authorized')) {
      throw new Error('Access denied: Time-lock condition not met. The paper cannot be decrypted yet.');
    } else if (error.message.includes('timestamp')) {
      throw new Error('Time-lock active: Please wait until the scheduled unlock time.');
    }
    
    throw new Error(`Lit decryption failed: ${error.message}`);
  }
};

/**
 * Disconnect from Lit Network (cleanup)
 */
export const disconnectLit = async () => {
  if (litNodeClient) {
    await litNodeClient.disconnect();
    litNodeClient = null;
    console.log('🔌 Disconnected from Lit Network');
  }
};
