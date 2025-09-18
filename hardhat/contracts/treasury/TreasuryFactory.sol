// SPDX-License-Identifier: MIT
pragma solidity >=0.8.28 <0.9.0;

// OZ Imports:
import { BeaconProxy } from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ERC165 } from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

// Interfaces:
import { ITreasuryManager } from "../interfaces/treasury/ITreasuryManager.sol";
import { ITreasuryFactory } from "../interfaces/treasury/ITreasuryFactory.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IMembershipManager } from "../interfaces/managers/IMembershipManager.sol";

/**
 * @title TreasuryFactory
 * @notice This contract is responsible for deploying and managing treasury instances for different DAO groups.
 */
contract TreasuryFactory is Ownable, ERC165, ITreasuryFactory {
// ====================================================================================================================
//                                                  CUSTOM ERRORS
// ====================================================================================================================

    /// @dev Thrown if the provided key (contextKey) is zero.
    error KeyCannotBeZero();

    /// @dev Thrown if the provided address is zero.
    error AddressCannotBeZero();

    /// @dev Thrown if a treasury instance for the DAO has already been deployed.
    error GroupTreasuryAlreadyExists();

    /// @dev Thrown if a DAO NFT has not yet been deployed. 
    /// The DAO has to first be initiated via NFT deployment.
    error GroupNftNotSet();

    /// @notice Thrown if ETH is sent to this contract.
    error ETHTransfersNotAccepted();

    /// @notice Thrown when a function not defined in this contract is called.
    error UnknownFunctionCall();

// ====================================================================================================================
//                                                  EVENTS
// ====================================================================================================================

    /// Declared in ITreasuryFactory.

// ====================================================================================================================
//                                          STATE VARIABLES
// ====================================================================================================================

    /// @dev Mapping storing the DAO treasury addresses per groupKey (DAO identifier)
    mapping(bytes32 => address) public groupTreasuryAddresses;

    /// @dev Address of the BeaconManager contract pointing to the current implementation.
    address public immutable beaconManager;

    /// @dev Address of the GovernanceManager.
    address public immutable governanceManager;

    /// @dev Address of the MembershipManager.
    IMembershipManager public immutable membershipManager;

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
     * @param _beaconManager The address of the beacon contract.
     * @param _governanceManager The address of the governance manager contract.
     * @param _membershipManager The address of the membership manager contract.
     */
    constructor(
        address _beaconManager,
        address _governanceManager,
        address _membershipManager
    ) 
        Ownable(_governanceManager)
        nonZeroAddress(_beaconManager)
        nonZeroAddress(_governanceManager)
        nonZeroAddress(_membershipManager)
    {
        beaconManager = _beaconManager;
        governanceManager = _governanceManager;
        membershipManager = IMembershipManager(_membershipManager);
        emit TreasuryFactoryDeployed(beaconManager, governanceManager);
    }

// ====================================================================================================================
//                                       EXTERNAL STATE-CHANGING FUNCTIONS
// ====================================================================================================================

    /**
     * @notice Deploys new treasury instances for the DAO groups.
     * @dev only callable by the owner (GovernanceManager)
     * Audit note: With a reentrancy guard in place (mapping lock), the risk of a re-entrancy attack is mitigated.
     * @param groupKey The unique group (DAO) identifier.
     * @param treasuryMultiSig The address of the treasury multi-signature wallet.
     * @param treasuryRecovery The address of the treasury recovery wallet.
     */
    function deployTreasury(
        bytes32 groupKey, 
        address treasuryMultiSig,
        address treasuryRecovery
    ) 
        external 
        onlyOwner 
        nonZeroKey(groupKey) 
        nonZeroAddress(treasuryMultiSig)
        nonZeroAddress(treasuryRecovery)
    {

        if (groupTreasuryAddresses[groupKey] != address(0)) revert GroupTreasuryAlreadyExists();
        if (membershipManager.groupNftAddresses(groupKey) == address(0)) revert GroupNftNotSet();

        // Lock the groupTreasuryAddresses mapping for the groupKey to mitigate re-entrancy risk
        groupTreasuryAddresses[groupKey] = address(1);

        bytes memory initData = abi.encodeWithSelector(
            ITreasuryManager.initialize.selector,
            treasuryMultiSig, // initialOwner with DEFAULT_ADMIN_ROLE
            governanceManager, // GOVERNANCE_MANAGER_ROLE
            treasuryRecovery // recovery multi sig for EMERGENCY_RECOVERY_ROLE
        );

        // creates non-deterministic addresses (different address for every new proxy)
        BeaconProxy treasuryProxy = new BeaconProxy(
            beaconManager, 
            initData
        );

        // Update the mock treasury address to the real one
        address treasury = address(treasuryProxy);
        groupTreasuryAddresses[groupKey] = treasury;
        emit TreasuryDeployed(groupKey, treasury);
    }

// ====================================================================================================================
//                                       RECEIVE & FALLBACK FUNCTIONS
// ====================================================================================================================

    /**
    * @notice Prevents ETH from being sent to this contract
    */
    receive() external payable {
        revert ETHTransfersNotAccepted();
    }

    /**
    * @notice Prevents ETH from being sent with calldata to this contract
    * @dev Handles unknown function calls and ETH transfers with data
    */
    fallback() external payable {
        if (msg.value > 0) {
            revert ETHTransfersNotAccepted();
        } else {
            revert UnknownFunctionCall();
        }
    }

// ====================================================================================================================
//                                       EXTERNAL VIEW FUNCTIONS
// ====================================================================================================================
    
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


