// Libraries
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";

// Components
import CustomButton from "./CustomButton";
import MiniSpinner from "./MiniSpinner";
import ConfirmationModal from "./ConfirmationModal";

// Hooks
import { useWalletQuery } from "../hooks/wallet/useWalletQuery";
import { useERC721Ownership } from "../hooks/wallet/useERC721Ownership";
import { insertGroupMember } from "../services/apiGroupMembers";

const SearchResultItem = styled.li`
  background-color: rgba(165, 180, 252, 0.1);
  padding: 1.6rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(165, 180, 252, 0.2);
  font-size: 1.6rem;
  transition: all 0.2s ease-in-out;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover {
    background-color: rgba(165, 180, 252, 0.15);
    transform: translateX(4px);
  }
`;

const GroupInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1.2rem;
`;

const GroupName = styled.span`
  font-weight: 500;
`;

const ContractAddress = styled.span`
  color: var(--color-grey-400);
  font-size: 1.4rem;
  font-family: monospace;
`;

const ErrorMessage = styled.p`
  color: var(--color-red-500);
  font-size: 1.4rem;
  margin-top: 0.8rem;
`;

/**
 * Renders a search result item for a group, displaying group information and handling group joining functionality.
 * The component shows a "Check Eligibility" button initially, and only performs ERC721 checks on demand.
 * Users can check if they own tokens from the group's NFT collection and join if eligible.
 */
function SearchResultItemComponent({ group, onJoinSuccess }) {
  const queryClient = useQueryClient();
  const { address, isLoading: isWalletLoading } = useWalletQuery();
  const [hasCheckedEligibility, setHasCheckedEligibility] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState(null);
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);

  const {
    isOwner,
    isChecking,
    error: ownershipError,
    checkOwnership,
  } = useERC721Ownership(group.erc721_contract_address, hasCheckedEligibility);

  const handleCheckEligibility = async () => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    setHasCheckedEligibility(true);
    setError(null);

    try {
      await checkOwnership();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleJoin = async () => {
    setShowJoinConfirm(true);
  };

  const handleConfirmJoin = async () => {
    setShowJoinConfirm(false);

    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setIsJoining(true);
      setError(null);

      const user = queryClient.getQueryData(["user"]);
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      await insertGroupMember({
        userId: user.id,
        groupId: group.group_id,
      });

      onJoinSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleCancelJoin = () => {
    setShowJoinConfirm(false);
  };

  if (isWalletLoading) {
    return (
      <SearchResultItem>
        <GroupInfo>
          <GroupName>{group.name}</GroupName>
          <ContractAddress>{group.erc721_contract_address}</ContractAddress>
        </GroupInfo>
        <MiniSpinner />
      </SearchResultItem>
    );
  }

  if (!address) {
    return (
      <SearchResultItem>
        <GroupInfo>
          <GroupName>{group.name}</GroupName>
          <ContractAddress>{group.erc721_contract_address}</ContractAddress>
        </GroupInfo>
        <ErrorMessage>
          Please connect your wallet to check eligibility
        </ErrorMessage>
      </SearchResultItem>
    );
  }

  if (!hasCheckedEligibility) {
    return (
      <SearchResultItem>
        <GroupInfo>
          <GroupName>{group.name}</GroupName>
          <ContractAddress>{group.erc721_contract_address}</ContractAddress>
        </GroupInfo>
        <CustomButton
          backgroundColor="#A5B4FC"
          hoverColor="#818cf8"
          textColor="#232328"
          onClick={handleCheckEligibility}
        >
          Check Eligibility
        </CustomButton>
      </SearchResultItem>
    );
  }

  if (isChecking) {
    return (
      <SearchResultItem>
        <GroupInfo>
          <GroupName>{group.name}</GroupName>
          <ContractAddress>{group.erc721_contract_address}</ContractAddress>
        </GroupInfo>
        <MiniSpinner />
      </SearchResultItem>
    );
  }

  if (ownershipError) {
    return (
      <SearchResultItem>
        <GroupInfo>
          <GroupName>{group.name}</GroupName>
          <ContractAddress>{group.erc721_contract_address}</ContractAddress>
        </GroupInfo>
        <ErrorMessage>{ownershipError}</ErrorMessage>
      </SearchResultItem>
    );
  }

  return (
    <>
      <SearchResultItem>
        <GroupInfo>
          <GroupName>{group.name}</GroupName>
          <ContractAddress>{group.erc721_contract_address}</ContractAddress>
        </GroupInfo>
        {isOwner ? (
          <CustomButton
            backgroundColor="#A5B4FC"
            hoverColor="#818cf8"
            textColor="#232328"
            onClick={handleJoin}
            disabled={isJoining}
          >
            {isJoining ? "Joining..." : "Join"}
          </CustomButton>
        ) : (
          <ErrorMessage>
            You don't own any tokens from this collection
          </ErrorMessage>
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </SearchResultItem>

      <ConfirmationModal
        isOpen={showJoinConfirm}
        title="Join Group"
        message={`Are you sure you want to join the group "${group.name}"? You will be added as a member and can participate in group activities.`}
        confirmText="Join"
        cancelText="Cancel"
        confirmButtonColor="#A5B4FC"
        confirmButtonHoverColor="#818cf8"
        cancelButtonColor="var(--color-grey-600)"
        cancelButtonHoverColor="var(--color-grey-500)"
        onConfirm={handleConfirmJoin}
        onCancel={handleCancelJoin}
      />
    </>
  );
}

export default SearchResultItemComponent;
