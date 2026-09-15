// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AuditAnchor — on-chain anchor for services/audit's hash chain
/// @notice Periodically anchors the latest digest of the off-chain,
///         append-only audit log (services/audit/src/chain.ts) so tampering
///         with historical entries becomes provable: recompute the chain
///         off-chain, compare to the anchor recorded here for that time.
///         See README.md § "Emit an immutable execution trace (OpenTelemetry
///         to an audit store, digest anchored on-chain)".
/// @dev Deliberately NOT an ERC standard — this is a small, Cohorti-specific
///      contract. It anchors; it does not store or interpret log contents.
contract AuditAnchor {
    struct Anchor {
        bytes32 digest;
        uint256 timestamp;
        address anchoredBy;
    }

    address public admin;
    mapping(address => bool) public anchors_;
    Anchor[] private _history;

    event Anchored(uint256 indexed index, bytes32 indexed digest, address indexed anchoredBy);
    event AnchorerUpdated(address indexed anchorer, bool allowed);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    error NotAdmin();
    error NotAuthorizedAnchorer();
    error EmptyHistory();
    error IndexOutOfRange();
    error ZeroAddress();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyAnchorer() {
        if (!anchors_[msg.sender] && msg.sender != admin) revert NotAuthorizedAnchorer();
        _;
    }

    constructor(address admin_) {
        if (admin_ == address(0)) revert ZeroAddress();
        admin = admin_;
        anchors_[admin_] = true;
    }

    /// @notice Records `digest` as the audit chain's latest digest at this block.
    /// @dev Intentionally append-only — there is no update or delete. A
    ///      wrong digest is corrected by anchoring a new, later entry, never
    ///      by rewriting history here (that would defeat the point).
    function anchor(bytes32 digest) external onlyAnchorer returns (uint256 index) {
        index = _history.length;
        _history.push(Anchor({digest: digest, timestamp: block.timestamp, anchoredBy: msg.sender}));
        emit Anchored(index, digest, msg.sender);
    }

    function latest() external view returns (Anchor memory) {
        if (_history.length == 0) revert EmptyHistory();
        return _history[_history.length - 1];
    }

    function at(uint256 index) external view returns (Anchor memory) {
        if (index >= _history.length) revert IndexOutOfRange();
        return _history[index];
    }

    function count() external view returns (uint256) {
        return _history.length;
    }

    function setAnchorer(address anchorer, bool allowed) external onlyAdmin {
        anchors_[anchorer] = allowed;
        emit AnchorerUpdated(anchorer, allowed);
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }
}
