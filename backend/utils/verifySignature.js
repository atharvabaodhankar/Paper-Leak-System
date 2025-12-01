const { ethers } = require('ethers');

/**
 * Verify that a signature was created by the owner of a wallet address
 * @param {string} walletAddress - The Ethereum wallet address
 * @param {string} message - The message that was signed
 * @param {string} signature - The signature to verify
 * @returns {boolean} - True if signature is valid, false otherwise
 */
const verifySignature = (walletAddress, message, signature) => {
  try {
    // Recover the address from the signature
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    
    // Compare addresses (case-insensitive)
    return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error.message);
    return false;
  }
};

module.exports = {
  verifySignature
};
