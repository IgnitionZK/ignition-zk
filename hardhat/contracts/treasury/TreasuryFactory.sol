// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// OZ Imports:
import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol"; 

// Interfaces:
import {ITreasuryManager} from "../interfaces/treasury/ITreasuryManager.sol"; 
import {ITreasuryFactory} from "../interfaces/treasury/ITreasuryFactory.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";


contract TreasuryFactory is Ownable, ERC165, ITreasuryFactory {

    /// @dev Thrown if the provided key (contextKey) is zero.
    error KeyCannotBeZero();

    /// @dev Thrown if the provided address is zero.
    error AddressCannotBeZero();

    /// @dev Thrown if a treasury instance for the DAO has already been deployed.
    error GroupTreasuryAlreadyExists();

    /// @dev Thrown if a DAO NFT has not yet been deployed. 
    /// The DAO has to first be initiated via NFT deployment.
    error GroupNftNotSet();

    /**
     * @notice Emitted when a treasury instance has been deployed.
     * @param groupKey The unique identifier for the DAO group.
     * @param beaconProxy The address of the deployed treasury instance.
     */
    event TreasuryDeployed(bytes32 indexed groupKey, address beaconProxy);

    /// @dev Mapping storing the DAO treasury addresses per groupKey (DAO identifier)
    mapping(bytes32 => address) private groupTreasuryAddresses;

    /// @dev Address of the BeaconManager contract pointing to the current implementation.
    address private immutable beacon;

    /// @dev Address of the GovernanceManager.
    address private immutable governanceManager;

    /// @dev Address of the grantModule proxy (funding module).
    address private immutable grantModule;

// ====================================================================================================================
//                                                  MODIFIERS
// ====================================================================================================================

    /**
     * @dev Ensures that the provided address is not the zero address.
     * @param addr The address to check.
     */
    modifier nonZeroAddress(address addr) {
        if (addr == address(0)) revert AddressCannotBeZero();
        _;
    }

    /**
     * @dev Ensures that the provided group key is not zero.
     * @param key The unique identifier for the group.
     */
    modifier nonZeroKey(bytes32 key) {
        if (key == bytes32(0)) revert KeyCannotBeZero();
        _;
    }

// ====================================================================================================================
//                                 CONSTRUCTOR 
// ====================================================================================================================
    // transfer ownership to Governance Manager after GM is deployed!
    /**
     * @dev Constructor for the TreasuryFactory contract.
     * 
     */
    constructor(
        address _beacon,
        address _governanceManager,
        address _grantModule
    ) 
        Ownable(_governanceManager)
        nonZeroAddress(_beacon)
        nonZeroAddress(_governanceManager)
        nonZeroAddress(_grantModule) 
    {
        beacon = _beacon;
        governanceManager = _governanceManager;
        grantModule = _grantModule;
    }

// ====================================================================================================================
//                                       EXTERNAL STATE-CHANGING FUNCTIONS
// ====================================================================================================================

    /**
     * @notice Deploys new treasury instances for the DAO groups.
     * @dev only callable by the owner (GovernanceManager)
     * @param groupKey The unique group (DAO) identifier.
     * @param hasDeployedNft boolean indicating whether a group NFT exists.
     */
    function deployTreasury(
        bytes32 groupKey, 
        bool hasDeployedNft
    ) 
        external 
        onlyOwner 
        nonZeroKey(groupKey) 
    {

        if (groupTreasuryAddresses[groupKey] != address(0)) revert GroupTreasuryAlreadyExists();
        if (!hasDeployedNft) revert GroupNftNotSet();

        bytes memory initData = abi.encodeWithSelector(
            ITreasuryManager.initialize.selector,
            governanceManager, // initialOwner with DEFAULT_ADMIN_ROLE
            governanceManager, // GOVERNANCE_MANAGER_ROLE
            grantModule, // grant funding module with FUNDING_MODULE_ROLE
            beacon // beacon manager for EMERGENCY_RECOVERY_ROLE
        );

        // creates non-deterministic addresses (different address for every new proxy)
        BeaconProxy treasuryProxy = new BeaconProxy(
            beacon, 
            initData
        );

        address treasury = address(treasuryProxy);
        groupTreasuryAddresses[groupKey] = treasury;

        emit TreasuryDeployed(groupKey, treasury);
    }

// ====================================================================================================================
//                                       EXTERNAL VIEW FUNCTIONS
// ====================================================================================================================

    /**
     * @notice Returns the address of the treasury instance for a given group key.
     * @param groupKey The unique identifier for the DAO group.
     * @return The address of the treasury instance.
     */
    function getTreasuryAddress(bytes32 groupKey) external view onlyOwner returns (address) {
        return groupTreasuryAddresses[groupKey];
    }
    
    /**
     * @dev Checks if the contract supports a specific interface.
     * @param interfaceId The interface identifier to check.
     * @return bool True if the interface is supported, false otherwise.
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        virtual 
        override
        returns (bool) 
    {
        return interfaceId == type(ITreasuryFactory).interfaceId || super.supportsInterface(interfaceId);
    }

}


