pragma solidity ^0.8.20;
// SPDX-License-Identifier: MIT

/**
 * @title ExamRegistry - Time-Locked Secure Exam System
 * @dev Papers are encrypted with time-locked keys that only unlock at exam time
 * Authority can schedule but cannot decrypt papers
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
        bytes timeLockedKey;      // AES key encrypted with time-lock mechanism
        string keyDerivationSalt; // Salt for deterministic key derivation
    }

    struct Center {
        string name;
        bytes publicKey;
        bool isRegistered;
    }
    
    struct Authority {
        string name;
        bool isRegistered;
        bool isActive;
    }
    
    // State variables
    mapping(uint256 => Paper) public papers;
    uint256 public paperCount;
    
    // Registry
    mapping(address => Center) public centers;
    address[] public centerAddresses;
    
    // Authority Registry (multiple authorities allowed)
    mapping(address => Authority) public authorities;
    address[] public authorityAddresses;
    
    // Per-paper access controls
    // paperId => centerAddress => roomNumber
    mapping(uint256 => mapping(address => string)) public paperClassrooms;
    // paperId => centerAddress => assigned (boolean)
    mapping(uint256 => mapping(address => bool)) public paperAssignments;
    
    // Events
    event PaperUploaded(uint256 indexed paperId, string examName, address indexed teacher);
    event PaperScheduled(uint256 indexed paperId, uint256 unlockTimestamp, address indexed authority);
    event PaperUnlocked(uint256 indexed paperId, uint256 timestamp);
    event CenterRegistered(address indexed centerAddress, string name);
    event AuthorityRegistered(address indexed authority, string name);
    
    modifier validPaper(uint256 _paperId) {
        require(_paperId > 0 && _paperId <= paperCount, "Invalid paper ID");
        _;
    }
    
    modifier onlyAuthority() {
        require(authorities[msg.sender].isRegistered && authorities[msg.sender].isActive, "Not authorized");
        _;
    }
    
    /**
     * @dev Register as an Authority (exam scheduling entity)
     */
    function registerAuthority(string memory _name) external {
        if (!authorities[msg.sender].isRegistered) {
            authorityAddresses.push(msg.sender);
        }
        
        authorities[msg.sender] = Authority({
            name: _name,
            isRegistered: true,
            isActive: true
        });
        
        emit AuthorityRegistered(msg.sender, _name);
    }

    /**
     * @dev Teacher uploads a paper with time-locked encryption
     * The paper is encrypted with a key that can only be derived at unlock time
     */
    function uploadPaper(
        string memory _examName,
        string memory _subject,
        string[] memory _ipfsCIDs,
        bytes memory _timeLockedKey,
        string memory _keyDerivationSalt
    ) external returns (uint256) {
        require(bytes(_examName).length > 0, "Exam name required");
        require(_ipfsCIDs.length > 0, "IPFS CIDs required");
        require(_timeLockedKey.length > 0, "Time-locked key required");
        require(bytes(_keyDerivationSalt).length > 0, "Key derivation salt required");
        
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
            timeLockedKey: _timeLockedKey,
            keyDerivationSalt: _keyDerivationSalt
        });
        
        emit PaperUploaded(paperCount, _examName, msg.sender);
        return paperCount;
    }
    
    /**
     * @dev Authority schedules an exam for specific centers
     * Authority cannot decrypt papers - only assigns them to centers
     */
    function scheduleExam(
        uint256 _paperId,
        uint256 _unlockTimestamp,
        address[] memory _centers,
        string[] memory _classrooms
    ) external onlyAuthority validPaper(_paperId) {
        require(_centers.length == _classrooms.length, "Centers/Classrooms mismatch");
        require(_unlockTimestamp > block.timestamp, "Unlock time must be in future");
        
        Paper storage paper = papers[_paperId];
        require(!paper.isScheduled, "Paper already scheduled");
        
        // Assign paper to centers
        for (uint i = 0; i < _centers.length; i++) {
            require(centers[_centers[i]].isRegistered, "Center not registered");
            paperClassrooms[_paperId][_centers[i]] = _classrooms[i];
            paperAssignments[_paperId][_centers[i]] = true;
        }
        
        paper.unlockTimestamp = _unlockTimestamp;
        paper.isScheduled = true;
        paper.authority = msg.sender;
        
        emit PaperScheduled(_paperId, _unlockTimestamp, msg.sender);
    }
    
    /**
     * @dev Unlock a paper (can be called by anyone after unlock time)
     * This is a public function that enables time-locked access
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
    
    // Get list of all registered authorities
    function getAllAuthorities() external view returns (address[] memory, string[] memory) {
        address[] memory addrs = new address[](authorityAddresses.length);
        string[] memory names = new string[](authorityAddresses.length);
        
        for (uint i = 0; i < authorityAddresses.length; i++) {
            addrs[i] = authorityAddresses[i];
            names[i] = authorities[authorityAddresses[i]].name;
        }
        
        return (addrs, names);
    }

    // Check if center is assigned to a paper
    function isAssignedToCenter(uint256 _paperId, address _center) external view validPaper(_paperId) returns (bool) {
        return paperAssignments[_paperId][_center];
    }
    
    // Get specific classroom for the caller
    function getMyClassroom(uint256 _paperId) external view validPaper(_paperId) returns (string memory) {
        require(paperAssignments[_paperId][msg.sender], "Not assigned to this paper");
        return paperClassrooms[_paperId][msg.sender];
    }
    
    // Get time-locked key and salt for decryption (only after unlock time)
    function getTimeLockedKey(uint256 _paperId) external view validPaper(_paperId) returns (bytes memory, string memory) {
        Paper memory paper = papers[_paperId];
        require(paper.isUnlocked, "Paper not unlocked yet");
        require(paperAssignments[_paperId][msg.sender], "Not assigned to this paper");
        
        return (paper.timeLockedKey, paper.keyDerivationSalt);
    }
    
    function getCenterPublicKey(address _center) external view returns (bytes memory) {
        return centers[_center].publicKey;
    }
}
