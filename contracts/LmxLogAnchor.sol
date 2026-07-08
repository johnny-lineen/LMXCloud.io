// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Anchors Merkle roots of LMX Cloud inference receipt batches on Base.
contract LmxLogAnchor {
    address public owner;
    mapping(bytes32 => uint256) public anchoredAt;

    event RootAnchored(bytes32 indexed root, address indexed publisher, uint256 timestamp);

    error NotOwner();
    error AlreadyAnchored();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address initialOwner) {
        owner = initialOwner;
    }

    function anchor(bytes32 root) external onlyOwner {
        if (anchoredAt[root] != 0) revert AlreadyAnchored();
        anchoredAt[root] = block.timestamp;
        emit RootAnchored(root, msg.sender, block.timestamp);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
