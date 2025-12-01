const { ethers } = require('ethers');

const contractABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "_paperId", "type": "uint256"}],
    "name": "getPaper",
    "outputs": [{"components": [{"internalType": "string", "name": "examName", "type": "string"}, {"internalType": "string", "name": "subject", "type": "string"}, {"internalType": "address", "name": "teacher", "type": "address"}, {"internalType": "string[]", "name": "ipfsCIDs", "type": "string[]"}, {"internalType": "uint256", "name": "uploadTimestamp", "type": "uint256"}, {"internalType": "uint256", "name": "unlockTimestamp", "type": "uint256"}, {"internalType": "bool", "name": "isScheduled", "type": "bool"}, {"internalType": "bool", "name": "isUnlocked", "type": "bool"}, {"internalType": "address", "name": "authority", "type": "address"}, {"internalType": "bytes", "name": "timeLockedKey", "type": "bytes"}, {"internalType": "string", "name": "keyDerivationSalt", "type": "string"}], "internalType": "struct ExamRegistry.Paper", "name": "", "type": "tuple"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paperCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function checkPapers() {
  const provider = new ethers.providers.JsonRpcProvider('https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161');
  const contract = new ethers.Contract('0x550447A2a9226dfd8DB2c3f8c36CaBD56cA1CE99', contractABI, provider);
  
  try {
    const count = await contract.paperCount();
    console.log('📊 Total papers:', count.toString());
    
    for (let i = 1; i <= count.toNumber(); i++) {
      const paper = await contract.getPaper(i);
      console.log(`📄 Paper ${i}:`, {
        examName: paper.examName,
        subject: paper.subject,
        uploadTime: new Date(paper.uploadTimestamp.toNumber() * 1000).toISOString(),
        unlockTime: paper.unlockTimestamp.toNumber() > 0 ? new Date(paper.unlockTimestamp.toNumber() * 1000).toISOString() : 'Not scheduled',
        isScheduled: paper.isScheduled,
        isUnlocked: paper.isUnlocked,
        timeLockedKeyLength: paper.timeLockedKey.length,
        saltLength: paper.keyDerivationSalt.length,
        cidsCount: paper.ipfsCIDs.length
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkPapers();