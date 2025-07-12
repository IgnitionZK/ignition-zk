// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IMembershipManager {

// ====================================================================================================================
//                                       EXTERNAL STATE-CHANGING FUNCTIONS
// ====================================================================================================================

    /**
     * @notice Deploys a new ERC721 NFT Clone for a specific group.
     * @param groupKey The unique identifier for the group.
     * @param name The desired name for the new ERC721 collection.
     * @param symbol The desired symbol for the new ERC721 collection.
     */
    function deployGroupNft(bytes32 groupKey, string calldata name, string calldata symbol) external returns (address);
    
    /**
     * @notice Initializes the first Merkle root for a specific group.
     * @param initialRoot The initial Merkle root to set.
     * @param groupKey The unique identifier for the group.
     */
    function initRoot(bytes32 initialRoot, bytes32 groupKey) external;

    /**
     * @notice Updates the Merkle root for an existing group.
     * @param newRoot The new Merkle root to set.
     * @param groupKey The unique identifier for the group.
     */
    function setRoot(bytes32 newRoot, bytes32 groupKey) external;
    
    /** 
     * @notice Adds a new member to a specific group by minting an ERC721 token.
     * @param memberAddress The address of the member to add.
     * @param groupKey The identifier of the group.
     */
    function mintNftToMember(address memberAddress, bytes32 groupKey) external;
    
    /**
     * @notice Adds multiple members to a specific group in a single transaction.
     * @param memberAddresses An array of addresses of members to add.
     * @param groupKey The identifier of the group.
     */
    function mintNftToMembers(address[] calldata memberAddresses, bytes32 groupKey) external;
    
    /**
     * @notice Removes a member from a specific group by burning their membership token.
     * @param memberAddress The address of the member to remove.
     * @param groupKey The identifier of the group.
     */
    function burnMemberNft(address memberAddress, bytes32 groupKey) external;
    
   
// ====================================================================================================================
//                                       EXTERNAL VIEW FUNCTIONS
// ====================================================================================================================
    /**
     * @notice Retrieves the current Merkle root for a specific group.
     * @param groupKey The unique identifier for the group.
     * @return The current Merkle root for the specified group. Returns bytes32(0) if no root has been set.
     */
    function getRoot(bytes32 groupKey) external view returns (bytes32);
    
    /**
     * @notice Retrieves the address of the ERC721 NFT contract for a specific group.
     * @param groupKey The unique identifier for the group.
     * @return address of the ERC721 NFT contract associated with the specified group key.
     */
    function getGroupNftAddress(bytes32 groupKey) external view returns (address);

    /**
     * @notice Retrieves the address of the NFT implementation contract.
     * @return address of the NFT implementation contract.
     */
    function getNftImplementation() external view returns (address);

    /**
     * @notice Retrieves the maximum number of members that can be added in a single batch transaction.
     * @return The maximum batch size for member additions.
     */
    function getMaxMembersBatch() external view returns (uint256);
    
// ====================================================================================================================
//                                       EXTERNAL HELPER FUNCTIONS
// ====================================================================================================================

    /** 
     * @notice Revokes the MINTER_ROLE from the specified NFT clone.
     * @param nftClone The address of the NFT contract clone from which to revoke the role.
     */
    function revokeMinterRole(address nftClone) external;

    /** 
     * @notice Revokes the BURNER_ROLE from the specified NFT clone.
     * @param nftClone The address of the NFT contract clone from which to revoke the role.
     */
    function revokeBurnerRole(address nftClone) external;

    /**
     * @notice Grants the MINTER_ROLE to the specified address in the NFT clone.
     * @param nftClone The address of the NFT contract clone to which to grant the role.
     * @param grantTo The address to which to grant the role.
     */
    function grantMinterRole(address nftClone, address grantTo) external;

    /**
     * @notice Grants the BURNER_ROLE to the specified address in the NFT clone.
     * @param nftClone The address of the NFT contract clone to which to grant the role.
     * @param grantTo The address to which to grant the role.
     */
    function grantBurnerRole(address nftClone, address grantTo) external;
    
}