import React, { useState, useEffect } from "react";

// libraries
import toast from "react-hot-toast";
import styled from "styled-components";

// components
import PageHeader from "../components/PageHeader";
import CustomButton from "../components/CustomButton";
import CustomButtonIcon from "../components/CustomButtonIcon";
import Spinner from "../components/Spinner";
import ConfirmationModalComponent from "../components/ConfirmationModal";

// hooks
import { useInsertNewGroup } from "../hooks/queries/groups/useInsertNewGroup";
import { useRelayerDeployERC721 } from "../hooks/relayers/useRelayerDeployERC721";
import { useInsertERC721ContractAddress } from "../hooks/queries/groups/useInsertERC721ContractAddress";
import { useWalletQuery } from "../hooks/wallet/useWalletQuery";
import { useUser } from "../hooks/queries/authentication/useUser";

// icons
import { IoIosInformationCircle } from "react-icons/io";
import { FaCirclePlus, FaCircleMinus } from "react-icons/fa6";

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3.2rem;
  flex: 1;
  min-height: 100%;
  min-width: 55rem;
  color: var(--color-grey-100);
  padding: 0 2rem;
`;

const FormSection = styled.section`
  background: rgba(165, 180, 252, 0.05);
  border-radius: 1.2rem;
  padding: 2.4rem 2rem 2rem 2rem;
  margin-bottom: 2.4rem;
  border: 1px solid rgba(165, 180, 252, 0.08);
`;

const SectionTitle = styled.h2`
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--color-grey-100);
  margin-bottom: 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
`;

const InfoIcon = styled(IoIosInformationCircle)`
  color: #a5b4fc;
  font-size: 1.7rem;
  vertical-align: middle;
`;

const Label = styled.label`
  font-size: 1.3rem;
  color: var(--color-grey-200);
  margin-bottom: 0.4rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const Input = styled.input`
  background: #232328;
  border: 1px solid rgba(165, 180, 252, 0.2);
  border-radius: 0.8rem;
  color: #fff;
  padding: 0.9rem 1.2rem;
  font-size: 1.3rem;
  width: 100%;
  margin-bottom: 1.6rem;
  transition: all 0.2s ease-in-out;

  &::placeholder {
    color: var(--color-grey-400);
  }
  &:focus {
    outline: none;
    border-color: #a5b4fc;
    background: rgba(165, 180, 252, 0.08);
  }
`;

const AddMemberRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.2rem;
`;

const Note = styled.p`
  font-size: 1.1rem;
  color: var(--color-grey-400);
  margin-top: 0.2rem;
  margin-bottom: 1.6rem;
`;

const CheckboxLabel = styled.label`
  font-size: 1.3rem;
  color: var(--color-grey-200);
  margin-bottom: 0.8rem;
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;

  &:hover {
    color: var(--color-grey-100);
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 1.6rem;
  justify-content: center;
  margin-top: 2.4rem;
`;

const SectionHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.8rem;
`;

const InfoIconWrapper = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  &:hover > div {
    opacity: 1;
    visibility: visible;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  top: -3.2rem;
  left: 0;
  min-width: 260px;
  max-width: 340px;
  background: var(--color-grey-800);
  color: var(--color-grey-100);
  padding: 1rem 1.4rem;
  border-radius: 0.6rem;
  font-size: 1.32rem;
  white-space: normal;
  word-break: break-word;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease-in-out;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1001;
`;

const LoadingText = styled.p`
  color: #fff;
  font-size: 1.8rem;
  margin-top: 16px;
  text-align: center;
`;

// Utility function to validate Ethereum address
const isValidEthAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);

/**
 * CreateGroup Component
 *
 * A comprehensive form component for creating new groups in the Ignition ZK system.
 * Allows users to define group details, configure ERC721 NFT contracts for membership,
 * and add initial members. The component handles wallet connection validation,
 * form validation, ERC721 contract deployment, and database operations.
 *
 * Features:
 * - Group name and ERC721 token configuration
 * - Member address management (up to 30 members)
 * - Wallet connection status display
 * - Form validation with error handling
 * - Confirmation modals for create/cancel actions
 * - Loading states during operations
 * - Automatic inclusion of creator's wallet address
 */
export default function CreateGroup({ onCancel }) {
  const [groupName, setGroupName] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [memberInputs, setMemberInputs] = useState([]);
  const [touched, setTouched] = useState([]);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Treasury state variables
  const [treasuryEnabled, setTreasuryEnabled] = useState(false);
  const [ownerMultisig, setOwnerMultisig] = useState("");
  const [recoveryMultisig, setRecoveryMultisig] = useState("");

  // New state for confirmation modal and loading
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'create' or 'cancel'

  // Hook for inserting new group
  const { insertNewGroup, isLoading } = useInsertNewGroup();

  // Hook for deploying ERC721 contract
  const { deployERC721 } = useRelayerDeployERC721();

  // Hook for inserting ERC721 contract address
  const { insertERC721ContractAddress } = useInsertERC721ContractAddress();

  // Hook for querying wallet
  const { address: walletAddress } = useWalletQuery();

  // Hook for querying user
  const { user } = useUser();

  // Initialize touched array when component mounts
  useEffect(() => {
    setTouched([false, false, false, false]); // Initialize for groupName, tokenName, tokenSymbol, and memberInputs
  }, []);

  // Initialize member inputs with connected wallet address
  useEffect(() => {
    if (walletAddress && memberInputs.length === 0) {
      setMemberInputs([walletAddress]);
    } else if (!walletAddress && memberInputs.length > 0) {
      // Clear member inputs if wallet is disconnected
      setMemberInputs([]);
    }
  }, [walletAddress, memberInputs.length]);

  // Add a new empty member input row
  const handleAddMemberInput = () => {
    if (memberInputs.length >= 30) {
      toast.error("Maximum of 30 members allowed per group");
      return;
    }
    setMemberInputs((prev) => [...prev, ""]);
    // Keep the first 3 elements (groupName, tokenName, tokenSymbol) and add false for new member input
    setTouched((prev) => [...prev.slice(0, 3), ...prev.slice(3), false]);
  };

  // Remove a member input row by index
  const handleRemoveMemberInput = (idx) => {
    // Prevent removing the user's own wallet address
    if (
      walletAddress &&
      memberInputs[idx]?.toLowerCase() === walletAddress.toLowerCase()
    ) {
      toast.error("You cannot remove your own wallet address from the group");
      return;
    }
    setMemberInputs((prev) => prev.filter((_, i) => i !== idx));
    // Keep the first 3 elements (groupName, tokenName, tokenSymbol) and filter member inputs
    setTouched((prev) => [
      ...prev.slice(0, 3),
      ...prev.slice(3).filter((_, i) => i !== idx),
    ]);
  };

  // Update the value of a member input row
  const handleChangeMemberInput = (idx, value) => {
    // Prevent editing if this is the user's wallet address
    if (
      walletAddress &&
      memberInputs[idx]?.toLowerCase() === walletAddress.toLowerCase()
    ) {
      toast.error("You cannot edit your own wallet address");
      return;
    }
    setMemberInputs((prev) => prev.map((v, i) => (i === idx ? value : v)));
    // Update touched for member input (index 3 + member index)
    setTouched((prev) => prev.map((v, i) => (i === 3 + idx ? true : v)));
  };

  // Real-time validation functions
  const validateGroupName = () => {
    return groupName.trim() !== "";
  };

  const validateTokenName = () => {
    return tokenName.trim() !== "";
  };

  const validateTokenSymbol = () => {
    const symbol = tokenSymbol.trim();
    return symbol !== "" && /^[A-Z0-9]{1,4}$/.test(symbol);
  };

  const validateOwnerMultisig = () => {
    if (!treasuryEnabled) return true;
    if (ownerMultisig.trim() === "") return false;
    return isValidEthAddress(ownerMultisig);
  };

  const validateRecoveryMultisig = () => {
    if (!treasuryEnabled) return true;
    if (recoveryMultisig.trim() === "") return false;
    return isValidEthAddress(recoveryMultisig);
  };

  const validateMultisigDifferent = () => {
    if (!treasuryEnabled) return true;
    if (ownerMultisig.trim() === "" || recoveryMultisig.trim() === "")
      return true;
    return ownerMultisig.toLowerCase() !== recoveryMultisig.toLowerCase();
  };

  const validateMemberInputs = () => {
    if (memberInputs.length === 0) return false;

    // Check if all member inputs are valid Ethereum addresses
    const allValidAddresses = memberInputs.every(
      (input) => input.trim() !== "" && isValidEthAddress(input)
    );

    if (!allValidAddresses) return false;

    // Check for duplicates
    const lowerInputs = memberInputs.map((addr) => addr.toLowerCase());
    const uniqueAddresses = new Set(lowerInputs);
    return uniqueAddresses.size === lowerInputs.length;
  };

  const validateUserWalletIncluded = () => {
    if (!walletAddress) return false;
    return memberInputs.some(
      (input) => input.toLowerCase() === walletAddress.toLowerCase()
    );
  };

  // Comprehensive form validation
  const isFormValid = () => {
    return (
      validateGroupName() &&
      validateTokenName() &&
      validateTokenSymbol() &&
      validateOwnerMultisig() &&
      validateRecoveryMultisig() &&
      validateMultisigDifferent() &&
      validateMemberInputs() &&
      validateUserWalletIncluded() &&
      !!walletAddress &&
      !!user?.id
    );
  };

  // Field validation for group name, token name, token symbol
  const groupNameError =
    (formSubmitted || touched[0]) && groupName.trim() === ""
      ? "Group name is required"
      : null;
  const tokenNameError =
    (formSubmitted || touched[1]) && tokenName.trim() === ""
      ? "Token name is required"
      : null;
  let tokenSymbolError = null;
  if (formSubmitted || touched[2]) {
    if (tokenSymbol.trim() === "") {
      tokenSymbolError = "Token symbol is required";
    } else if (!/^[A-Z0-9]{1,4}$/.test(tokenSymbol)) {
      tokenSymbolError =
        "Token symbol must be 1-4 characters, A-Z and 0-9 only";
    }
  }

  // Treasury validation
  const ownerMultisigError =
    (formSubmitted || (treasuryEnabled && ownerMultisig.trim() !== "")) &&
    treasuryEnabled &&
    ownerMultisig.trim() === ""
      ? "Owner multisig address is required when treasury is enabled"
      : null;
  const recoveryMultisigError =
    (formSubmitted || (treasuryEnabled && recoveryMultisig.trim() !== "")) &&
    treasuryEnabled &&
    recoveryMultisig.trim() === ""
      ? "Recovery multisig address is required when treasury is enabled"
      : null;
  const ownerMultisigInvalidError =
    (formSubmitted || (treasuryEnabled && ownerMultisig.trim() !== "")) &&
    treasuryEnabled &&
    ownerMultisig.trim() !== "" &&
    !isValidEthAddress(ownerMultisig)
      ? "Invalid Ethereum address for owner multisig"
      : null;
  const recoveryMultisigInvalidError =
    (formSubmitted || (treasuryEnabled && recoveryMultisig.trim() !== "")) &&
    treasuryEnabled &&
    recoveryMultisig.trim() !== "" &&
    !isValidEthAddress(recoveryMultisig)
      ? "Invalid Ethereum address for recovery multisig"
      : null;
  const multisigDuplicateError =
    (formSubmitted ||
      (treasuryEnabled &&
        ownerMultisig.trim() !== "" &&
        recoveryMultisig.trim() !== "")) &&
    treasuryEnabled &&
    ownerMultisig.trim() !== "" &&
    recoveryMultisig.trim() !== "" &&
    ownerMultisig.toLowerCase() === recoveryMultisig.toLowerCase()
      ? "Owner and recovery multisig addresses must be different"
      : null;

  // Validation logic for member inputs
  const lowerInputs = memberInputs.map((addr) => addr.toLowerCase());
  const memberInputErrors = memberInputs.map((input) => {
    if (input.length === 0) return "Address required";
    if (!isValidEthAddress(input)) return "Invalid Ethereum address";
    // Check for duplicates (case-insensitive)
    if (lowerInputs.filter((addr) => addr === input.toLowerCase()).length > 1) {
      return "Duplicate address";
    }
    return null;
  });

  // Check if at least one member is added
  const hasAtLeastOneMember =
    memberInputs.length > 0 &&
    memberInputs.some((input) => input.trim() !== "");
  const noMembersError =
    (formSubmitted || memberInputs.some((input) => input.trim() !== "")) &&
    !hasAtLeastOneMember
      ? "At least one member is required"
      : null;

  // Check if user's wallet address is included in the member list
  const hasUserWalletAddress =
    walletAddress &&
    memberInputs.some(
      (input) => input.toLowerCase() === walletAddress.toLowerCase()
    );
  const noUserWalletError =
    (formSubmitted || memberInputs.length > 0) &&
    walletAddress &&
    !hasUserWalletAddress
      ? "Your wallet address must be included as a member"
      : null;

  // Check if wallet is connected
  const isWalletConnected = !!walletAddress;
  const walletNotConnectedError =
    formSubmitted && !isWalletConnected
      ? "Please connect your wallet to create a group"
      : null;

  // Handle create button click - show confirmation first
  const handleCreateClick = (e) => {
    e.preventDefault();
    setFormSubmitted(true);
    if (!isFormValid()) {
      return;
    }

    setConfirmAction("create");
    setShowConfirmModal(true);
  };

  // Handle cancel button click - show confirmation first
  const handleCancelClick = () => {
    setConfirmAction("cancel");
    setShowConfirmModal(true);
  };

  // Handle confirmation modal actions
  const handleConfirmAction = () => {
    if (confirmAction === "create") {
      setShowLoadingOverlay(true);
      handleCreateGroup();
    } else if (confirmAction === "cancel") {
      handleCancelGroup();
    }
  };

  const handleCancelModal = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  // Handle the actual group creation
  const handleCreateGroup = () => {
    // Log treasury data if enabled
    if (treasuryEnabled) {
      console.log("Treasury enabled with:", {
        ownerMultisig,
        recoveryMultisig,
      });
      // TODO: Implement treasury deployment logic
      // This would involve deploying a TreasuryManager contract
      // and storing the treasury configuration in the database
    }

    // Insert the new group using the hook
    insertNewGroup(
      { name: groupName.trim() },
      {
        onSuccess: (data) => {
          console.log("Group created successfully:", data);
          console.log("Token name: ", tokenName);
          console.log("Token symbol: ", tokenSymbol);

          // Deploy ERC721 contract using the new group data
          deployERC721(
            {
              groupId: data[0].group_id,
              tokenName: tokenName,
              tokenSymbol: tokenSymbol,
              memberAddresses: memberInputs.filter(
                (input) => input.trim() !== "" && isValidEthAddress(input)
              ),
              userId: user.id,
            },
            {
              onSuccess: (deployedData) => {
                console.log(
                  "ERC721 contract deployed successfully:",
                  deployedData
                );

                // Save the deployed contract address to the database
                if (deployedData.deployedNftAddress) {
                  insertERC721ContractAddress(
                    {
                      group_id: data[0].group_id,
                      erc721_contract_address: deployedData.deployedNftAddress,
                    },
                    {
                      onSuccess: (updatedGroup) => {
                        console.log(
                          "Contract address saved to database:",
                          updatedGroup
                        );
                        // Hide loading overlay, show success message, and return to dashboard
                        setShowLoadingOverlay(false);
                        toast.success(
                          `Group "${groupName}" created successfully!`
                        );
                        onCancel(); // Use onCancel to properly reset Dashboard state
                      },
                      onError: (error) => {
                        console.error(
                          "Failed to save contract address to database:",
                          error
                        );
                        // Hide loading overlay, show error message, and return to dashboard
                        setShowLoadingOverlay(false);
                        toast.error(
                          "Group created but failed to save contract address. Please contact support."
                        );
                        onCancel(); // Use onCancel to properly reset Dashboard state
                      },
                    }
                  );
                } else {
                  console.warn(
                    "No deployed NFT address found in response:",
                    deployedData
                  );
                  // Hide loading overlay, show warning message, and return to dashboard
                  setShowLoadingOverlay(false);
                  toast.error(
                    "Group created but contract deployment may have failed. Please contact support."
                  );
                  onCancel(); // Use onCancel to properly reset Dashboard state
                }
              },
              onError: (error) => {
                console.error("Failed to deploy ERC721 contract:", error);
                // Hide loading overlay, show error message, and return to dashboard
                setShowLoadingOverlay(false);
                toast.error(
                  "Failed to deploy ERC721 contract. Please try again or contact support."
                );
                onCancel(); // Use onCancel to properly reset Dashboard state
              },
            }
          );
        },
        onError: (error) => {
          console.error("Failed to create group:", error);
          // Hide loading overlay, show error message, and return to dashboard
          setShowLoadingOverlay(false);
          toast.error("Failed to create group. Please try again.");
          onCancel(); // Use onCancel to properly reset Dashboard state
        },
      }
    );
  };

  // Handle the actual group cancellation
  const handleCancelGroup = () => {
    // Clear form and return to dashboard
    setGroupName("");
    setTokenName("");
    setTokenSymbol("");
    setMemberInputs([]);
    setTouched([false, false, false, false]);
    setFormSubmitted(false);
    // Reset treasury state
    setTreasuryEnabled(false);
    setOwnerMultisig("");
    setRecoveryMultisig("");
    toast.success("Group creation cancelled.");
    onCancel(); // Use onCancel to properly reset Dashboard state
  };

  return (
    <>
      <PageContainer>
        <PageHeader title="Create New Group" />

        {/* Wallet Connection Status */}
        <FormSection>
          <SectionTitle>Wallet Connection Status</SectionTitle>
          {isWalletConnected ? (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#10b981",
                  flexShrink: 0,
                }}
              />
              <div>
                <p style={{ color: "#10b981", fontWeight: 600, margin: 0 }}>
                  ✅ Wallet Connected
                </p>
                <p
                  style={{
                    color: "var(--color-grey-300)",
                    fontSize: "1.2rem",
                    margin: "0.4rem 0 0 0",
                  }}
                >
                  Address: {walletAddress}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#f87171",
                  flexShrink: 0,
                }}
              />
              <div>
                <p style={{ color: "#f87171", fontWeight: 600, margin: 0 }}>
                  ❌ Wallet Not Connected
                </p>
                <p
                  style={{
                    color: "var(--color-grey-300)",
                    fontSize: "1.2rem",
                    margin: "0.4rem 0 0 0",
                  }}
                >
                  Please connect your wallet to proceed with group creation
                </p>
              </div>
            </div>
          )}
        </FormSection>

        <FormSection>
          <SectionTitle>Please read carefully</SectionTitle>
          <p
            style={{
              color: "var(--color-grey-200)",
              fontSize: "1.15rem",
              marginBottom: "1.2rem",
            }}
          >
            This form will register a new group in the system and initiate the
            on-chain deployment process. You'll need to specify a unique group
            name and define the ERC721 token contract that will serve as the
            access gate for group membership.
            <br />
            <br />
            <b>
              Once you submit, the system will deploy the ERC721 contract,
              initialize your group on-chain, and you will receive a mnemonic to
              store securely.
            </b>{" "}
            This will act as your credential for interacting with the group.
            <br />
            <br />
            <span
              style={{ fontStyle: "italic", color: "var(--color-grey-400)" }}
            >
              Note: The group name and ERC721 contract name must be unique
              across the system.
            </span>
          </p>
        </FormSection>
        <FormSection>
          <Label>
            Group Name
            <InfoIconWrapper>
              <InfoIcon />
              <Tooltip>
                This is the unique identifier for your group (e.g., "Design
                Council"). It must not conflict with any existing group name.
              </Tooltip>
            </InfoIconWrapper>
          </Label>
          <Input
            type="text"
            placeholder="Enter group name"
            value={groupName}
            onChange={(e) => {
              setGroupName(e.target.value);
              if (!touched[0]) setTouched((prev) => [true, ...prev.slice(1)]);
            }}
            style={{
              borderColor: groupNameError ? "#f87171" : undefined,
            }}
          />
          {groupNameError && (
            <div
              style={{
                color: "#f87171",
                fontSize: "1.1rem",
                marginBottom: "1rem",
              }}
            >
              {groupNameError}
            </div>
          )}

          <SectionTitle>
            ERC721 NFT Contract
            <InfoIconWrapper>
              <InfoIcon />
              <Tooltip>
                Define the new ERC721 token contract that will act as the gate
                for membership. The contract will be deployed for you
                automatically based on this information. This cannot be changed.
              </Tooltip>
            </InfoIconWrapper>
          </SectionTitle>
          <Label>
            Token Name
            <InfoIconWrapper>
              <InfoIcon />
              <Tooltip>
                This is the name of the ERC721 contract that will be deployed
                for the group (e.g., "ContributorAccess"). It must be unique
                across all deployed ERC721s.
              </Tooltip>
            </InfoIconWrapper>
          </Label>
          <Input
            type="text"
            placeholder="Enter token name"
            value={tokenName}
            onChange={(e) => {
              setTokenName(e.target.value);
              if (!touched[1])
                setTouched((prev) => [prev[0], true, ...prev.slice(2)]);
            }}
            style={{
              borderColor: tokenNameError ? "#f87171" : undefined,
            }}
          />
          {tokenNameError && (
            <div
              style={{
                color: "#f87171",
                fontSize: "1.1rem",
                marginBottom: "1rem",
              }}
            >
              {tokenNameError}
            </div>
          )}

          <Label>
            Token Symbol
            <InfoIconWrapper>
              <InfoIcon />
              <Tooltip>
                The short symbol for the contract (e.g., "CA"). Used in the
                deployed ERC721.
                {"\n"}
                Token Symbol must be 1-4 characters, only uppercase A-Z and 0-9.
                No spaces or special characters.
              </Tooltip>
            </InfoIconWrapper>
          </Label>
          <Input
            type="text"
            placeholder="e.g. ZKGP"
            maxLength={4}
            value={tokenSymbol}
            onChange={(e) => {
              setTokenSymbol(e.target.value);
              if (!touched[2])
                setTouched((prev) => [
                  prev[0],
                  prev[1],
                  true,
                  ...prev.slice(3),
                ]);
            }}
            style={{
              borderColor: tokenSymbolError ? "#f87171" : undefined,
            }}
          />
          {tokenSymbolError && (
            <div
              style={{
                color: "#f87171",
                fontSize: "1.1rem",
                marginBottom: "1rem",
              }}
            >
              {tokenSymbolError}
            </div>
          )}

          <SectionTitle>
            Treasury
            <InfoIconWrapper>
              <InfoIcon />
              <Tooltip>
                Create an optional Treasury for your group to manage funds,
                grants, and financial operations. The Treasury will be deployed
                as a smart contract with configurable ownership and recovery
                mechanisms. You can enable this feature by checking the box
                below and providing the required multisig addresses.
              </Tooltip>
            </InfoIconWrapper>
          </SectionTitle>

          <div style={{ marginBottom: "1.6rem" }}>
            <CheckboxLabel>
              <input
                type="checkbox"
                checked={treasuryEnabled}
                onChange={(e) => {
                  setTreasuryEnabled(e.target.checked);
                  if (!e.target.checked) {
                    setOwnerMultisig("");
                    setRecoveryMultisig("");
                  }
                }}
                style={{
                  marginRight: "0.8rem",
                  transform: "scale(1.3)",
                  accentColor: "#a5b4fc",
                  cursor: "pointer",
                }}
              />
              Enable Treasury
            </CheckboxLabel>
          </div>

          {treasuryEnabled && (
            <>
              <Label>
                Owner Multisig
                <InfoIconWrapper>
                  <InfoIcon />
                  <Tooltip>
                    The multisig wallet address that will have full control over
                    the Treasury. This address will be able to approve spending,
                    manage grants, and control all Treasury operations. Must be
                    a valid Ethereum address.
                  </Tooltip>
                </InfoIconWrapper>
              </Label>
              <Input
                type="text"
                placeholder="Enter owner multisig address (0x123...abc)"
                value={ownerMultisig}
                onChange={(e) => {
                  setOwnerMultisig(e.target.value);
                  // Mark as touched for validation
                  if (e.target.value.trim() !== "") {
                    setTouched((prev) => [...prev, true]);
                  }
                }}
                autoComplete="new-password"
                style={{
                  borderColor:
                    ownerMultisigError || ownerMultisigInvalidError
                      ? "#f87171"
                      : undefined,
                  marginBottom:
                    ownerMultisigError || ownerMultisigInvalidError
                      ? "0.8rem"
                      : "1.6rem",
                }}
              />
              {(ownerMultisigError || ownerMultisigInvalidError) && (
                <div
                  style={{
                    color: "#f87171",
                    fontSize: "1.1rem",
                    marginBottom: "0.8rem",
                  }}
                >
                  {ownerMultisigError || ownerMultisigInvalidError}
                </div>
              )}

              <Label>
                Recovery Multisig
                <InfoIconWrapper>
                  <InfoIcon />
                  <Tooltip>
                    A backup multisig wallet address for emergency recovery
                    operations. This address can be used to recover Treasury
                    funds or change ownership in emergency situations. Must be a
                    valid Ethereum address and different from the owner
                    multisig.
                  </Tooltip>
                </InfoIconWrapper>
              </Label>
              <Input
                type="text"
                placeholder="Enter recovery multisig address (0x123...abc)"
                value={recoveryMultisig}
                onChange={(e) => {
                  setRecoveryMultisig(e.target.value);
                  // Mark as touched for validation
                  if (e.target.value.trim() !== "") {
                    setTouched((prev) => [...prev, true]);
                  }
                }}
                autoComplete="new-password"
                style={{
                  borderColor:
                    recoveryMultisigError || recoveryMultisigInvalidError
                      ? "#f87171"
                      : undefined,
                  marginBottom:
                    recoveryMultisigError || recoveryMultisigInvalidError
                      ? "0.8rem"
                      : "1.6rem",
                }}
              />
              {(recoveryMultisigError || recoveryMultisigInvalidError) && (
                <div
                  style={{
                    color: "#f87171",
                    fontSize: "1.1rem",
                    marginBottom: "0.8rem",
                  }}
                >
                  {recoveryMultisigError || recoveryMultisigInvalidError}
                </div>
              )}

              {multisigDuplicateError && (
                <div
                  style={{
                    color: "#f87171",
                    fontSize: "1.1rem",
                    marginBottom: "0.8rem",
                  }}
                >
                  {multisigDuplicateError}
                </div>
              )}
            </>
          )}
        </FormSection>
        <FormSection>
          <SectionHeaderRow>
            <SectionTitle style={{ marginBottom: 0 }}>
              Add Members
              <InfoIconWrapper>
                <InfoIcon />
                <Tooltip>
                  Membership is validated by NFT ownership. As the creator,
                  you'll receive a credential and be included in the group
                  automatically. Maximum of 30 initial members allowed per
                  group.
                </Tooltip>
              </InfoIconWrapper>
            </SectionTitle>
            <CustomButtonIcon
              icon={FaCirclePlus}
              tooltipText={
                memberInputs.length >= 30
                  ? "Maximum members reached"
                  : "Add member row"
              }
              onClick={handleAddMemberInput}
              hoverColor="#a5b4fc"
              iconProps={{ style: { fontSize: "2.2rem" } }}
              disabled={memberInputs.length >= 30}
            />
          </SectionHeaderRow>
          <Note>
            <strong style={{ color: "#f87171" }}>
              At least one member is required.
            </strong>{" "}
            Your connected wallet address has been automatically added as the
            first member.
            <strong style={{ color: "#a5b4fc" }}>
              Please connect your wallet if you haven't already.
            </strong>{" "}
            You can add additional members by clicking the "+" button below
            (maximum 30 members). Members must hold one of the ERC721 tokens to
            be eligible. By adding their addresses here they will be granted a
            token. Once the group has been created, added members simply log
            into their account and connect their wallet using the address
            entered here. They will then search for the newly created group and
            click the join button. They will be prompted to generate their
            credentials to complete the enrollment.
          </Note>
          {noMembersError && (
            <div
              style={{
                color: "#f87171",
                fontWeight: 500,
                marginBottom: "1.2rem",
                fontSize: "1.15rem",
              }}
            >
              {noMembersError}
            </div>
          )}
          {noUserWalletError && (
            <div
              style={{
                color: "#f87171",
                fontWeight: 500,
                marginBottom: "1.2rem",
                fontSize: "1.15rem",
              }}
            >
              {noUserWalletError}
            </div>
          )}
          {walletNotConnectedError && (
            <div
              style={{
                color: "#f87171",
                fontWeight: 500,
                marginBottom: "1.2rem",
                fontSize: "1.15rem",
              }}
            >
              {walletNotConnectedError}
            </div>
          )}
          {memberInputs.length > 0 &&
            memberInputs.some((input) => input.length === 0) && (
              <div
                style={{
                  color: "#f87171",
                  fontWeight: 500,
                  marginBottom: "1.2rem",
                  fontSize: "1.15rem",
                }}
              >
                All address fields are required.
              </div>
            )}
          {memberInputs.map((value, idx) => {
            const showError = touched[idx] && memberInputErrors[idx];
            const isUserWallet =
              walletAddress &&
              value.toLowerCase() === walletAddress.toLowerCase();
            return (
              <AddMemberRow key={idx}>
                <Input
                  type="text"
                  placeholder="enter address (0x123...abc)"
                  value={value}
                  onChange={(e) => handleChangeMemberInput(idx, e.target.value)}
                  style={{
                    marginBottom: 0,
                    borderColor: showError ? "#f87171" : undefined,
                    backgroundColor: isUserWallet
                      ? "rgba(165, 180, 252, 0.1)"
                      : undefined,
                    cursor: isUserWallet ? "not-allowed" : undefined,
                  }}
                  readOnly={isUserWallet}
                />
                <CustomButtonIcon
                  icon={FaCircleMinus}
                  tooltipText={
                    isUserWallet
                      ? "Cannot remove your own address"
                      : "Remove row"
                  }
                  onClick={() => handleRemoveMemberInput(idx)}
                  hoverColor="#f87171"
                  iconProps={{ style: { fontSize: "2.2rem" } }}
                  disabled={isUserWallet}
                />
                {showError && (
                  <span
                    style={{
                      color: "#f87171",
                      fontSize: "1.1rem",
                      marginLeft: "1rem",
                    }}
                  >
                    {memberInputErrors[idx]}
                  </span>
                )}
                {isUserWallet && (
                  <span
                    style={{
                      color: "#a5b4fc",
                      fontSize: "1.1rem",
                      marginLeft: "1rem",
                      fontStyle: "italic",
                    }}
                  >
                    Your wallet address (read-only)
                  </span>
                )}
              </AddMemberRow>
            );
          })}
        </FormSection>
        <ButtonRow>
          <CustomButton
            backgroundColor="#a5b4fc"
            textColor="#232328"
            hoverColor="#818cf8"
            disabled={!isFormValid() || isLoading}
            onClick={handleCreateClick}
          >
            Create
          </CustomButton>
          <CustomButton
            backgroundColor="var(--color-red-300)"
            textColor="#232328"
            hoverColor="var(--color-red-400)"
            onClick={handleCancelClick}
            disabled={isLoading}
          >
            Cancel
          </CustomButton>
        </ButtonRow>
      </PageContainer>

      {/* Confirmation Modal */}
      <ConfirmationModalComponent
        isOpen={showConfirmModal}
        title={
          confirmAction === "create"
            ? "Confirm Group Creation"
            : "Confirm Cancellation"
        }
        message={
          confirmAction === "create"
            ? `Are you sure you want to create the group "${groupName}"? This action will deploy an ERC721 contract and cannot be undone.`
            : "Are you sure you want to cancel? All entered data will be lost."
        }
        confirmText={confirmAction === "create" ? "Create Group" : "Confirm"}
        cancelText="Back"
        confirmButtonColor={confirmAction === "create" ? "#a5b4fc" : "#f87171"}
        confirmButtonHoverColor={
          confirmAction === "create" ? "#818cf8" : "#ef4444"
        }
        cancelButtonColor="var(--color-grey-600)"
        cancelButtonHoverColor="var(--color-grey-500)"
        onConfirm={handleConfirmAction}
        onCancel={handleCancelModal}
      />

      {/* Loading Overlay */}
      {showLoadingOverlay && (
        <LoadingOverlay>
          <Spinner />
          <LoadingText>Creating group...</LoadingText>
          <LoadingText
            style={{
              fontSize: "1.4rem",
              marginTop: "0.8rem",
              color: "var(--color-grey-300)",
            }}
          >
            This may take several minutes.
          </LoadingText>
        </LoadingOverlay>
      )}
    </>
  );
}
