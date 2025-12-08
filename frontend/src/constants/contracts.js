export const EXAM_REGISTRY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const EXAM_REGISTRY_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "authority",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "publicKey",
        "type": "bytes"
      }
    ],
    "name": "AuthorityRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "centerAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      }
    ],
    "name": "CenterRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "paperId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "unlockTimestamp",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "authority",
        "type": "address"
      }
    ],
    "name": "PaperScheduled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "paperId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "PaperUnlocked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "paperId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "examName",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "teacher",
        "type": "address"
      }
    ],
    "name": "PaperUploaded",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "authorityPublicKey",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "centerAddresses",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "centers",
    "outputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "bytes",
        "name": "publicKey",
        "type": "bytes"
      },
      {
        "internalType": "bool",
        "name": "isRegistered",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllCenters",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      },
      {
        "internalType": "string[]",
        "name": "",
        "type": "string[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_center",
        "type": "address"
      }
    ],
    "name": "getCenterPublicKey",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_paperId",
        "type": "uint256"
      }
    ],
    "name": "getMyClassroom",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_paperId",
        "type": "uint256"
      }
    ],
    "name": "getMyPaperKey",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_paperId",
        "type": "uint256"
      }
    ],
    "name": "getPaper",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "examName",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "subject",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "teacher",
            "type": "address"
          },
          {
            "internalType": "string[]",
            "name": "ipfsCIDs",
            "type": "string[]"
          },
          {
            "internalType": "uint256",
            "name": "uploadTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "unlockTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isScheduled",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "isUnlocked",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "authority",
            "type": "address"
          },
          {
            "internalType": "bytes",
            "name": "authorityEncryptedKey",
            "type": "bytes"
          }
        ],
        "internalType": "struct ExamRegistry.Paper",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "paperClassrooms",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paperCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "paperKeys",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "papers",
    "outputs": [
      {
        "internalType": "string",
        "name": "examName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "subject",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "teacher",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "uploadTimestamp",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "unlockTimestamp",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isScheduled",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "isUnlocked",
        "type": "bool"
      },
      {
        "internalType": "address",
        "name": "authority",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "authorityEncryptedKey",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "_publicKey",
        "type": "bytes"
      }
    ],
    "name": "registerAuthority",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_name",
        "type": "string"
      },
      {
        "internalType": "bytes",
        "name": "_publicKey",
        "type": "bytes"
      }
    ],
    "name": "registerExamCenter",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_paperId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_unlockTimestamp",
        "type": "uint256"
      },
      {
        "internalType": "address[]",
        "name": "_centers",
        "type": "address[]"
      },
      {
        "internalType": "string[]",
        "name": "_classrooms",
        "type": "string[]"
      },
      {
        "internalType": "bytes[]",
        "name": "_encryptedKeys",
        "type": "bytes[]"
      }
    ],
    "name": "scheduleExam",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_paperId",
        "type": "uint256"
      }
    ],
    "name": "unlockPaper",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_examName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_subject",
        "type": "string"
      },
      {
        "internalType": "string[]",
        "name": "_ipfsCIDs",
        "type": "string[]"
      },
      {
        "internalType": "bytes",
        "name": "_authorityEncryptedKey",
        "type": "bytes"
      }
    ],
    "name": "uploadPaper",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
