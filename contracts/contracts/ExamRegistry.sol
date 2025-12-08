pragma solidity ^0.8.20;
// SPDX-License-Identifier: MIT

/**
 * @title ExamRegistry
 * @dev Manages exam paper uploads, scheduling, and time-locked access with multi-center support
 */
contract ExamRegistry {
    struct Paper {
        string examName;
        string subject;
        address teacher;
        string[] ipfsCIDs;        // Encrypted chunks on IPFS
        uint256 uploadTimestamp;
        uint256 unlockTimestamp;
        bool isScheduled;
        bool isUnlocked;
        address authority;        // Who scheduled it
        bytes authorityEncryptedKey; // Key encrypted for the Authority (master key)
    }

    struct Center {
        string name;
        bytes publicKey;
        bool isRegistered;
    }
    
    // State variables
    mapping(uint256 => Paper) public papers;
    uint256 public paperCount;
    
    // Registry
    mapping(address => Center) public centers;
    address[] public centerAddresses; // To enumerate centers

    // Authority Registry (Simplification: only one authority for now or allow multiple)
    bytes public authorityPublicKey;
    
    // Per-paper access controls
    // paperId => centerAddress => roomNumber
    mapping(uint256 => mapping(address => string)) public paperClassrooms;
    // paperId => centerAddress => encryptedKey (AES key encrypted with Center's RSA Key)
    mapping(uint256 => mapping(address => bytes)) public paperKeys;
    
    // Events
    event PaperUploaded(uint256 indexed paperId, string examName, address indexed teacher);
    event PaperScheduled(uint256 indexed paperId, uint256 unlockTimestamp, address indexed authority);
    event PaperUnlocked(uint256 indexed paperId, uint256 timestamp);
    event CenterRegistered(address indexed centerAddress, string name);
    event AuthorityRegistered(address indexed authority, bytes publicKey);
    
    modifier validPaper(uint256 _paperId) {
        require(_paperId > 0 && _paperId <= paperCount, "Invalid paper ID");
        _;
    }
    
    /**
     * @dev Register the Authority's Public Key (so teachers can encrypt for them)
     */
    function registerAuthority(bytes memory _publicKey) external {
        authorityPublicKey = _publicKey;
        emit AuthorityRegistered(msg.sender, _publicKey);
    }

    /**
     * @dev Teacher uploads a paper, encrypting the key for the Authority
     */
    function uploadPaper(
        string memory _examName,
        string memory _subject,
        string[] memory _ipfsCIDs,
        bytes memory _authorityEncryptedKey
    ) external returns (uint256) {
        require(bytes(_examName).length > 0, "Exam name required");
        require(bytes(authorityPublicKey).length > 0, "Authority not registered yet");
        
        paperCount++;
        
        papers[paperCount] = Paper({
            examName: _examName,
            subject: _subject,
            teacher: msg.sender,
            ipfsCIDs: _ipfsCIDs,
            uploadTimestamp: block.timestamp,
            unlockTimestamp: 0,
            isScheduled: false,
            isUnlocked: false,
            authority: address(0),
            authorityEncryptedKey: _authorityEncryptedKey
        });
        
        emit PaperUploaded(paperCount, _examName, msg.sender);
        return paperCount;
    }
    
    /**
     * @dev Authority schedules an exam for specific centers
     */
    function scheduleExam(
        uint256 _paperId,
        uint256 _unlockTimestamp,
        address[] memory _centers,
        string[] memory _classrooms,
        bytes[] memory _encryptedKeys
    ) external validPaper(_paperId) {
        require(_centers.length == _classrooms.length, "Centers/Classrooms mismatch");
        require(_centers.length == _encryptedKeys.length, "Centers/Keys mismatch");
        require(_unlockTimestamp > block.timestamp, "Unlock time must be in future");
        
        Paper storage paper = papers[_paperId];
        require(!paper.isScheduled, "Paper already scheduled");
        
        for (uint i = 0; i < _centers.length; i++) {
            paperClassrooms[_paperId][_centers[i]] = _classrooms[i];
            paperKeys[_paperId][_centers[i]] = _encryptedKeys[i];
        }
        
        paper.unlockTimestamp = _unlockTimestamp;
        paper.isScheduled = true;
        paper.authority = msg.sender;
        
        emit PaperScheduled(_paperId, _unlockTimestamp, msg.sender);
    }
    
    /**
     * @dev Unlock a paper
     */
    function unlockPaper(uint256 _paperId) external validPaper(_paperId) {
        Paper storage paper = papers[_paperId];
        require(paper.isScheduled, "Paper not scheduled");
        require(block.timestamp >= paper.unlockTimestamp, "Too early to unlock");
        
        paper.isUnlocked = true;
        emit PaperUnlocked(_paperId, block.timestamp);
    }
    
    /**
     * @dev Exam center registers their Name and Public Key
     */
    function registerExamCenter(string memory _name, bytes memory _publicKey) external {
        require(bytes(_name).length > 0, "Name required");
        require(_publicKey.length > 0, "Public key required");
        
        if (!centers[msg.sender].isRegistered) {
            centerAddresses.push(msg.sender);
        }
        
        centers[msg.sender] = Center({
            name: _name,
            publicKey: _publicKey,
            isRegistered: true
        });
        
        emit CenterRegistered(msg.sender, _name);
    }
    
    // --- Getters ---

    function getPaper(uint256 _paperId) external view validPaper(_paperId) returns (Paper memory) {
        return papers[_paperId];
    }
    
    // Get list of all registered centers (for Authority UI)
    function getAllCenters() external view returns (address[] memory, string[] memory) {
        address[] memory addrs = new address[](centerAddresses.length);
        string[] memory names = new string[](centerAddresses.length);
        
        for (uint i = 0; i < centerAddresses.length; i++) {
            addrs[i] = centerAddresses[i];
            names[i] = centers[centerAddresses[i]].name;
        }
        
        return (addrs, names);
    }

    // Get specific key for the caller (Exam Center)
    function getMyPaperKey(uint256 _paperId) external view validPaper(_paperId) returns (bytes memory) {
        return paperKeys[_paperId][msg.sender];
    }
    
    // Get specific classroom for the caller
    function getMyClassroom(uint256 _paperId) external view validPaper(_paperId) returns (string memory) {
        return paperClassrooms[_paperId][msg.sender];
    }
    
    function getCenterPublicKey(address _center) external view returns (bytes memory) {
        return centers[_center].publicKey;
    }
}
