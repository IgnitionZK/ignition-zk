import { useNavigate } from "react-router-dom";
import { RiDeleteBack2Fill } from "react-icons/ri";
import styled from "styled-components";
import { useCheckCommitment } from "../hooks/queries/groupMembers/useCheckCommitment";
import MiniSpinner from "./MiniSpinner";
import { useQueryClient } from "@tanstack/react-query";
import { useGetActiveMerkleTreeRoot } from "../hooks/queries/merkleTreeRoots/useGetActiveMerkleTreeRoot";

const GroupItem = styled.li`
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

const DeleteButton = styled.div`
  position: relative;
  cursor: pointer;

  svg {
    color: var(--color-grey-100);
    font-size: 2rem;
    transition: color 0.2s ease-in-out;
  }

  &:hover {
    svg {
      color: var(--color-red-500);
    }
  }
`;

const Tooltip = styled.div`
  position: absolute;
  right: 0;
  top: -3rem;
  background-color: var(--color-grey-800);
  color: var(--color-grey-100);
  padding: 0.8rem 1.2rem;
  border-radius: 0.4rem;
  font-size: 1.4rem;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease-in-out;
  white-space: nowrap;

  ${DeleteButton}:hover & {
    opacity: 1;
    visibility: visible;
  }

  &::after {
    content: "";
    position: absolute;
    bottom: -0.5rem;
    right: 1rem;
    border-width: 0.5rem;
    border-style: solid;
    border-color: var(--color-grey-800) transparent transparent transparent;
  }
`;

/**
 * Renders a single group item in the dashboard, displaying group information and actions.
 * Allows users to generate credentials if they haven't committed yet, and provides the ability to leave the group.
 */
function GroupItemComponent({ group, groupMemberId, groupId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasCommitment, isLoading, error } = useCheckCommitment({
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
    navigate(`/dashboard/generate-credentials`);
  };

  return (
    <GroupItem>
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
        <DeleteButton>
          <RiDeleteBack2Fill />
          <Tooltip>Leave group</Tooltip>
        </DeleteButton>
      </GroupActions>
    </GroupItem>
  );
}

export default GroupItemComponent;
