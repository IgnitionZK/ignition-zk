// SPDX-License-Identifier: MIT
pragma solidity >=0.8.28 <0.9.0;

// OZ imports:
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { ERC165Upgradeable } from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

// Interfaces:
import { IMembershipManager } from "../interfaces/managers/IMembershipManager.sol";
import { IProposalManager } from "../interfaces/managers/IProposalManager.sol";
import { IVoteManager } from "../interfaces/managers/IVoteManager.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { IVersioned } from "../interfaces/IVersioned.sol";
import { ITreasuryFactory } from "../interfaces/treasury/ITreasuryFactory.sol";
import { IGrantModule } from "../interfaces/fundingModules/IGrantModule.sol";
import { ITreasuryManager } from "../interfaces/treasury/ITreasuryManager.sol";
import { IUpgradeable } from "../interfaces/IUpgradeable.sol";

// Libraries:
import { VoteTypes } from "../libraries/VoteTypes.sol";
import { FundingTypes } from "../libraries/FundingTypes.sol";
import { TreasuryTypes } from "../libraries/TreasuryTypes.sol";

/**
 * @title GovernanceManager
 * @notice This contract manages governance-related functions and access control for the IgnitionZK protocol.
 * It allows for delegation of membership management and proposal verification tasks to designated relayers.
 * The contract is upgradeable and follows the UUPS pattern, ensuring that governance can adapt to future requirements.
 */
contract GovernanceManager is Initializable, UUPSUpgradeable, OwnableUpgradeable, ERC165Upgradeable, IVersioned {
// ====================================================================================================================
//                                                  CUSTOM ERRORS
// ====================================================================================================================

    // ====================================================================================================
    // AUTHORIZATION ERRORS
    // ====================================================================================================

    /// @notice Thrown if a function is called by an address that is not the designated relayer.
    error OnlyRelayerAllowed();
    
    // ====================================================================================================
    // TREASURY RELATED ERRORS
    // ====================================================================================================

    /// @notice Thrown if the treasury factory address has not been set. 
    error TreasuryFactoryAddressNotSet();

    /// @notice Thrown if the proposal did not pass.
    error ProposalNotPassed();

    /// @notice Thrown if the treasury address for a specific group is not found.
    error TreasuryAddressNotFound();

    /// @notice Thrown if the proposal submission nullifier is invalid.
    error InvalidNullifier();

    /// @notice Thrown if the funding module address is not found.
    error FundingModuleNotFound();

    /// @notice Thrown if the funding type is unknown.
    error UnknownFundingType();

    /// @notice Thrown if the provided module does not match the active module for the specified funding type.
    error ModuleMismatch();

    // ====================================================================================================
    // GENERAL ERRORS
    // ====================================================================================================

    /// @notice Thrown if the new relayer address is the same as the current one.
    error NewRelayerMustBeDifferent();

    /// @notice Thrown if an address is zero.
    error AddressCannotBeZero();

    /// @notice Thrown if an address is not a contract.
    error AddressIsNotAContract();

    /// @notice Thrown if the new address is the same as the current one.
    error NewAddressMustBeDifferent();

    /// @notice Thrown if the expected interface ID is not supported by the target contract address.
    error InterfaceIdNotSupported();

    /// @notice Thrown if the function does not exist or is not implemented in the contract.
    error UnknownFunctionCall(); 

    /// @notice Thrown if ETH is sent to this contract.
    error ETHTransfersNotAccepted();

// ====================================================================================================================
//                                                  EVENTS
// ====================================================================================================================

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
     * @notice Emitted when the proposal manager address is updated.
     * @param newProposalManager The new address of the proposal manager.
     */
    event ProposalManagerSet(address indexed newProposalManager);

    /**
     * @notice Emitted when the vote manager address is updated.
     * @param newVoteManager The new address of the vote manager.
     */
    event VoteManagerSet(address indexed newVoteManager);

    /**
     * @notice Emitted when the treasury factory address is updated.
     * @param treasuryFactory The new address of the treasuryFactory.
     */
    event TreasuryFactorySet(address indexed treasuryFactory);
    
    /**
     * @notice Emitted when a new funding module is added to the active module registry.
     * @param fundingType The unique identifier of the funding type.
     * @param module The address of the funding module that was added.
     */
    event FundingModuleAdded(bytes32 indexed fundingType, address indexed module);

     /**
     * @notice Emitted when the funding module address for a given funding type is updated.
     * @param fundingType The unique identifier of the funding type.
     * @param oldModule The address of the funding module that was updated.
     * @param newModule The address of the funding module that was added.
     */
    event FundingModuleUpdated(bytes32 indexed fundingType, address indexed oldModule, address indexed newModule);

    /**
     * @notice Emitted when a funding module is removed from the active module registry.
     * @param module The address of the funding module that was removed.
     */
    event FundingModuleRemoved(bytes32 indexed fundingType, address indexed module);

    /**
     * @notice Emitted when grant distribution is delegated to the grant module.
     * @param groupTreasury The address of the group treasury.
     * @param contextKey The unique identifier for the context of the grant.
     * @param to The address to which the grant is delegated.
     * @param amount The amount of the grant.
     */
    event GrantDistributionDelegated(address indexed groupTreasury, bytes32 indexed contextKey, address indexed to, uint256 amount);

// ====================================================================================================================
//                                              STATE VARIABLES
// NOTE: Once the contract is deployed do not change the order of the variables. If this contract is updated append new variables to the end of this list. 
// ====================================================================================================================
    /// @dev Mapping of active funding modules.
    /// @dev The key is the unique identifier for the funding type, and the value is the address of the active funding module for that type.
    /// @dev This mapping is used to check which module is currently active for a specific funding type.
    mapping(bytes32 => address) public activeModuleRegistry;
    
    /// @dev The address of the designated relayer, authorized to update roots and verify proofs.
    address public relayer;
    
    /// @dev The interface of the membership manager contract
    IMembershipManager public membershipManager;

    /// @dev The interface of the proposal manager contract
    IProposalManager public proposalManager;

    /// @dev The interface of the vote manager contract
    IVoteManager public voteManager;

    /// @dev The interface of the treasury factory contract
    ITreasuryFactory public treasuryFactory;

// ====================================================================================================================
//                                                  MODIFIERS
// ====================================================================================================================

    /**
     * @dev Restricts function execution to the designated relayer address.
     */
    modifier onlyRelayer() {
        if (msg.sender != relayer) revert OnlyRelayerAllowed();
        _;
    }

    /**
     * @dev Ensures that the provided address is not the zero address.
     * @param addr The address to check.
     */
    modifier nonZeroAddress(address addr) {
        if (addr == address(0)) revert AddressCannotBeZero();
        _;
    }

// ====================================================================================================================
//                                 CONSTRUCTOR / INITIALIZER / UPGRADE AUTHORIZATION
// ====================================================================================================================
    
    /**
     * @dev Authorizes upgrades for the UUPS proxy. Only callable by the contract's owner.
     * @param newImplementation The address of the new implementation contract.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); 
    }
    
    /**
     * @dev Initializes the contract with the initial owner, relayer, and manager addresses.
     * @param _initialOwner The address of the initial owner of the contract.
     * @param _relayer The address of the relayer, which must not be zero.
     * @param _membershipManager The address of the membership manager, which must not be zero.
     * @param _proposalManager The address of the proposal manager, which must not be zero.
     * @param _voteManager The address of the vote manager, which must not be zero.
     * @custom:error AddressCannotBeZero If the provided relayer address is zero.
     */
    function initialize(
        address _initialOwner,
        address _relayer,
        address _membershipManager,
        address _proposalManager,
        address _voteManager
    ) 
        external 
        initializer 
    {   
        if (_initialOwner == address(0)) revert AddressCannotBeZero();
        if (_relayer == address(0)) revert AddressCannotBeZero();
        if (_membershipManager == address(0)) revert AddressCannotBeZero();
        if (_proposalManager == address(0)) revert AddressCannotBeZero();
        if (_voteManager == address(0)) revert AddressCannotBeZero();

        __Ownable_init(_initialOwner);
        __UUPSUpgradeable_init();
        __ERC165_init();

        relayer = _relayer;
        membershipManager = IMembershipManager(_membershipManager);
        proposalManager = IProposalManager(_proposalManager);
        voteManager = IVoteManager(_voteManager);

        emit RelayerSet(_relayer);
        emit MembershipManagerSet(_membershipManager);
        emit ProposalManagerSet(_proposalManager);
        emit VoteManagerSet(_voteManager);
    }

// ====================================================================================================================
//                           EXTERNAL STATE-CHANGING FUNCTIONS (NOT FORWARDED)
// ====================================================================================================================

    /**
     * @notice Sets a new relayer address.
     * @dev Only the owner can call this function.
     * @param _relayer The new address for the relayer.
     * @custom:error AddressCannotBeZero If the provided relayer address is zero.
     * @custom:error NewRelayerMustBeDifferent If the new relayer address is the same as the current one.
     */
    function setRelayer(address _relayer) external onlyOwner nonZeroAddress(_relayer) {
        if (_relayer == relayer) revert NewRelayerMustBeDifferent();
        relayer = _relayer;
        emit RelayerSet(_relayer);
    }

    /**
     * @notice Sets a new treasury factory address.
     * @dev Only the owner can call this function.
     * @param _treasuryFactory The new address for the treasury factory.
     * @custom:error AddressCannotBeZero If the provided treasury factory address is zero.
     * @custom:error InterfaceIdNotSupported If the provided address does not support the ITreasuryFactory interface.
     */
    function setTreasuryFactory(address _treasuryFactory) external onlyOwner nonZeroAddress(_treasuryFactory) {
        if(_treasuryFactory.code.length == 0) revert AddressIsNotAContract();
        bytes4 interfaceId = type(ITreasuryFactory).interfaceId;
        if(!_supportsInterface(_treasuryFactory, interfaceId)) revert InterfaceIdNotSupported();
        
        treasuryFactory = ITreasuryFactory(_treasuryFactory);
        emit TreasuryFactorySet(_treasuryFactory);
    }

    // ====================================================================================================
    // REGISTERING FUNDING MODULES
    // ====================================================================================================

    /**
     * @notice Adds a funding module to the active module registry.
     * @dev This function can only be called by the owner.
     * @param _module The address of the funding module to be added.
     * @param _fundingType The unique identifier for the funding module type.
     * @custom:error UnknownFundingType Thrown if the provided funding type is not defined in the FundingTypes library.
     * @custom:error AddressIsNotAContract Thrown if the provided address is not a contract.
     */
    function addFundingModule(
        address _module, 
        bytes32 _fundingType
    ) 
        external 
        onlyOwner
    {   
        if (!FundingTypes.isKnownType(_fundingType)) revert UnknownFundingType();
        if (_module == address(0)) revert AddressCannotBeZero();
        if (_module.code.length == 0) revert AddressIsNotAContract();

        address currentModule = activeModuleRegistry[_fundingType];
        activeModuleRegistry[_fundingType] = _module;

        if (currentModule != _module) {
            emit FundingModuleUpdated(_fundingType, currentModule, _module);
        } else {
            emit FundingModuleAdded(_fundingType, _module);
        }
    }

    /**
     * @notice Removes a funding module from the active module registry.
     * @param _module The address of the owner.
     * @param _fundingType The unique identifier for the funding module type.
     * @custom:error ModuleMismatch Thrown if the provided module does not match the active module for the specified funding type.
     */
    function removeFundingModule(
        address _module, 
        bytes32 _fundingType
    ) 
        external 
        onlyOwner
    {   
        if (activeModuleRegistry[_fundingType] != _module) revert ModuleMismatch();
        delete activeModuleRegistry[_fundingType];
        emit FundingModuleRemoved(_fundingType, _module);
    }

// ====================================================================================================================
// ====================================================================================================================
//                           EXTERNAL STATE-CHANGING FUNCTIONS (FORWARDED VIA GOVERNANCE)
// ====================================================================================================================
// ====================================================================================================================

    // ================================================================================================================
    // 1. MembershipManager Delegation Functions
    // ================================================================================================================

    /**
     * @notice Delegates the upgrade call to the membership manager.
     * @dev Only callable by the owner.
     * @param newImplementation The address of the new implementation contract.
     */
    function delegateUpgradeMembershipManager(address newImplementation) external onlyOwner {
        IUpgradeable(address(membershipManager)).upgradeToAndCall(newImplementation, "");
    }

    /**
     * @notice Delegates the setMembershipVerifier call to the membership manager.
     * @dev Only the relayer can call this function.
     * @param membershipVerifier The address of the new membership verifier contract.
     */
    function delegateSetMembershipVerifier(address membershipVerifier) external onlyOwner {
        membershipManager.setMembershipVerifier(membershipVerifier);
    }

    /**
     * @notice Delegates the verifyMembership call to the membership manager.
     * @dev Only the relayer can call this function.
     * @param proof The zk-SNARK proof to verify.
     * @param publicSignals The public signals associated with the proof.
     * @param groupKey The unique identifier for the group.
     */
    function delegateVerifyMembership(
        uint256[24] calldata proof, 
        uint256[2] calldata publicSignals,
        bytes32 groupKey
    ) external onlyRelayer {
        membershipManager.verifyMembership(proof, publicSignals, groupKey);
    }

    /**
     * @notice Delegates the setRoot call to the membership manager.
     * @dev Only callable by the relayer.
     * @param newRoot The new Merkle root to set.
     * @param groupKey The unique identifier for the group.
     */
    function delegateSetRoot(bytes32 newRoot, bytes32 groupKey) external onlyRelayer {
        membershipManager.setRoot(newRoot, groupKey);
    }

    /**
     * @notice Delegates the deployGroupNft call to the membership manager.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     * @param name The name of the new NFT collection.
     * @param symbol The symbol of the new NFT collection.
     * @return address of the newly deployed NFT contract.
     */
    function delegateDeployGroupNft(
        bytes32 groupKey,
        string calldata name,
        string calldata symbol
    ) external onlyRelayer returns (address) {
        return membershipManager.deployGroupNft(groupKey, name, symbol);
    }

    /**
     * @notice Delegates the mintNftToMember call to the membership manager.
     * @dev Only callable by the relayer.
     * @param memberAddress The address of the member to add.
     * @param groupKey The unique identifier for the group.
     */
    function delegateMintNftToMember(address memberAddress, bytes32 groupKey) external onlyRelayer {
        membershipManager.mintNftToMember(memberAddress, groupKey);
    }

    /**
     * @notice Delegates the mintNftToMembers call to the membership manager.
     * @dev Only callable by the relayer.
     * @param memberAddresses The addresses of the members to add.
     * @param groupKey The unique identifier for the group.
     */
    function delegateMintNftToMembers(address[] calldata memberAddresses, bytes32 groupKey) external onlyRelayer {
        membershipManager.mintNftToMembers(memberAddresses, groupKey);
    }

    /**
     * @notice Delegates the burnMemberNft call to the membership manager.
     * @dev Only callable by the relayer.
     * @param memberAddress The address of the member to remove.
     * @param groupKey The unique identifier for the group.
     */
    function delegateBurnMemberNft(address memberAddress, bytes32 groupKey) external onlyRelayer {
        membershipManager.burnMemberNft(memberAddress, groupKey);
    }

    // ================================================================================================================
    // 2. ProposalManager Delegation Functions
    // ================================================================================================================

    /**
     * @notice Delegates the upgrade call to the proposal manager.
     * @dev Only callable by the owner.
     * @param newImplementation The address of the new implementation contract.
     */
    function delegateUpgradeProposalManager(address newImplementation) external onlyOwner {
        IUpgradeable(address(proposalManager)).upgradeToAndCall(newImplementation, "");
    }

    /**
     * @notice Delegates the setProposalSubmissionVerifier call to the proposal manager.
     * @dev Only callable by the owner.
     * @param submissionVerifier The address of the new proposal submission verifier contract.
     */
    function delegateSetProposalSubmissionVerifier(address submissionVerifier) external onlyOwner {
        proposalManager.setProposalSubmissionVerifier(submissionVerifier);
    }

    /**
     * @notice Delegates the setProposalClaimVerifier call to the proposal manager.
     * @dev Only callable by the owner.
     * @param claimVerifier The address of the new proposal claim verifier contract.
     */
    function delegateSetProposalClaimVerifier(address claimVerifier) external onlyOwner {
        proposalManager.setProposalClaimVerifier(claimVerifier);
    }

    /**
     * @notice Delegates the verifyProposal call to the proposal manager.
     * @dev Only callable by the relayer.
     * @param proof The zk-SNARK proof to verify.
     * @param pubSignals The public signals associated with the proof.
     * @param groupKey The unique identifier for the group.
     * @param contextKey The pre-computed context hash (group, epoch).
     */
    function delegateVerifyProposal(
        uint256[24] calldata proof,
        uint256[5] calldata pubSignals,
        bytes32 groupKey,
        bytes32 contextKey
    ) external onlyRelayer {
        proposalManager.verifyProposal(proof, pubSignals, contextKey, groupKey);
    }

    /**
     * @notice Delegates the verifyProposalClaim call to the proposal manager.
     * @dev Only callable by the relayer.
     * @param proof The zk-SNARK proof to verify.
     * @param publicSignals The public signals associated with the proof.
     * @param contextKey The pre-computed context hash (group, epoch).
     */
    function delegateVerifyProposalClaim(
        uint256[24] calldata proof,
        uint256[3] calldata publicSignals,
        bytes32 contextKey
    ) external onlyRelayer {
        proposalManager.verifyProposalClaim(proof, publicSignals, contextKey);
    }

    // ================================================================================================================
    // 3. VoteManager Delegation Functions
    // ================================================================================================================

    /**
     * @notice Delegates the upgrade call to the vote manager.
     * @dev Only callable by the owner.
     * @param newImplementation The address of the new implementation contract.
     */
    function delegateUpgradeVoteManager(address newImplementation) external onlyOwner {
        IUpgradeable(address(voteManager)).upgradeToAndCall(newImplementation, "");
    }
    
    /**
     * @notice Delegates the setVoteVerifier call to the vote manager.
     * @dev Only callable by the owner.
     * @param voteVerifier The address of the new vote verifier contract.
     */
    function delegateSetVoteVerifier(address voteVerifier) external onlyOwner {
        voteManager.setVoteVerifier(voteVerifier);
    }

    /**
     * @notice Delegates the verifyVote call to the vote manager.
     * @dev Only callable by the relayer.
     * @param proof The zk-SNARK proof to verify.
     * @param publicSignals The public signals associated with the proof.
     * @param groupKey The unique identifier for the voting group.
     * @param contextKey The pre-computed context hash (group, epoch, proposal).
     */
    function delegateVerifyVote(
        uint256[24] calldata proof,
        uint256[5] calldata publicSignals,
        bytes32 groupKey,
        bytes32 contextKey
    ) external onlyRelayer {
        voteManager.verifyVote(proof, publicSignals, contextKey, groupKey);
    }

    /**
     * @notice Delegates the setMemberCount call to the vote manager.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the voting group.
     * @param memberCount The number of members in the voting group.
     */
    function delegateSetMemberCount(bytes32 groupKey, uint256 memberCount) external onlyRelayer {
        voteManager.setMemberCount(groupKey, memberCount);
    }

    /**
     * @notice Delegates the setQuorumParams call to the vote manager.
     * @dev Only callable by the owner.
     * @param minQuorumPercent The minimum quorum percentage value that can be used.
     * @param maxQuorumPercent The maximum quorum percentage value that can be used.
     * @param maxGroupSizeForMinQuorum The maximum group size for which the minimum quorum percentage applies.
     * @param minGroupSizeForMaxQuorum The minimum group size for which the maximum quorum percentage applies.
     */
    function delegateSetQuorumParams(
        uint256 minQuorumPercent,
        uint256 maxQuorumPercent,
        uint256 maxGroupSizeForMinQuorum,
        uint256 minGroupSizeForMaxQuorum
    ) external onlyOwner {
        voteManager.setQuorumParams(minQuorumPercent, maxQuorumPercent, maxGroupSizeForMinQuorum, minGroupSizeForMaxQuorum);
    }

    // ================================================================================================================
    // 4. TreasuryFactory Delegation Functions
    // ================================================================================================================

    /**
     * @notice Delegates the deployment of a treasury to the treasury factory.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the voting group.
     */
    function delegateDeployTreasury(bytes32 groupKey, address treasuryMultiSig, address treasuryRecovery) external onlyRelayer {
        if (address(treasuryFactory) == address(0)) revert TreasuryFactoryAddressNotSet();
        treasuryFactory.deployTreasury(groupKey, treasuryMultiSig, treasuryRecovery);
    }

    // ================================================================================================================
    // 5. Funding Modules Delegation Functions
    // ================================================================================================================
    
    /**
     * @notice Delegates the upgrade call to the vote manager.
     * @dev Only callable by the owner.
     * @param newImplementation The address of the new implementation contract.
     */
    function delegateUpgradeGrantModule(address newImplementation) external onlyOwner {
        address grantModule = activeModuleRegistry[FundingTypes.GRANT_TYPE];
        IUpgradeable(address(grantModule)).upgradeToAndCall(newImplementation, "");
    }

    /**
     * @notice Executes a proposal by distributing funds from the group treasury.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the voting group.
     * @param contextKey The pre-computed context hash (group, epoch, proposal).
     * @param to The address to send the funds to.
     * @param amount The amount of funds to distribute.
     * @param fundingType The type of funding to use.
     * @custom:error FundingModuleNotFound If the funding module is not found.
     * @custom:error UnknownFundingType If the funding type does not exist in the FundingTypes library.
     * @custom:error ProposalNotPassed If the proposal has not passed.
     * @custom:error TreasuryAddressNotFound If the treasury address is not found.
     * @custom:error TreasuryFactoryAddressNotSet If the treasury factory address is not set.
     * @custom:error InvalidNullifier If the proposal submission nullifier is invalid.
     */
    function delegateDistributeFunding(
        bytes32 groupKey, 
        bytes32 contextKey, 
        address to, 
        uint256 amount, 
        bytes32 fundingType,
        bytes32 expectedProposalNullifier
    ) external onlyRelayer {
        // Check that the treasury instance has been deployed
        address groupTreasury = _getGroupTreasuryAddress(groupKey);
        if (groupTreasury == address(0)) revert TreasuryAddressNotFound();

        // Check that the proposal with the given contextKey exists and that its passed status is set to true
        VoteTypes.ProposalResult memory proposalResult = _getProposalResult(contextKey);
        if (!proposalResult.passed) revert ProposalNotPassed();

        // checks that the expected proposal submission nullifier matches the stored nullifier
        if (proposalResult.submissionNullifier != expectedProposalNullifier) revert InvalidNullifier();

        // Get the active address of the funding module
        if (!FundingTypes.isKnownType(fundingType)) revert UnknownFundingType();
        address module = activeModuleRegistry[fundingType];
        if (module == address(0)) revert FundingModuleNotFound();

        // If all checks pass, trigger the corresponding funding module
        if (fundingType == FundingTypes.GRANT_TYPE) {
            emit GrantDistributionDelegated(groupTreasury, contextKey, to, amount);
            IGrantModule(module).distributeGrant(groupTreasury, contextKey, to, amount);
        }
    }
    

// ====================================================================================================================
// ====================================================================================================================
//                           EXTERNAL VIEW FUNCTIONS (FORWARDED VIA GOVERNANCE)
// ====================================================================================================================
// ====================================================================================================================

    // ================================================================================================================
    // 1. TreasuryFactory Delegation Functions
    // ================================================================================================================

    function delegateGetTreasuryAddress(bytes32 groupKey) external view returns (address) {
        if (address(treasuryFactory) == address(0)) revert TreasuryFactoryAddressNotSet();
        return treasuryFactory.groupTreasuryAddresses(groupKey);
    }

    // ================================================================================================================
    // 2. TreasuryManager Delegation Functions
    // ================================================================================================================

    /**
     * @notice Delegates the getBalance call to the group treasury instance.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     */
    function delegateGetBalance(bytes32 groupKey) external view returns (uint256) {
        address groupTreasury = _getGroupTreasuryAddress(groupKey);
        return ITreasuryManager(groupTreasury).getBalance();
    }

    /**
     * @notice Delegates the isPendingApproval call to the group treasury instance.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     * @param contextKey The unique identifier for the context.
     */
    function delegateIsPendingApproval(bytes32 groupKey, bytes32 contextKey) external view returns (bool) {
        address groupTreasury = _getGroupTreasuryAddress(groupKey);
        return ITreasuryManager(groupTreasury).isPendingApproval(contextKey);
    }

    /**
     * @notice Delegates the isPendingExecution call to the group treasury instance.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     * @param contextKey The unique identifier for the context.
     */
    function delegateIsPendingExecution(bytes32 groupKey, bytes32 contextKey) external view returns (bool) {
        address groupTreasury = _getGroupTreasuryAddress(groupKey);
        return ITreasuryManager(groupTreasury).isPendingExecution(contextKey);
    }

    /**
     * @notice Delegates the isExecuted call to the group treasury instance.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     * @param contextKey The unique identifier for the context.
     */
    function delegateIsExecuted(bytes32 groupKey, bytes32 contextKey) external view returns (bool) {
        address groupTreasury = _getGroupTreasuryAddress(groupKey);
        return ITreasuryManager(groupTreasury).isExecuted(contextKey);
    }

    /**
     * @notice Delegates the getFundingRequest call to the group treasury instance.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     * @param contextKey The unique identifier for the context.
     */
    function delegateGetFundingRequest(bytes32 groupKey, bytes32 contextKey) external view returns (TreasuryTypes.FundingRequest memory) {
        address groupTreasury = _getGroupTreasuryAddress(groupKey);
        return ITreasuryManager(groupTreasury).getFundingRequest(contextKey);
    }

// ====================================================================================================================
//                                       RECEIVE & FALLBACK FUNCTION
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
//                                   EXTERNAL VIEW FUNCTIONS (NOT FORWARDED)
// ====================================================================================================================

    /**
     * @dev Returns the version of the contract.
     * @return string The version of the contract.
     */
    function getContractVersion() external view returns (string memory) {
        return "GovernanceManager v1.0.0"; 
    }

// ====================================================================================================================
//                                       PRIVATE HELPER FUNCTIONS
// ====================================================================================================================

    /**
     * @dev Gets the address of the group treasury for a specific group.
     * @param groupKey The unique identifier for the group.
     * @return The group treasury address.
     */
    function _getGroupTreasuryAddress(bytes32 groupKey) private view returns (address) {
        if (address(treasuryFactory) == address(0)) revert TreasuryFactoryAddressNotSet();
        return treasuryFactory.groupTreasuryAddresses(groupKey);
    }

    /**
     * @dev Gets the result of a specific proposal.
     * @param contextKey The unique identifier for the proposal context.
     * @return The proposal result.
     */
    function _getProposalResult(bytes32 contextKey) private view returns (VoteTypes.ProposalResult memory) {
        return voteManager.getProposalResult(contextKey);
    }

    /**
     * @dev Checks if a contract supports a specific interface.
     * @param target The address of the contract to check.
     * @param interfaceId The interface ID to check for support.
     * @return bool indicating whether the contract supports the specified interface.
     */
    function _supportsInterface(address target, bytes4 interfaceId) private view returns (bool) {
        try IERC165(target).supportsInterface(interfaceId) returns (bool supported) {
            return supported;
        } catch {
            return false;
        }
    }
    

}