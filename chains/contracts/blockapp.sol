// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title blockapp - private file sharing with roles, permissions and an audit trail
/// Files live encrypted off-chain. This contract stores hashes, storage IDs, permissions and wrapped keys.
/// Read functions answer only for the caller, so users never see files that were not shared with them.
contract blockapp {
    enum Role { None, Employee, Manager, Admin }
    enum Access { None, View, Download, Edit }
    enum ReqStatus { Pending, Approved, Rejected }

    struct User { address wallet; string name; string department; Role role; bool active; bytes encKey; }
    struct FileRecord { uint256 id; string name; string fileType; string category; address owner; uint256 createdAt; uint256 size; bool isActive; }
    struct MyFile {
        uint256 id; string name; string fileType; string category; uint256 size;
        address owner; uint256 createdAt; bool isActive;
        Access level; uint64 expiry; bool revoked;
    }
    struct Version { string cid; bytes32 fileHash; uint256 size; address uploader; uint256 timestamp; }
    struct Grant { Access level; uint64 expiry; bytes wrappedKey; bool revoked; bool hidden; }
    struct AccessEntry { address user; Access level; uint64 expiry; }
    struct AccessRequest { uint256 id; uint256 fileId; address requester; Access fromLevel; Access level; string reason; ReqStatus status; uint256 timestamp; }
    struct UploadInput { string name; string fileType; string category; string cid; bytes32 fileHash; uint256 size; bytes wrappedKey; }

    mapping(address => User) private users;
    address[] private userList;

    uint256 public fileCount;
    mapping(uint256 => FileRecord) private files;
    mapping(uint256 => Version[]) private versions;
    mapping(uint256 => mapping(address => Grant)) private grants;
    mapping(uint256 => mapping(address => bool)) private listed;   // has a record for this file
    mapping(uint256 => address[]) private sharedWith;
    mapping(address => uint256[]) private fileIdsOf;
    mapping(uint256 => mapping(address => bool)) private pendingReq;
    AccessRequest[] private requests;

    // ───────────── Events: the permanent audit trail ─────────────
    event UserRegistered(address indexed wallet, string name, string department, Role role);
    event UserUpdated(address indexed wallet, Role role, string department, bool active);
    event KeyRegistered(address indexed wallet);
    event FileUploaded(uint256 indexed fileId, address indexed owner, string name, string cid, bytes32 fileHash, uint256 size);
    event FileShared(uint256 indexed fileId, address indexed owner, address indexed user, Access level, uint64 expiry);
    event AccessRevoked(uint256 indexed fileId, address indexed owner, address indexed user);
    event VersionAdded(uint256 indexed fileId, address indexed editor, uint256 version, string cid, bytes32 fileHash);
    event FileAccessed(uint256 indexed fileId, address indexed user, uint256 version, uint8 kind); // kind 0 view, 1 download
    event FileHidden(uint256 indexed fileId, address indexed user);
    event FileDeleted(uint256 indexed fileId, address indexed by);
    event AccessRequested(uint256 indexed requestId, uint256 indexed fileId, address indexed requester, Access level);
    event RequestResolved(uint256 indexed requestId, uint256 indexed fileId, address indexed requester, address owner, bool approved, Access level);
    event FileVerified(uint256 indexed fileId, address indexed user, uint256 version, bool matched, bytes32 computed);

    modifier onlyAdmin() {
        require(users[msg.sender].active && users[msg.sender].role == Role.Admin, "Admin only");
        _;
    }
    modifier onlyMember() {
        require(users[msg.sender].active, "Not an active member");
        _;
    }

    constructor() {
        _register(msg.sender, "Super Admin", "Administration", Role.Admin);
    }

    // ───────────── Members ─────────────
    function _register(address w, string memory n, string memory d, Role r) internal {
        require(w != address(0), "Bad address");
        require(r != Role.None, "Bad role");
        if (users[w].wallet == address(0)) userList.push(w);
        User storage u = users[w];
        u.wallet = w; u.name = n; u.department = d; u.role = r; u.active = true;
        emit UserRegistered(w, n, d, r);
    }

    function registerUser(address w, string calldata n, string calldata d, Role r) external onlyAdmin {
        _register(w, n, d, r);
    }

    function updateRole(address w, Role r) external onlyAdmin {
        require(users[w].wallet != address(0), "Unknown user");
        require(r != Role.None, "Bad role");
        require(w != msg.sender, "Cannot change yourself");
        users[w].role = r;
        emit UserUpdated(w, r, users[w].department, users[w].active);
    }

    function updateDepartment(address w, string calldata d) external onlyAdmin {
        require(users[w].wallet != address(0), "Unknown user");
        users[w].department = d;
        emit UserUpdated(w, users[w].role, d, users[w].active);
    }

    function setUserActive(address w, bool status) external onlyAdmin {
        require(users[w].wallet != address(0), "Unknown user");
        require(w != msg.sender, "Cannot change yourself");
        users[w].active = status;
        emit UserUpdated(w, users[w].role, users[w].department, status);
    }

    function setEncryptionKey(bytes calldata key) external onlyMember {
        require(key.length == 32, "Key must be 32 bytes");
        users[msg.sender].encKey = key;
        emit KeyRegistered(msg.sender);
    }

    // ───────────── Access helpers ─────────────
    function _accessOf(uint256 id, address who) internal view returns (Access) {
        if (!files[id].isActive || !users[who].active) return Access.None;
        Grant storage g = grants[id][who];
        if (g.revoked || g.level == Access.None) return Access.None;
        if (g.expiry != 0 && g.expiry < block.timestamp) return Access.None;
        return g.level;
    }

    function _hasRecord(uint256 id, address who) internal view returns (bool) {
        return listed[id][who] && !grants[id][who].hidden;
    }

    // ───────────── Files ─────────────
    function uploadFile(UploadInput calldata p) external onlyMember returns (uint256 id) {
        id = ++fileCount;
        _storeFile(id, p);
        emit FileUploaded(id, msg.sender, p.name, p.cid, p.fileHash, p.size);
    }

    function _storeFile(uint256 id, UploadInput calldata p) internal {
        FileRecord storage f = files[id];
        f.id = id; f.name = p.name; f.fileType = p.fileType; f.category = p.category;
        f.owner = msg.sender; f.createdAt = block.timestamp; f.size = p.size; f.isActive = true;
        _pushVersion(id, p.cid, p.fileHash, p.size);
        Grant storage g = grants[id][msg.sender];
        g.level = Access.Edit;
        g.wrappedKey = p.wrappedKey;
        listed[id][msg.sender] = true;
        fileIdsOf[msg.sender].push(id);
    }

    function _pushVersion(uint256 id, string calldata cid, bytes32 h, uint256 size) internal {
        Version storage v = versions[id].push();
        v.cid = cid; v.fileHash = h; v.size = size; v.uploader = msg.sender; v.timestamp = block.timestamp;
    }

    function addVersion(uint256 id, string calldata cid, bytes32 fileHash, uint256 size) external onlyMember {
        require(_accessOf(id, msg.sender) == Access.Edit, "Edit access required");
        _pushVersion(id, cid, fileHash, size);
        files[id].size = size;
        emit VersionAdded(id, msg.sender, versions[id].length, cid, fileHash);
    }

    function _grant(uint256 id, address to, Access level, uint64 expiry, bytes memory key) internal {
        require(users[to].active, "Recipient not active");
        require(level != Access.None, "Bad level");
        require(to != files[id].owner, "Owner already has access");
        if (!listed[id][to]) {
            listed[id][to] = true;
            sharedWith[id].push(to);
            fileIdsOf[to].push(id);
        }
        Grant storage g = grants[id][to];
        g.level = level; g.expiry = expiry; g.wrappedKey = key; g.revoked = false; g.hidden = false;
        emit FileShared(id, files[id].owner, to, level, expiry);
    }

    /// One transaction shares a file with several people.
    function shareWithMany(uint256 id, address[] calldata to, Access level, uint64 expiry, bytes[] calldata keys) external onlyMember {
        require(files[id].isActive, "No such file");
        require(files[id].owner == msg.sender, "Only owner");
        require(to.length > 0 && to.length == keys.length && to.length <= 25, "Bad recipients");
        for (uint256 i; i < to.length; i++) _grant(id, to[i], level, expiry, keys[i]);
    }

    function revokeAccess(uint256 id, address user) external onlyMember {
        require(files[id].owner == msg.sender, "Only owner");
        require(listed[id][user] && user != msg.sender, "Not shared with that person");
        Grant storage g = grants[id][user];
        g.level = Access.None;
        g.revoked = true;
        delete g.wrappedKey;
        emit AccessRevoked(id, msg.sender, user);
    }

    /// kind 0 = view, 1 = download. Download needs Download or Edit access.
    function recordAccess(uint256 id, uint8 kind) external {
        Access a = _accessOf(id, msg.sender);
        require(a != Access.None, "No access");
        require(kind == 0 || (kind == 1 && a >= Access.Download), "Download not allowed");
        emit FileAccessed(id, msg.sender, versions[id].length, kind);
    }

        /// The caller submits the fingerprint of the stored file they just decrypted.
    /// The contract compares it with the recorded fingerprint and logs the result.
    function verifyFile(uint256 id, bytes32 computed) external {
        require(_accessOf(id, msg.sender) != Access.None, "No access");
        uint256 n = versions[id].length;
        bool ok = versions[id][n - 1].fileHash == computed;
        emit FileVerified(id, msg.sender, n, ok, computed);
    }

    /// Removes the file from MY list only. Everyone else keeps their access.
    function hideFile(uint256 id) external onlyMember {
        require(listed[id][msg.sender], "Not in your files");
        grants[id][msg.sender].hidden = true;
        emit FileHidden(id, msg.sender);
    }

    /// Owner only. Receivers keep a record that shows "deleted by owner".
    function deleteForEveryone(uint256 id) external onlyMember {
        require(files[id].owner == msg.sender, "Only owner");
        require(files[id].isActive, "No such file");
        files[id].isActive = false;
        grants[id][msg.sender].hidden = true;
        emit FileDeleted(id, msg.sender);
    }

    // ───────────── Permission requests ─────────────
    function requestAccess(uint256 id, Access level, string calldata reason) external onlyMember {
        require(_hasRecord(id, msg.sender), "Not shared with you");
        require(files[id].isActive, "File was deleted");
        require(files[id].owner != msg.sender, "You own this file");
        require(level != Access.None, "Bad level");
        Access current = _accessOf(id, msg.sender);
        require(uint8(level) > uint8(current), "You already have this access");
        require(!pendingReq[id][msg.sender], "Request already pending");
        pendingReq[id][msg.sender] = true;
        AccessRequest storage r = requests.push();
        r.id = requests.length - 1; r.fileId = id; r.requester = msg.sender; r.fromLevel = current;
        r.level = level; r.reason = reason; r.status = ReqStatus.Pending; r.timestamp = block.timestamp;
        emit AccessRequested(r.id, id, msg.sender, level);
    }

    function resolveRequest(uint256 rid, bool approve, uint64 expiry, bytes calldata wrappedKey) external onlyMember {
        AccessRequest storage r = requests[rid];
        require(r.status == ReqStatus.Pending, "Already resolved");
        require(files[r.fileId].owner == msg.sender, "Only owner");
        pendingReq[r.fileId][r.requester] = false;
        if (approve) {
            require(files[r.fileId].isActive, "No such file");
            _grant(r.fileId, r.requester, r.level, expiry, wrappedKey);
            r.status = ReqStatus.Approved;
        } else {
            r.status = ReqStatus.Rejected;
        }
        _emitResolved(rid, approve);
    }

    function _emitResolved(uint256 rid, bool approve) internal {
        AccessRequest storage r = requests[rid];
        emit RequestResolved(rid, r.fileId, r.requester, msg.sender, approve, r.level);
    }

    // ───────────── Read functions ─────────────
    function getUser(address w) external view returns (User memory) { return users[w]; }

    function getAllUsers() external view returns (User[] memory out) {
        out = new User[](userList.length);
        for (uint256 i; i < userList.length; i++) out[i] = users[userList[i]];
    }

    /// Files I own or that were sent to me (including removed, expired and deleted ones), minus those I removed.
    function getMyFiles() external view returns (MyFile[] memory out) {
        uint256[] storage ids = fileIdsOf[msg.sender];
        uint256 n;
        for (uint256 i; i < ids.length; i++) if (!grants[ids[i]][msg.sender].hidden) n++;
        out = new MyFile[](n);
        uint256 k;
        for (uint256 i; i < ids.length; i++) {
            uint256 id = ids[i];
            Grant storage g = grants[id][msg.sender];
            if (g.hidden) continue;
            FileRecord storage f = files[id];
            MyFile memory m;
            m.id = f.id; m.name = f.name; m.fileType = f.fileType; m.category = f.category; m.size = f.size;
            m.owner = f.owner; m.createdAt = f.createdAt; m.isActive = f.isActive;
            m.level = _accessOf(id, msg.sender); m.expiry = g.expiry; m.revoked = g.revoked;
            out[k++] = m;
        }
    }

    function getVersions(uint256 id) external view returns (Version[] memory) {
        require(_accessOf(id, msg.sender) != Access.None, "No access");
        return versions[id];
    }

    function getMyGrant(uint256 id) external view returns (Grant memory) { return grants[id][msg.sender]; }

    function getAccessList(uint256 id) external view returns (AccessEntry[] memory) {
        require(files[id].owner == msg.sender, "Only owner");
        address[] storage list = sharedWith[id];
        uint256 n;
        for (uint256 i; i < list.length; i++) if (grants[id][list[i]].level != Access.None) n++;
        AccessEntry[] memory out = new AccessEntry[](n);
        uint256 k;
        for (uint256 i; i < list.length; i++) {
            Grant storage g = grants[id][list[i]];
            if (g.level != Access.None) out[k++] = AccessEntry(list[i], g.level, g.expiry);
        }
        return out;
    }

    function _involved(AccessRequest storage r) internal view returns (bool) {
        return r.requester == msg.sender || files[r.fileId].owner == msg.sender;
    }

    /// Requests I made, plus requests for files I own.
    function getMyRequests() external view returns (AccessRequest[] memory out) {
        uint256 n;
        for (uint256 i; i < requests.length; i++) if (_involved(requests[i])) n++;
        out = new AccessRequest[](n);
        uint256 k;
        for (uint256 i; i < requests.length; i++) if (_involved(requests[i])) out[k++] = requests[i];
    }
}