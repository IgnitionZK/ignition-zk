// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IMembershipManager {

// ====================================================================================================================
//                                       EXTERNAL STATE-CHANGING FUNCTIONS
// ====================================================================================================================
    /**
     * @notice Sets the address of the zk-SNARK verifier contract.
     * @dev Can only be called by the governor.
     * @param _verifier The address of the new verifier contract.
     * @custom:error AddressCannotBeZero If the provided verifier address is zero.
     */
    function setMembershipVerifier(address _verifier) external;

    /**
     * @notice Deploys a new ERC721 NFT Clone for a specific group.
     * @dev Uses the Clones library to create a deterministic clone of the NFT implementation.
     * @dev The newly deployed NFT Clone's owner is set to the MembershipManager.
     * @dev Only the governor can call this function. 
     * @param groupKey The unique identifier for the group.
     * @param name The desired name for the new ERC721 collection.
     * @param symbol The desired symbol for the new ERC721 collection.
     * @custom:error GroupNftAlreadySet If an NFT contract has already been deployed for this group key.
     * @custom:error KeyCannotBeZero If the provided group key is zero.
     */
    function deployGroupNft(bytes32 groupKey, string calldata name, string calldata symbol) external returns (address);
    
    /**
     * @notice Initializes the first Merkle root for a specific group.
     * @dev Can only be called once per `groupKey` by the governor.
     * @dev This function ensures that the group NFT has been set before initializing the root.
     * @param initialRoot The initial Merkle root to set.
     * @param groupKey The unique identifier for the group.
     * @custom:error RootAlreadyInitialized If a root for the given group key has already been set.
     * @custom:error RootCannotBeZero If the provided initial root is zero.
     * @custom:error KeyCannotBeZero If the provided group key is zero.
     * @custom:error GroupNftNotSet If no NFT contract has been deployed for the specified group key.
     */
    function initRoot(bytes32 initialRoot, bytes32 groupKey) external;

    /**
     * @notice Updates the Merkle root for an existing group.
     * @dev Can only be called by the governor.
     * @param newRoot The new Merkle root to set.
     * @param groupKey The unique identifier for the group.
     * @custom:error RootNotYetInitialized If no root has been set for the group yet.
     * @custom:error RootCannotBeZero If the new root is zero.
     * @custom:error NewRootMustBeDifferent If the new root is identical to the current root.
     * @custom:error KeyCannotBeZero If the provided group key is zero.
     * @custom:error GroupNftNotSet If no NFT contract has been deployed for the specified group key.
     */
    function setRoot(bytes32 newRoot, bytes32 groupKey) external;
    
    /**
     * @notice Verifies a zk-SNARK proof against a group's current Merkle root and marks the nullifier as used.
     * @dev Can only be called by the governor. Prevents double-spending by checking nullifier usage.
     * @param proof The zk-SNARK proof data.
     * @param publicSignals The public signals associated with the proof, including root and nullifier.
     * @param groupKey The unique identifier for the group to verify against.
     * @custom:error RootNotYetInitialized If no root has been set for the group yet.
     * @custom:error InvalidMerkleRoot If the proof's root does not match the group's current root.
     * @custom:error NullifierAlreadyUsed If the nullifier has already been consumed.
     * @custom:error InvalidProof If the zk-SNARK proof itself is invalid.
     * @custom:error InvalidGroupKey If the group key provided in the public signals does not match the expected group key.
     * @custom:error KeyCannotBeZero If the provided group key is zero.
     */
    function verifyProof(uint256[24] calldata proof, uint256[3] calldata publicSignals, bytes32 groupKey) external;
    
    /** 
     * @notice Adds a new member to a specific group by minting an ERC721 token.
     * @dev Only the governor can call this function. Ensures that the member address is not zero, does not already hold a token for this group,
     * and is an externally owned account (EOA).
     * The function mints a new token for the member using the group's NFT contract.
     * Emits an event upon successful minting of the membership token.
     * @param memberAddress The address of the member to add.
     * @param groupKey The identifier of the group.
     * @custom:error GroupNftNotSet If no NFT contract is deployed for the specified group.
     * @custom:error AddressCannotBeZero If the member address is zero.
     * @custom:error MemberAlreadyHasToken If the member already holds a token for this group.
     * @custom:error MemberMustBeEOA If the member address is a contract address (and not an EOA).
     * @custom:error MintingFailed If the `safeMint` call to the NFT contract fails.
     */
    function mintNftToMember(address memberAddress, bytes32 groupKey) external;
    
    /**
     * @notice Adds multiple members to a specific group in a single transaction.
     * @dev Only the governor can call this function. 
     * Iterates and calls `mintNftToMember` for each address.
     * @param memberAddresses An array of addresses of members to add.
     * @param groupKey The identifier of the group.
     * @custom:error NoMembersProvided If the `memberAddresses` array is empty.
     * @custom:error MemberBatchTooLarge If the number of members exceeds `MAX_MEMBERS_BATCH`.
     * @custom:error (Propagates errors from `mintNftToMember`)
     * @custom:error KeyCannotBeZero If the provided group key is zero.
     */
    function mintNftToMembers(address[] calldata memberAddresses, bytes32 groupKey) external;
    
    /**
     * @notice Removes a member from a specific group by burning their membership token.
     * @dev Only the governor can call this function.
     * @param memberAddress The address of the member to remove.
     * @param groupKey The identifier of the group.
     * @custom:error KeyCannotBeZero If the provided group key is zero.
     * @custom:error AddressCannotBeZero If the member address is zero.
     * @custom:error GroupNftNotSet If no NFT contract is deployed for the specified group.
     * @custom:error MemberDoesNotHaveToken If the member does not hold a token for this group.
     */
    function burnMemberNft(address memberAddress, bytes32 groupKey) external;
    
   
// ====================================================================================================================
//                                       EXTERNAL VIEW FUNCTIONS
// ====================================================================================================================
    /**
     * @notice Retrieves the current Merkle root for a specific group.
     * @dev Only callable by the owner (governor). Returns the stored root for the given group key.
     * @param groupKey The unique identifier for the group.
     * @return The current Merkle root for the specified group. Returns bytes32(0) if no root has been set.
     */
    function getRoot(bytes32 groupKey) external view returns (bytes32);
    
    /**
     * @notice Retrieves the address of the ERC721 NFT contract for a specific group.
     * @dev Only callable by the owner (governor). Returns the NFT contract address for the given group key.
     * @param groupKey The unique identifier for the group.
     * @return address of the ERC721 NFT contract associated with the specified group key.
     * @custom:error KeyCannotBeZero If the provided group key is zero.
     */
    function getGroupNftAddress(bytes32 groupKey) external view returns (address);

     /**
     * @notice Retrieves the nullifier status for a specific group and nullifier.
     * @dev Only callable by the owner (governor). 
     * Returns true if the nullifier has been used.
     * @param groupKey The unique identifier for the group.
     * @param nullifier The nullifier to check.
     * @return bool indicating whether the nullifier has been used.
     */
    function getNullifierStatus(bytes32 groupKey, bytes32 nullifier) external view returns (bool);

    /**
     * @notice Retrieves the address of the zk-SNARK verifier contract.
     * @dev Only callable by the owner (governor).
     * @return The address of the verifier contract.
     */
    function getVerifier() external view returns (address);

    /**
     * @notice Retrieves the address of the NFT implementation contract.
     * @dev Only callable by the owner (governor).
     * @return address of the NFT implementation contract.
     */
    function getNftImplementation() external view returns (address);

    /**
     * @notice Retrieves the maximum number of members that can be added in a single batch transaction.
     * @dev Only callable by the owner (governor).
     * @return The maximum batch size for member additions.
     */
    function getMaxMembersBatch() external view returns (uint256);
    
// ====================================================================================================================
//                                       EXTERNAL HELPER FUNCTIONS
// ====================================================================================================================

    /** 
     * @notice Revokes the MINTER_ROLE from the specified NFT clone.
     * @dev Only callable by the owner (governor).
     * @param nftClone The address of the NFT contract clone from which to revoke the role.
     * @custom:error AddressCannotBeZero If the provided NFT clone address is zero.
     */
    function revokeMinterRole(address nftClone) external;

    /** 
     * @notice Revokes the BURNER_ROLE from the specified NFT clone.
     * @dev Only callable by the owner (governor).
     * @param nftClone The address of the NFT contract clone from which to revoke the role.
     * @custom:error AddressCannotBeZero If the provided NFT clone address is zero.
     */
    function revokeBurnerRole(address nftClone) external;

    /**
     * @notice Grants the MINTER_ROLE to the specified address in the NFT clone.
     * @dev Only callable by the owner (governor).
     * @param nftClone The address of the NFT contract clone to which to grant the role.
     * @param grantTo The address to which to grant the role.
     * @custom:error AddressCannotBeZero If the provided NFT clone or grantTo address is zero.
     */
    function grantMinterRole(address nftClone, address grantTo) external;

    /**
     * @notice Grants the BURNER_ROLE to the specified address in the NFT clone.
     * @dev Only callable by the owner (governor).
     * @param nftClone The address of the NFT contract clone to which to grant the role.
     * @param grantTo The address to which to grant the role.
     * @custom:error AddressCannotBeZero If the provided NFT clone or grantTo address is zero.
     */
    function grantBurnerRole(address nftClone, address grantTo) external;
    
}