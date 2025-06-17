// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// interfaces
import "../interfaces/IMembershipManager.sol";

// UUPS imports:
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract Governor is Initializable, UUPSUpgradeable, OwnableUpgradeable {

    // Authorization errors:
    error OnlyRelayerAllowed();

    // General errors
    error RelayerAddressCannotBeZero();
    error MembershipAddressCannotBeZero();
    error NewRelayerMustBeDifferent();

    
     /**
     * @notice Emitted when the relayer address is updated.
     * @param newRelayer The new address of the relayer.
     */
    event RelayerSet(address indexed newRelayer);

    /**
     * @notice Emitted when the membership manager address is updated.
     * @param newMembershipManager The new address of the membership manager.
     */
    event MembershipManagerSet(address indexed newMembershipManager);


    /**
     * @dev Restricts function execution to the designated relayer address.
     */
    modifier onlyRelayer() {
        if (msg.sender != relayer) revert OnlyRelayerAllowed();
        _;
    }

    /// @dev The address of the designated relayer, authorized to update roots and verify proofs.
    address private relayer;
    /// @dev The address of the membership manager
    address private membershipManager;

    function initialize(
        address _initialOwner,
        address _relayer,
        address _membershipManager
    ) external initializer {
        __Ownable_init(_initialOwner);
        __UUPSUpgradeable_init();

        if (_relayer == address(0)) revert RelayerAddressCannotBeZero();
        if (_membershipManager == address(0)) revert MembershipAddressCannotBeZero();


        relayer = _relayer;
        membershipManager = _membershipManager;
        emit RelayerSet(_relayer);
    }

    /**
     * @dev Authorizes upgrades for the UUPS proxy. Only callable by the contract's governor.
     * @param newImplementation The address of the new implementation contract.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @notice Sets a new relayer address.
     * @dev Only the governor can call this function.
     * @param _relayer The new address for the relayer.
     * @custom:error RelayerAddressCannotBeZero If the provided relayer address is zero.
     * @custom:error NewRelayerMustBeDifferent If the new relayer address is the same as the current one.
     */
    function setRelayer(address _relayer) external onlyOwner {
        if (_relayer == address(0)) revert RelayerAddressCannotBeZero();
        if (_relayer == relayer) revert NewRelayerMustBeDifferent();

        relayer = _relayer;
        emit RelayerSet(_relayer);
    }

    /**
     * @notice Delegates the setRoot call to the membership manager.
     * @dev Only callable by the relayer.
     * @param newRoot The new Merkle root to set.
     * @param groupKey The unique identifier for the group.
     */
    function delegateSetRoot(bytes32 newRoot, bytes32 groupKey) external onlyRelayer {
        IMembershipManager(membershipManager).setRoot(newRoot, groupKey);
    }

    /**
     * @notice Delegates the getRoot call to the membership manager.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     * @return The current Merkle root for the specified group.
     */
    function delegateGetRoot(bytes32 groupKey) external view onlyRelayer returns (bytes32) {
        return IMembershipManager(membershipManager).getRoot(groupKey);
    }

}