// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

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
     * @notice Emitted when the grant module address is updated.
     * @param grantModule The new address of the grant module.
     */
    event GrantModuleSet(address indexed grantModule);

    /**
     * @notice Emitted when the treasury factory address is updated.
     * @param treasuryFactory The new address of the treasuryFactory.
     */
    event TreasuryFactorySet(address indexed treasuryFactory);

// ====================================================================================================================
//                                              STATE VARIABLES
// NOTE: Once the contract is deployed do not change the order of the variables. If this contract is updated append new variables to the end of this list. 
// ====================================================================================================================

    /// @dev The address of the designated relayer, authorized to update roots and verify proofs.
    address private relayer;
    
    /// @dev The interface of the membership manager contract
    IMembershipManager private membershipManager;

    /// @dev The interface of the proposal manager contract
    IProposalManager private proposalManager;

    /// @dev The interface of the vote manager contract
    IVoteManager private voteManager;

    /// @dev The interface of the treasury factory contract
    ITreasuryFactory private treasuryFactory;

    /// @dev The interface of the grant module contract
    IGrantModule private grantModule;

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
     * @custom:error RelayerAddressCannotBeZero If the provided relayer address is zero.
     * @custom:error MembershipAddressCannotBeZero If the provided membership manager address is zero.
     * @custom:error ProposalAddressCannotBeZero If the provided proposal manager address is zero.
     * @custom:error VoteAddressCannotBeZero If the provided vote manager address is zero.
     */
    function initialize(
        address _initialOwner,
        address _relayer,
        address _membershipManager,
        address _proposalManager,
        address _voteManager,
        address _grantModule
    ) 
        external 
        initializer 
    {   
        if (_initialOwner == address(0)) revert AddressCannotBeZero();
        if (_relayer == address(0)) revert AddressCannotBeZero();
        if (_membershipManager == address(0)) revert AddressCannotBeZero();
        if (_proposalManager == address(0)) revert AddressCannotBeZero();
        if (_voteManager == address(0)) revert AddressCannotBeZero();
        if (_grantModule == address(0)) revert AddressCannotBeZero();

        __Ownable_init(_initialOwner);
        __UUPSUpgradeable_init();
        __ERC165_init();

        relayer = _relayer;
        membershipManager = IMembershipManager(_membershipManager);
        proposalManager = IProposalManager(_proposalManager);
        voteManager = IVoteManager(_voteManager);
        grantModule = IGrantModule(_grantModule);

        emit RelayerSet(_relayer);
        emit MembershipManagerSet(_membershipManager);
        emit ProposalManagerSet(_proposalManager);
        emit VoteManagerSet(_voteManager);
        emit GrantModuleSet(_grantModule);
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

    /**
     * @notice Sets a new membership manager address.
     * @dev Only the owner can call this function.
     * @param _membershipManager The new address for the membership manager.
     * @custom:error AddressCannotBeZero If the provided membership manager address is zero.
     * @custom:error AddressIsNotAContract If the provided address is not a contract.
     * @custom:error NewAddressMustBeDifferent If the new address is the same as the
     * current membership manager address.
     * @custom:error InterfaceIdNotSupported If the provided address does not support the IMembership
     * interface.
     */
    /*
    function setMembershipManager(address _membershipManager) external onlyOwner nonZeroAddress(_membershipManager) {
        if(_membershipManager.code.length == 0) revert AddressIsNotAContract();
        if(_membershipManager == address(membershipManager)) revert NewAddressMustBeDifferent();

        bytes4 interfaceId = type(IMembershipManager).interfaceId;
        if(!_supportsInterface(_membershipManager, interfaceId)) revert InterfaceIdNotSupported();

        membershipManager = IMembershipManager(_membershipManager);
        emit MembershipManagerSet(_membershipManager);
    }
    */

    /**
     * @notice Sets a new membership manager address.
     * @dev Only the owner can call this function.
     * @param _proposalManager The new address for the proposal manager.
     * @custom:error AddressCannotBeZero If the provided proposal manager address is zero.
     * @custom:error AddressIsNotAContract If the provided address is not a contract.
     * @custom:error NewAddressMustBeDifferent If the new address is the same as the
     * current proposal manager address.
     * @custom:error InterfaceIdNotSupported If the provided address does not support the IProposalManager
     * interface.
     */
    /*
    function setProposalManager(address _proposalManager) external onlyOwner nonZeroAddress(_proposalManager) {
        if(_proposalManager.code.length == 0) revert AddressIsNotAContract();
        if(_proposalManager == address(proposalManager)) revert NewAddressMustBeDifferent();

        bytes4 interfaceId = type(IProposalManager).interfaceId;
        if(!_supportsInterface(_proposalManager, interfaceId)) revert InterfaceIdNotSupported();

        proposalManager = IProposalManager(_proposalManager);
        emit ProposalManagerSet(_proposalManager);
    }
    */

// ====================================================================================================================
// ====================================================================================================================
//                           EXTERNAL STATE-CHANGING FUNCTIONS (FORWARDED VIA GOVERNANCE)
// ====================================================================================================================
// ====================================================================================================================

    // ================================================================================================================
    // 1. MembershipManager Delegation Functions
    // ================================================================================================================

    /**
     * @notice Delegates the setMembershipVerifier call to the membership manager.
     * @dev Only the relayer can call this function.
     * @param membershipVerifier The address of the new membership verifier contract.
     */
    function delegateSetMembershipVerifier(address membershipVerifier) external onlyRelayer {
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

    /**
     * @notice Delegates the revokeMinterRole call to the membership manager.
     * @dev Only callable by the relayer.
     * @param nftClone The address of the NFT clone contract.
     */
    function delegateRevokeMinterRole(address nftClone) external onlyRelayer {
        membershipManager.revokeMinterRole(nftClone);
    }

    /**
     * @notice Delegates the revokeBurnerRole call to the membership manager.
     * @dev Only callable by the relayer.
     * @param nftClone The address of the NFT clone contract.
     */
    function delegateRevokeBurnerRole(address nftClone) external onlyRelayer {
        membershipManager.revokeBurnerRole(nftClone);
    }

    /**
     * @notice Delegates the grantMinterRole call to the membership manager.
     * @dev Only callable by the relayer.
     * @param nftClone The address of the NFT clone contract.
     * @param grantTo The address to grant the minter role to.
     */
    function delegateGrantMinterRole(address nftClone, address grantTo) external onlyRelayer {
        membershipManager.grantMinterRole(nftClone, grantTo);
    }

    /**
     * @notice Delegates the grantBurnerRole call to the membership manager.
     * @dev Only callable by the relayer.
     * @param nftClone The address of the NFT clone contract.
     * @param grantTo The address to grant the burner role to.
     */
    function delegateGrantBurnerRole(address nftClone, address grantTo) external onlyRelayer {
        membershipManager.grantBurnerRole(nftClone, grantTo);
    }

    // ================================================================================================================
    // 2. ProposalManager Delegation Functions
    // ================================================================================================================

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
     * @param contextKey The pre-computed context hash (group, epoch).
     */
    function delegateVerifyProposal(
        uint256[24] calldata proof,
        uint256[5] calldata pubSignals,
        bytes32 groupKey,
        bytes32 contextKey
    ) external onlyRelayer {
        bytes32 currentRoot = _getCurrentRoot(groupKey);
        proposalManager.verifyProposal(proof, pubSignals, contextKey, currentRoot);
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
        bytes32 proofSubmissionNullifier = bytes32(publicSignals[4]);
        bool isProposalSubmitted = _getProposalSubmissionNullifierStatus(proofSubmissionNullifier);
        bytes32 currentRoot = _getCurrentRoot(groupKey);
        voteManager.verifyVote(
            proof, 
            publicSignals, 
            contextKey, 
            groupKey, 
            currentRoot, 
            isProposalSubmitted
        );
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
    function delegateDeployTreasury(bytes32 groupKey) external onlyRelayer {
        if (address(treasuryFactory) == address(0)) revert TreasuryFactoryAddressNotSet();
        bool hasDeployedNft = _getGroupNftAddress(groupKey) != address(0);
        treasuryFactory.deployTreasury(groupKey, hasDeployedNft);
    }

    // ================================================================================================================
    // 5. TreasuryManager Delegation Functions
    // ================================================================================================================
    
    // Note!!!
    // The GM can call the following functions only while it is still has DEFAULT_ADMIN_ROLE of the DAO treasury instance.
    // Once DEFAULT_ADMIN_ROLE is transferred to the DAO multiSig the GM will no longer have access to these functions.
    
    /**
     * @notice Delegates the transfer of the admin role to a new address.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the voting group.
     * @param newAdmin The address of the new admin.
     */
    function delegateTransferAdminRole(bytes32 groupKey, address newAdmin) external onlyRelayer {
        address groupTreasury = _getGroupTreasuryAddress(groupKey);
        ITreasuryManager(groupTreasury).transferAdminRole(newAdmin);
    }

    /**
     * @notice Delegates the addition of a funding module to the DAO treasury, beyond the modules that were added upon deployment.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the voting group.
     * @param _module The address of the funding module to add.
     * @param _fundingType The type of funding to associate with the module.
     */
    function delegateAddFundingModule(bytes32 groupKey, address _module, bytes32 _fundingType) external onlyRelayer {
        address groupTreasury = _getGroupTreasuryAddress(groupKey);
        ITreasuryManager(groupTreasury).addFundingModule(_module, _fundingType);
    }

    /**
     * @notice Delegates the removal of a funding module from the DAO treasury.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the voting group.
     * @param _module The address of the funding module to remove.
     * @param _fundingType The type of funding to disassociate from the module.
     */
    function delegateRemoveFundingModule(bytes32 groupKey, address _module, bytes32 _fundingType) external onlyRelayer {
        address groupTreasury = _getGroupTreasuryAddress(groupKey);
        ITreasuryManager(groupTreasury).removeFundingModule(_module, _fundingType);
    }

    /**
     * @notice Delegates the approval of a transfer within the group treasury.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the voting group.
     * @param contextKey The pre-computed context hash (group, epoch, proposal).
     */
    function delegateApproveTransfer(bytes32 groupKey, bytes32 contextKey) external onlyRelayer {
        address groupTreasury = _getGroupTreasuryAddress(groupKey);
        ITreasuryManager(groupTreasury).approveTransfer(contextKey);
    }

    /**
     * @notice Delegates the execution of a transfer within the group treasury.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the voting group.
     * @param contextKey The pre-computed context hash (group, epoch, proposal).
     */
    function delegateExecuteTransfer(bytes32 groupKey, bytes32 contextKey) external onlyRelayer {
        address groupTreasury = _getGroupTreasuryAddress(groupKey);
        ITreasuryManager(groupTreasury).executeTransfer(contextKey);
    }

    /**
     * @notice Delegates the approval and execution of a transfer within the group treasury.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the voting group.
     * @param contextKey The pre-computed context hash (group, epoch, proposal).
     */
    function delegateApproveAndExecuteTransfer(bytes32 groupKey, bytes32 contextKey) external onlyRelayer {
        address groupTreasury = _getGroupTreasuryAddress(groupKey);
        ITreasuryManager(groupTreasury).approveAndExecuteTransfer(contextKey);
    }

    // ================================================================================================================
    // 6. Funding Modules Delegation Functions
    // ================================================================================================================

    /**
     * @notice Delegates the distribution of a grant to the grant module.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the voting group.
     * @param contextKey The pre-computed context hash (group, epoch, proposal).
     * @param to The address to send the grant to.
     * @param amount The amount of the grant.
     */
    function delegateDistributeGrant(bytes32 groupKey, bytes32 contextKey, address to, uint256 amount) external onlyRelayer {
        address groupTreasury = _getGroupTreasuryAddress(groupKey);
        if (groupTreasury == address(0)) revert TreasuryAddressNotFound();
        
        // checks that the proposal with the given contextKey exists and that its passed status it set to true
        VoteTypes.ProposalResult memory proposalResult = _getProposalResult(contextKey);
        if (proposalResult.passed == false) revert ProposalNotPassed();

        grantModule.distributeGrant(groupTreasury, contextKey, to, amount);
    }

    // Alternative function to consider:
    /*
    function executeProposal(bytes32 groupKey, bytes32 contextKey, address to, uint256 amount, bytes32 fundingType) external onlyRelayer {
        if (address(treasuryFactory) == address(0)) revert TreasuryFactoryAddressNotSet();
        address groupTreasury = _getGroupTreasuryAddress(groupKey);
        if (groupTreasury == address(0)) revert TreasuryAddressNotFound();
        
        VoteTypes.ProposalResult memory proposalResult = _getProposalResult(contextKey);
        if (proposalResult.passed == false) revert ProposalNotPassed();

        if (fundingType == FundingTypes.GRANT_TYPE) {
            grantModule.distributeGrant(groupTreasury, contextKey, to, amount);
        } else if (fundingType == FundingTypes.BOUNTY_TYPE) {
            bountyModule.distributeBounty(groupTreasury, contextKey, to, amount);
        } ......
    }
    */

// ====================================================================================================================
// ====================================================================================================================
//                           EXTERNAL VIEW FUNCTIONS (FORWARDED VIA GOVERNANCE)
// ====================================================================================================================
// ====================================================================================================================

  
    // ================================================================================================================
    // 1. MembershipManager Delegation Functions
    // ================================================================================================================

    /**
     * @notice Delegates the getRoot call to the membership manager.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     * @return The current Merkle root for the specified group.
     */
    function delegateGetRoot(bytes32 groupKey) external view onlyRelayer returns (bytes32) {
        return membershipManager.getRoot(groupKey);
    }

    /**
     * @notice Delegates the getNftImplementation call to the membership manager.
     * @dev Only callable by the relayer.
     * @return The address of the NFT implementation contract.
     */
    function delegateGetNftImplementation() external view onlyRelayer returns (address) {
        return membershipManager.getNftImplementation();
    }

    /**
     * @notice Delegates the getMaxMembersBatch call to the membership manager.
     * @dev Only callable by the relayer.
     * @return The maximum batch size for member additions.
     */
    function delegateGetMaxMembersBatch() external view onlyRelayer returns (uint256) {
        return membershipManager.getMaxMembersBatch();
    }

    /**
     * @notice Delegates the getGroupNftAddress call to the membership manager.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     * @return The address of the ERC721 NFT contract associated with the specified group key.
     */
    function delegateGetGroupNftAddress(bytes32 groupKey) external view onlyRelayer returns (address) {
        return membershipManager.getGroupNftAddress(groupKey);
    }

    // ================================================================================================================
    // 2. ProposalManager Delegation Functions
    // ================================================================================================================

    /**
     * @notice Delegates the getProposalSubmissionVerifier call to the proposal manager.
     * @dev Only callable by the relayer.
     * @return The address of the proposal submission verifier contract.
     */
    function delegateGetProposalSubmissionVerifier() external view onlyRelayer returns (address) {
        return proposalManager.getProposalSubmissionVerifier();
    }

    /**
     * @notice Delegates the getProposalClaimVerifier call to the proposal manager.
     * @dev Only callable by the relayer.
     * @return The address of the proposal claim verifier contract.
     */
    function delegateGetProposalClaimVerifier() external view onlyRelayer returns (address) {
        return proposalManager.getProposalClaimVerifier();
    }

    /**
     * @notice Delegates the getSubmissionNullifierStatus call to the proposal manager.
     * @dev Only callable by the relayer.
     * @param nullifier The submission nullifier to check.
     * @return bool indicating whether the submission nullifier has been used.
     */
    function delegateGetSubmissionNullifierStatus(bytes32 nullifier) external view onlyRelayer returns (bool) {
        return proposalManager.getSubmissionNullifierStatus(nullifier);
    }

    /**
     * @notice Delegates the getClaimNullifierStatus call to the proposal manager.
     * @dev Only callable by the relayer.
     * @param nullifier The claim nullifier to check.
     * @return bool indicating whether the claim nullifier has been used.
     */
    function delegateGetClaimNullifierStatus(bytes32 nullifier) external view onlyRelayer returns (bool) {
        return proposalManager.getClaimNullifierStatus(nullifier);
    }   

    // ================================================================================================================
    // 3. VoteManager Delegation Functions
    // ================================================================================================================

    /**
     * @notice Delegates the getVoteVerifier call to the vote manager.
     * @dev Only callable by the relayer.
     * @return The address of the vote verifier contract.
     */
    function delegateGetVoteVerifier() external view onlyRelayer returns (address) {
        return voteManager.getVoteVerifier();
    }

    /**
     * @notice Delegates the getVoteNullifierStatus call to the vote manager.
     * @dev Only callable by the relayer.
     * @param nullifier The vote nullifier to check.
     * @return The status of the vote nullifier (true if used, false if not).
     */
    function delegateGetVoteNullifierStatus(bytes32 nullifier) external view onlyRelayer returns (bool) {
        return voteManager.getVoteNullifierStatus(nullifier);
    }

    /**
     * @notice Delegates the getGroupParams call to the vote manager.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the voting group.
     * @return params The group parameters including member count and quorum settings.
     */
    function delegateGetGroupParams(bytes32 groupKey) external view onlyRelayer returns (VoteTypes.GroupParams memory params) {
        return voteManager.getGroupParams(groupKey);
    }

    /**
     * @notice Delegates the getProposalResult call to the vote manager.
     * @dev Only callable by the relayer.
     * @param contextKey The pre-computed context hash (group, epoch, proposal).
     * @return result The proposal result including the vote tally and proposal passed status.
     */
    function delegateGetProposalResult(bytes32 contextKey) external view onlyRelayer returns (VoteTypes.ProposalResult memory result) {
        return voteManager.getProposalResult(contextKey);
    }

    /**
     * @notice Delegates the getQuorumParams call to the vote manager.
     * @dev Only callable by the relayer.
     * @return params The quorum parameters including minimum and maximum quorum percentages and group size thresholds.
     */
    function delegateGetQuorumParams() external view onlyRelayer returns (VoteTypes.QuorumParams memory params) {
        return voteManager.getQuorumParams();
    }

    // ================================================================================================================
    // 4. TreasuryFactory Delegation Functions
    // ================================================================================================================

    function delegateGetTreasuryAddress(bytes32 groupKey) external view onlyRelayer returns (address) {
        if (address(treasuryFactory) == address(0)) revert TreasuryFactoryAddressNotSet();
        return treasuryFactory.getTreasuryAddress(groupKey);
    }

    // ================================================================================================================
    // 5. TreasuryManager Delegation Functions
    // ================================================================================================================

    /**
     * @notice Delegates the getBalance call to the group treasury instance.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     */
    function delegateGetBalance(bytes32 groupKey) external view onlyRelayer returns (uint256) {
        address groupTreasury = _getGroupTreasuryAddress(groupKey);
        return ITreasuryManager(groupTreasury).getBalance();
    }

    /**
     * @notice Delegates the getActiveModuleAddress call to the group treasury instance.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     * @param fundingType The funding type to check.
     * @custom:error UnknownFundingType Thrown if the provided funding type is not defined in the FundingTypes library.
     */
    function delegateGetActiveModuleAddress(bytes32 groupKey, bytes32 fundingType) external view onlyRelayer returns (address) {
        address groupTreasury = _getGroupTreasuryAddress(groupKey);
        return ITreasuryManager(groupTreasury).getActiveModuleAddress(fundingType);
    }

    /**
     * @notice Delegates the isPendingApproval call to the group treasury instance.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     * @param contextKey The unique identifier for the context.
     */
    function delegateIsPendingApproval(bytes32 groupKey, bytes32 contextKey) external view onlyRelayer returns (bool) {
        address groupTreasury = _getGroupTreasuryAddress(groupKey);
        return ITreasuryManager(groupTreasury).isPendingApproval(contextKey);
    }

    /**
     * @notice Delegates the isPendingExecution call to the group treasury instance.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     * @param contextKey The unique identifier for the context.
     */
    function delegateIsPendingExecution(bytes32 groupKey, bytes32 contextKey) external view onlyRelayer returns (bool) {
        address groupTreasury = _getGroupTreasuryAddress(groupKey);
        return ITreasuryManager(groupTreasury).isPendingExecution(contextKey);
    }

    /**
     * @notice Delegates the isExecuted call to the group treasury instance.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     * @param contextKey The unique identifier for the context.
     */
    function delegateIsExecuted(bytes32 groupKey, bytes32 contextKey) external view onlyRelayer returns (bool) {
        address groupTreasury = _getGroupTreasuryAddress(groupKey);
        return ITreasuryManager(groupTreasury).isExecuted(contextKey);
    }

    /**
     * @notice Delegates the getFundingRequest call to the group treasury instance.
     * @dev Only callable by the relayer.
     * @param groupKey The unique identifier for the group.
     * @param contextKey The unique identifier for the context.
     */
    function delegateGetFundingRequest(bytes32 groupKey, bytes32 contextKey) external view onlyRelayer returns (TreasuryTypes.FundingRequest memory) {
        address groupTreasury = _getGroupTreasuryAddress(groupKey);
        return ITreasuryManager(groupTreasury).getFundingRequest(contextKey);
    }

    // ================================================================================================================
    // 6. Funding Module Delegation Functions
    // ================================================================================================================

    
// ====================================================================================================================
//                                   EXTERNAL VIEW FUNCTIONS (NOT FORWARDED)
// ====================================================================================================================

    /**
     * @notice Gets the address of the relayer.
     * @return address of the relayer.
     */
    function getRelayer() external view onlyOwner returns (address) {
        return relayer;
    }

    /**
     * @notice Gets the address of the membership manager.
     * @return address of the membership manager.
     */
    function getMembershipManager() external view onlyOwner returns (address) {
        return address(membershipManager);
    }

    /**
     * @notice Gets the address of the proposal manager.
     * @return address of the proposal manager.
     */
    function getProposalManager() external view onlyOwner returns (address) {
        return address(proposalManager);
    }

    /**
     * @notice Gets the address of the vote manager.
     * @return address of the vote manager.
     */
    function getVoteManager() external view onlyOwner returns (address) {
        return address(voteManager);
    }

    /**
     * @dev Returns the version of the contract.
     * @return string The version of the contract.
     */
    function getContractVersion() external view onlyRelayer() returns (string memory) {
        return "GovernanceManager v1.0.0"; 
    }

// ====================================================================================================================
//                                       PRIVATE HELPER FUNCTIONS
// ====================================================================================================================

    /**
     * @dev Gets the current Merkle root for a specific group.
     * @param groupKey The unique identifier for the group.
     * @return The current Merkle root for the specified group.
     */
    function _getCurrentRoot(bytes32 groupKey) private view returns(bytes32) {
        return membershipManager.getRoot(groupKey);
    }

    /**
     * @dev Checks if a proposal submission nullifier has been used.
     * @param nullifier The submission nullifier to check.
     * @return bool indicating whether the submission nullifier has been used.
     */
    function _getProposalSubmissionNullifierStatus(bytes32 nullifier) private view returns (bool) {
        return proposalManager.getSubmissionNullifierStatus(nullifier);
    }

    /**
     * @dev Gets the address of the NFT contract for a specific group.
     * @param groupKey The unique identifier for the group.
     * @return The NFT contract address.
     */
    function _getGroupNftAddress(bytes32 groupKey) private view returns (address) {
        return membershipManager.getGroupNftAddress(groupKey);
    }

    /**
     * @dev Gets the address of the group treasury for a specific group.
     * @param groupKey The unique identifier for the group.
     * @return The group treasury address.
     */
    function _getGroupTreasuryAddress(bytes32 groupKey) private view returns (address) {
        if (address(treasuryFactory) == address(0)) revert TreasuryFactoryAddressNotSet();
        return treasuryFactory.getTreasuryAddress(groupKey);
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

// ====================================================================================================================
//                                       FALLBACK FUNCTION
// ====================================================================================================================

    /**
     * @notice Fallback function to handle unknown function calls.
     * @dev Reverts with an error indicating that the function does not exist or is not implemented.
     */
    fallback() external {
        revert UnknownFunctionCall();
    }

}