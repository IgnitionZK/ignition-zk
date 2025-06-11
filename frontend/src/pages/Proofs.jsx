import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useQueryClient } from "@tanstack/react-query";
import { ethers } from "ethers";

// icon
import { MdAddCircle } from "react-icons/md";

// components
import PageHeader from "../components/PageHeader";
import CustomButtonIcon from "../components/CustomButtonIcon";
import ProposalItem from "../components/ProposalItem";
import DummyMembershipItem from "../components/DummyMembershipItem";
// hooks
import { useGetLeavesByGroupId } from "../hooks/queries/merkleTreeLeaves/useGetLeavesByGroupId";
import { useInsertProof } from "../hooks/queries/proofs/useInsertProof";
import { useGetGroupMemberId } from "../hooks/queries/groupMembers/useGetGroupMemberId";
// import scripts
import { ZKProofGenerator } from "../scripts/generateZKProof-browser-safe";

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3.2rem;
  flex: 1;
  min-height: 100%;
  min-width: 55rem;
  color: var(--color-grey-100);
  padding: 0 2rem;
  overflow: hidden;
`;

const ProofHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.6rem;
`;

const Section = styled.div`
  margin-bottom: 3.2rem;
`;

const SectionTitle = styled.h2`
  font-size: 2rem;
  font-weight: 500;
  margin-bottom: 1.6rem;
  color: var(--color-grey-100);
`;

const ActivityList = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
`;

const IconContainer = styled.div`
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  margin-right: 8px;
`;

// Modal styles (adapted from MnemonicDisplay)
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: #3a4353;
  border-radius: 12px;
  padding: 32px 24px 24px 24px;
  min-width: 340px;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
`;

const ModalTitle = styled.h2`
  color: #fff;
  font-size: 2.6rem;
  font-weight: 700;
  margin-bottom: 24px;
  text-align: center;
  text-decoration: underline;
  letter-spacing: 0.5px;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 18px;
  right: 18px;
  background: none;
  border: none;
  color: #ffb3b3;
  font-size: 2rem;
  cursor: pointer;
`;

const ItemList = styled.ul`
  list-style: none;
  width: 100%;
  padding: 0;
  margin: 0 0 32px 0;
  max-height: 250px;
  overflow-y: auto;
`;

const Item = styled.li`
  background: ${({ selected }) => (selected ? "#444b5e" : "transparent")};
  color: #fff;
  font-size: 2rem;
  font-weight: 600;
  padding: 10px 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  transition: background 0.2s;
  &:hover {
    background: ${({ disabled }) => (disabled ? "inherit" : "#444b5e")};
  }
`;

const SelectButton = styled.button`
  width: 200px;
  padding: 12px 0;
  border-radius: 12px;
  background: #7b88b6;
  color: #232328;
  font-size: 1.4rem;
  font-weight: 600;
  border: none;
  margin-top: 32px;
  cursor: pointer;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
`;

export default function Proofs() {
  const [showModal, setShowModal] = useState(false);
  const [showMnemonicModal, setShowMnemonicModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [mnemonicString, setMnemonicString] = useState(''); 
  const [inputValue, setInputValue] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const items = [
    "Proposal1",
    "Proposal2",
    "Proposal3",
    "Proposal4",
    "Proposal5",
    "Proposal6",
  ];
  console.log(selected);

  const queryClient = useQueryClient();
  const groupId = queryClient.getQueryData(["currentGroupId"]);
  
  const { isLoading: isLoadingGroupMemberId, groupMemberId } = useGetGroupMemberId({ groupId });
  const { isLoading: isLoadingGroupCommitments, groupCommitments, error } = useGetLeavesByGroupId();
  const { insertProof, isLoading: isLoadingInsertProof, error: insertProofError } = useInsertProof();
  console.log("group member id:", groupMemberId, "groupCommitments", groupCommitments );

  async function getContract() {
    if (!window.ethereum) {
      throw new Error("MetaMask not detected");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const contractAddress = "0xaeDE5a1376B914F3F6c2B1999d7A322627088496"
    const contractABI = [{"inputs":[{"internalType":"uint256[24]","name":"_proof","type":"uint256[24]"},{"internalType":"uint256[2]","name":"_pubSignals","type":"uint256[2]"}],"name":"verifyProof","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}];
    return new ethers.Contract(contractAddress, contractABI, signer);
  }


  useEffect(() => {
    if (!mnemonicString) {
      setShowMnemonicModal(true);
    }
  }, [mnemonicString, groupId]);

  const handleMnemonicSubmit = () => {
    const submittedMnemonic = inputValue.trim();
    if (submittedMnemonic.split(/\s+/).length === 12) {
      setMnemonicString(submittedMnemonic);
      setShowMnemonicModal(false);
    } else {
      alert("Please enter a valid mnemonic (12 words)");
    }
  };

  // When the user logs out or closes the tab, this state is automatically cleared.
  const clearMnemonic = () => {
    setMnemonicString('');
  };

  // runs once when the component mounts
  // returns a cleanup function that runs when the component unmounts.
  useEffect(() => {
    return () => {
      clearMnemonic(); 
    };
  }, []);

  
  const handleInputChange = (e) => {
    const normalized = e.target.value.replace(/\s+/g, ' ');
    setInputValue(normalized);
    setWordCount(normalized === '' ? 0 : normalized.split(' ').length);
  };

  const handleSubmitMembershipProof = async () => {

    setIsSubmitting(true);
    setSubmissionSuccess(false);

    try {
      console.log("Creating membership proof...");
      const commitmentArray = await ZKProofGenerator.getCommitmentArray(groupCommitments);
      
      const circuitInput = await ZKProofGenerator.generateCircuitInput(
        mnemonicString,
        commitmentArray
      );
        
      const { proof, publicSignals } = await ZKProofGenerator.generateProof(
        circuitInput,
        "membership"
      );

      console.log("Proof generated successfully:", proof);
      console.log("Public signals:", publicSignals);

     const {
        proofSolidity,
        publicSignalsSolidity
      } = await ZKProofGenerator.generateSolidityCalldata(proof, publicSignals);
      console.log("Proof for Solidity:", proofSolidity);
      console.log("Public signals for Solidity:", publicSignalsSolidity);

      const contract = await getContract();
      console.log("Verifying proof on-chain...");
      const isValidProofOnChain = await ZKProofGenerator.verifyProofOnChain(
        proofSolidity,
        publicSignalsSolidity,
        contract
      );
      console.log(`Proof valid on-chain for groupId ${groupId}:`, isValidProofOnChain);
  
      console.log("Verifying proof off-chain...");
      const isValidProof = await ZKProofGenerator.verifyProofOffChain(
        proof,
        publicSignals,
        "membership"
      );

      console.log(`Proof valid for groupId ${groupId}:`, isValidProof);

      try {
        console.log("Inserting membership proof...")
        await insertProof({
        groupMemberId,
        groupId,
        circuitType: "membership",
        nullifierHash: circuitInput.identityNullifier,
        proof,
        publicSignals
        });

        console.log("Proof inserted into database successfully.");
        setSubmissionSuccess(true);
        
      } catch (error) {
        throw new Error("Failed to insert proof into database");
      }
 
    } catch (error) {
      console.error("Error generating or verifying proof:", error);
      alert("An error occurred while generating the proof. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
    
  }
  
  
  return (
    <PageContainer>
      {mnemonicString ? (
        <>
          <PageHeader title="" />
          <Section>
            <DummyMembershipItem
              name={
                isSubmitting
                  ? "Submitting..."
                  : submissionSuccess
                  ? "✅ Proof Submitted!"
                  : "Submit Membership Proof"
              }
              onClick={handleSubmitMembershipProof}
              disabled={isSubmitting}
            />
          </Section>
          <Section>
            <ProofHeader>
              <SectionTitle>Pending</SectionTitle>
              <CustomButtonIcon
                icon={MdAddCircle}
                tooltipText="Create new proof"
                iconProps={{ size: 36 }}
                hoverColor="#818cf8"
                onClick={() => setShowModal(true)}
              />
            </ProofHeader>
            <ProposalItem name={"Proposal1 - Vote"} />
            <ProposalItem name={"Proposal2 - Vote"} />
            <ProposalItem name={"Proposal3 - Vote"} />
            <ProposalItem name={"Proposal4 - Vote"} />
          </Section>
          <Section>
            <SectionTitle>Activity History</SectionTitle>
          </Section>
        </>
      ) : null}

      {showMnemonicModal && (
        <Overlay onClick={(e) => e.stopPropagation()}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Enter Mnemonic</ModalTitle>
            <CloseButton onClick={() => setShowMnemonicModal(false)}>×</CloseButton>
            <textarea
              style={{
                width: "100%",
                minHeight: "100px",
                marginBottom: "16px",
                padding: "8px",
                borderRadius: "8px",
                fontSize: "1.4rem",
              }}
              value={inputValue}
              onChange={handleInputChange}//{(e) => setInputValue(e.target.value)}
              placeholder="Enter your 12 word mnemonic phrase"
            />
            <p>Words: {wordCount} / 12 {wordCount === 12 ? "✅" : "❌"}</p>
            <SelectButton 
              onClick={handleMnemonicSubmit}
              disabled={wordCount !== 12}>
                Submit
            </SelectButton>
          </Modal>
        </Overlay>
      )}
    </PageContainer>
  );}
