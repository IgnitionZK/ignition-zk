import { useState } from "react";
import { RiDeleteBack2Fill } from "react-icons/ri";
import { useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
// components
import MiniSpinner from "./MiniSpinner";
import CustomButtonIcon from "./CustomButtonIcon";
import GenerateCredentialsOverlay from "./GenerateCredentialsOverlay";
// hooks
import { useCheckCommitment } from "../hooks/queries/groupMembers/useCheckCommitment";
import { useGetActiveMerkleTreeRoot } from "../hooks/queries/merkleTreeRoots/useGetActiveMerkleTreeRoot";

const GroupItemContainer = styled.li`
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

const GroupActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1.2rem;
`;

const GenerateButton = styled.button`
  background-color: #a5b4fc;
  color: #232328;
  padding: 0.8rem 1.6rem;
  border: none;
  border-radius: 0.8rem;
  font-size: 1.4rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: #818cf8;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(1px);
  }
`;

/**
 * Renders a single group item in the dashboard, displaying group information and actions.
 * Allows users to generate credentials if they haven't committed yet, and provides the ability to leave the group.
 */
function GroupItem({ group, groupMemberId, groupId }) {
  const [showGenerateCredentials, setShowGenerateCredentials] = useState(false);
  const queryClient = useQueryClient();
  const { hasCommitment, isLoading } = useCheckCommitment({
    groupMemberId,
  });
  const { data: currentTreeRoot } = useGetActiveMerkleTreeRoot({ groupId });

  const handleGenerateCredentials = () => {
    queryClient.setQueryData(["currentGroupId"], groupId);
    queryClient.setQueryData("currentRootId", currentTreeRoot?.root_id);
    queryClient.setQueryData(
      ["currentMerkleTreeRootVersion"],
      currentTreeRoot?.tree_version
    );
    setShowGenerateCredentials(true);
  };

  return (
    <>
      <GroupItemContainer>
        <GroupInfo>
          <GroupName>{group.name}</GroupName>
          <ContractAddress>{group.erc721_contract_address}</ContractAddress>
        </GroupInfo>
        <GroupActions>
          {isLoading ? (
            <MiniSpinner />
          ) : (
            !hasCommitment && (
              <GenerateButton onClick={handleGenerateCredentials}>
                Generate Credentials
              </GenerateButton>
            )
          )}
          <CustomButtonIcon
            tooltipText="Leave group"
            icon={RiDeleteBack2Fill}
            hoverColor="var(--color-red-500)"
          />
        </GroupActions>
      </GroupItemContainer>

      {showGenerateCredentials && (
        <GenerateCredentialsOverlay
          group={group}
          onClose={() => setShowGenerateCredentials(false)}
        />
      )}
    </>
  );
}

export default GroupItem;
