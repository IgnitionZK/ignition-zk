import React, { useState } from "react";

// components
import styled from "styled-components";
import PageHeader from "../components/PageHeader";
import CustomButton from "../components/CustomButton";
import CustomButtonIcon from "../components/CustomButtonIcon";

// hooks
import { useInsertNewGroup } from "../hooks/queries/groups/useInsertNewGroup";
import { useRelayerDeployERC721 } from "../hooks/relayers/useRelayerDeployERC721";
import { useInsertERC721ContractAddress } from "../hooks/queries/groups/useInsertERC721ContractAddress";

// icons
import { IoIosInformationCircle } from "react-icons/io";
import { FaCirclePlus } from "react-icons/fa6";
import { FaCircleMinus } from "react-icons/fa6";

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

const MemberList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  margin-top: 0.8rem;
  margin-bottom: 1.6rem;
`;

const MemberItem = styled.li`
  color: var(--color-grey-200);
  font-size: 1.2rem;
  background: rgba(165, 180, 252, 0.07);
  border-radius: 0.6rem;
  padding: 0.6rem 1.2rem;
  margin-bottom: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Note = styled.p`
  font-size: 1.1rem;
  color: var(--color-grey-400);
  margin-top: 0.2rem;
  margin-bottom: 1.6rem;
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

// Utility function to validate Ethereum address
const isValidEthAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);

export default function CreateGroup({ onCancel }) {
  const [groupName, setGroupName] = useState("");
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [memberInputs, setMemberInputs] = useState([]);
  const [touched, setTouched] = useState([]);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Hook for inserting new group
  const { insertNewGroup, isLoading } = useInsertNewGroup();

  // Hook for deploying ERC721 contract
  const { deployERC721 } = useRelayerDeployERC721();

  // Hook for inserting ERC721 contract address
  const { insertERC721ContractAddress } = useInsertERC721ContractAddress();

  // Add a new empty member input row
  const handleAddMemberInput = () => {
    setMemberInputs((prev) => [...prev, ""]);
    setTouched((prev) => [...prev, false]);
  };

  // Remove a member input row by index
  const handleRemoveMemberInput = (idx) => {
    setMemberInputs((prev) => prev.filter((_, i) => i !== idx));
    setTouched((prev) => prev.filter((_, i) => i !== idx));
  };

  // Update the value of a member input row
  const handleChangeMemberInput = (idx, value) => {
    setMemberInputs((prev) => prev.map((v, i) => (i === idx ? value : v)));
    setTouched((prev) => prev.map((v, i) => (i === idx ? true : v)));
  };

  // Field validation for group name, token name, token symbol
  const groupNameError =
    formSubmitted && groupName.trim() === "" ? "Group name is required" : null;
  const tokenNameError =
    formSubmitted && tokenName.trim() === "" ? "Token name is required" : null;
  let tokenSymbolError = null;
  if (formSubmitted) {
    if (tokenSymbol.trim() === "") {
      tokenSymbolError = "Token symbol is required";
    } else if (!/^[A-Z0-9]{1,4}$/.test(tokenSymbol)) {
      tokenSymbolError =
        "Token symbol must be 1-4 characters, A-Z and 0-9 only";
    }
  }
  const hasFieldErrors = !!(
    groupNameError ||
    tokenNameError ||
    tokenSymbolError
  );

  // Validation logic
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
  const hasErrors = memberInputErrors.some((err) => err !== null);

  // Handle create button click
  const handleCreate = (e) => {
    e.preventDefault();
    setFormSubmitted(true);
    if (
      groupName.trim() === "" ||
      tokenName.trim() === "" ||
      tokenSymbol.trim() === "" ||
      hasErrors
    ) {
      return;
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
                        // You can add additional logic here, such as:
                        // - Redirecting to the new group page
                        // - Showing a success message
                        // - Resetting the form
                      },
                      onError: (error) => {
                        console.error(
                          "Failed to save contract address to database:",
                          error
                        );
                        // You can add error handling here, such as:
                        // - Showing an error message to the user
                      },
                    }
                  );
                } else {
                  console.warn(
                    "No deployed NFT address found in response:",
                    deployedData
                  );
                }
              },
              onError: (error) => {
                console.error("Failed to deploy ERC721 contract:", error);
                // You can add error handling here, such as:
                // - Showing an error message to the user
              },
            }
          );
        },
        onError: (error) => {
          console.error("Failed to create group:", error);
          // You can add error handling here, such as:
          // - Showing an error message to the user
        },
      }
    );
  };

  return (
    <PageContainer>
      <PageHeader title="Create New Group" />
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
          <span style={{ fontStyle: "italic", color: "var(--color-grey-400)" }}>
            Note: The group name and ERC721 contract name must be unique across
            the system.
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
          onChange={(e) => setGroupName(e.target.value)}
          style={{ borderColor: groupNameError ? "#f87171" : undefined }}
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
              Define the new ERC721 token contract that will act as the gate for
              membership. The contract will be deployed for you automatically
              based on this information. This cannot be changed.
            </Tooltip>
          </InfoIconWrapper>
        </SectionTitle>
        <Label>
          Token Name
          <InfoIconWrapper>
            <InfoIcon />
            <Tooltip>
              This is the name of the ERC721 contract that will be deployed for
              the group (e.g., "ContributorAccess"). It must be unique across
              all deployed ERC721s.
            </Tooltip>
          </InfoIconWrapper>
        </Label>
        <Input
          type="text"
          placeholder="Enter token name"
          value={tokenName}
          onChange={(e) => setTokenName(e.target.value)}
          style={{ borderColor: tokenNameError ? "#f87171" : undefined }}
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
          onChange={(e) => setTokenSymbol(e.target.value)}
          style={{ borderColor: tokenSymbolError ? "#f87171" : undefined }}
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
      </FormSection>
      <FormSection>
        <SectionHeaderRow>
          <SectionTitle style={{ marginBottom: 0 }}>
            Add Members
            <InfoIconWrapper>
              <InfoIcon />
              <Tooltip>
                Membership is validated by NFT ownership. As the creator, you'll
                receive a credential and be included in the group automatically.
              </Tooltip>
            </InfoIconWrapper>
          </SectionTitle>
          <CustomButtonIcon
            icon={FaCirclePlus}
            tooltipText="Add member row"
            onClick={handleAddMemberInput}
            hoverColor="#a5b4fc"
            iconProps={{ style: { fontSize: "2.2rem" } }}
          />
        </SectionHeaderRow>
        <Note>
          Members must hold one of the ERC721 tokens to be eligible. By adding
          their addresses here they will be granted a token. Once the group has
          been created added members simply log into their account and connect
          their wallet using the address entered here. They will then search for
          the newly created group and click the join button. They will be
          prompted to generate their credentials to complete the enrollment.
        </Note>
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
                }}
              />
              <CustomButtonIcon
                icon={FaCircleMinus}
                tooltipText="Remove row"
                onClick={() => handleRemoveMemberInput(idx)}
                hoverColor="#f87171"
                iconProps={{ style: { fontSize: "2.2rem" } }}
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
            </AddMemberRow>
          );
        })}
      </FormSection>
      <ButtonRow>
        <CustomButton
          backgroundColor="#a5b4fc"
          textColor="#232328"
          hoverColor="#818cf8"
          disabled={hasErrors || hasFieldErrors || isLoading}
          onClick={handleCreate}
        >
          {isLoading ? "Creating..." : "Create"}
        </CustomButton>
        <CustomButton
          backgroundColor="var(--color-red-300)"
          textColor="#232328"
          hoverColor="var(--color-red-400)"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </CustomButton>
      </ButtonRow>
    </PageContainer>
  );
}
