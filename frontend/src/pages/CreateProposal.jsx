import React, { useState, useMemo, useRef } from "react";
import styled from "styled-components";

// components
import PageHeader from "../components/PageHeader";
import CustomDropdown from "../components/CustomDropdown";
import CustomButton from "../components/CustomButton";
import MnemonicInput from "../components/MnemonicInput";
import ConfirmationModal from "../components/ConfirmationModal";

// hooks
import { useGetUserGroups } from "../hooks/queries/groupMembers/useGetUserGroups";
import { useGetEpochsByGroupId } from "../hooks/queries/epochs/useGetEpochsByGroupId";
import { useVerifyProposal } from "../hooks/queries/proofs/useVerifyProposal";
import { useGetCommitmentArray } from "../hooks/queries/merkleTreeLeaves/useGetCommitmentArray";

// utils
import { getCurrentPhase } from "../utils/epochPhaseCalculator";
import { uploadFile } from "../scripts/uploadFile";

// icons
import { IoIosInformationCircle } from "react-icons/io";
import { IoCloudUploadOutline } from "react-icons/io5";
import { IoClose } from "react-icons/io5";

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3.2rem;
  flex: 1;
  min-height: 100vh;
  min-width: 60rem;
  color: var(--color-grey-100);
  padding: 0 2rem;
  box-sizing: border-box;
  overflow-x: hidden;
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

const FormField = styled.div`
  margin-bottom: 1.6rem;
`;

const Input = styled.input`
  background: #232328;
  border: 1px solid rgba(165, 180, 252, 0.2);
  border-radius: 0.8rem;
  color: #fff;
  padding: 0.9rem 1.2rem;
  font-size: 1.3rem;
  width: 100%;
  transition: all 0.2s ease-in-out;

  &::placeholder {
    color: var(--color-grey-400);
  }
  &:focus {
    outline: none;
    border-color: #a5b4fc;
    background: rgba(165, 180, 252, 0.08);
  }

  /* Remove increment/decrement arrows for number inputs */
  &[type="number"]::-webkit-outer-spin-button,
  &[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type="number"] {
    -moz-appearance: textfield;
  }
`;

const TextArea = styled.textarea`
  background: #232328;
  border: 1px solid rgba(165, 180, 252, 0.2);
  border-radius: 0.8rem;
  color: #fff;
  padding: 0.9rem 1.2rem;
  font-size: 1.3rem;
  width: 100%;
  min-height: 12rem;
  resize: vertical;
  font-family: inherit;
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

const InstructionsText = styled.p`
  color: var(--color-grey-200);
  font-size: 1.15rem;
  margin-bottom: 1.2rem;
  line-height: 1.6;
`;

const InstructionsList = styled.ol`
  list-style: decimal;
  padding-left: 2rem;
  color: var(--color-grey-200);
  font-size: 1.15rem;
  line-height: 1.6;
  margin-bottom: 1.2rem;
`;

const InstructionItem = styled.li`
  margin-bottom: 0.8rem;

  &.warning {
    color: var(--color-red-400);
    font-weight: 500;
  }
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

const FormRow = styled.div`
  display: flex;
  gap: 1.6rem;
  align-items: flex-start;
`;

const FormFieldRow = styled.div`
  display: flex;
  gap: 1.6rem;
  align-items: flex-start;
  flex: 1;
`;

const UploadSection = styled.div`
  display: flex;
  gap: 2.4rem;
  align-items: flex-start;
  flex-wrap: wrap;
`;

const FormFieldsColumn = styled.div`
  display: flex;
  gap: 1.6rem;
  flex: 1;
  flex-wrap: wrap;
  min-width: 0;
`;

const UploadColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  min-width: 280px;
  flex: 1;
`;

const UploadArea = styled.div`
  border: 2px dashed rgba(165, 180, 252, 0.3);
  border-radius: 0.8rem;
  padding: 2.4rem;
  text-align: center;
  background: rgba(165, 180, 252, 0.02);
  transition: all 0.2s ease-in-out;
  cursor: pointer;

  &:hover {
    border-color: rgba(165, 180, 252, 0.5);
    background: rgba(165, 180, 252, 0.05);
  }

  &.drag-over {
    border-color: #a5b4fc;
    background: rgba(165, 180, 252, 0.1);
  }

  &.error {
    border-color: var(--color-red-400);
    background: rgba(239, 68, 68, 0.05);
  }
`;

const UploadIcon = styled(IoCloudUploadOutline)`
  font-size: 3.2rem;
  color: #a5b4fc;
  margin-bottom: 1.2rem;
`;

const UploadText = styled.p`
  color: var(--color-grey-200);
  font-size: 1.4rem;
  margin-bottom: 0.8rem;
`;

const UploadSubtext = styled.p`
  color: var(--color-grey-400);
  font-size: 1.2rem;
  margin-bottom: 1.6rem;
`;

const BrowseLink = styled.span`
  color: #a5b4fc;
  text-decoration: underline;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    color: #818cf8;
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const UploadedFileSection = styled.div`
  background: rgba(165, 180, 252, 0.05);
  border: 1px solid rgba(165, 180, 252, 0.1);
  border-radius: 0.8rem;
  padding: 1.6rem;
`;

const UploadedFileTitle = styled.h4`
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--color-grey-100);
  margin-bottom: 1.2rem;
`;

const UploadedFileItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.2rem;
  background: rgba(165, 180, 252, 0.08);
  border-radius: 0.6rem;
  border: 1px solid rgba(165, 180, 252, 0.15);
`;

const FileInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
`;

const FileName = styled.span`
  font-size: 1.3rem;
  font-weight: 500;
  color: var(--color-grey-100);
`;

const FileSize = styled.span`
  font-size: 1.1rem;
  color: var(--color-grey-300);
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: var(--color-red-400);
  cursor: pointer;
  padding: 0.4rem;
  border-radius: 0.4rem;
  transition: all 0.2s ease-in-out;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 1.6rem;
  justify-content: center;
  margin-top: 2.4rem;
`;

const ErrorMessage = styled.div`
  color: var(--color-red-400);
  font-size: 1.2rem;
  margin-top: 0.4rem;
  font-weight: 500;
`;

export default function CreateProposal() {
  // Form state
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [proposalName, setProposalName] = useState("");
  const [description, setDescription] = useState("");
  const [proposalType, setProposalType] = useState("Funding Request");
  const [amount, setAmount] = useState("");
  const [currencyType, setCurrencyType] = useState("USDC");
  const [fundingType, setFundingType] = useState("Lump sum payment");

  // File upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Validation state
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Modal state
  const [showMnemonicInput, setShowMnemonicInput] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  // File input ref
  const fileInputRef = useRef(null);

  // Get user groups
  const {
    userGroups,
    isLoading: isLoadingGroups,
    error: groupsError,
  } = useGetUserGroups();

  // Get the selected group object to access group_id
  const selectedGroupObject = useMemo(() => {
    if (!userGroups || !selectedGroup) return null;
    return userGroups.find((group) => group.name === selectedGroup);
  }, [userGroups, selectedGroup]);

  // Get campaigns (epochs) for the selected group
  const {
    epochs: campaigns,
    isLoading: isLoadingCampaigns,
    error: campaignsError,
  } = useGetEpochsByGroupId(selectedGroupObject?.group_id);

  // Get commitment array for the selected group
  const { commitmentArray, isLoading: isLoadingCommitments } =
    useGetCommitmentArray({
      groupId: selectedGroupObject?.group_id,
    });

  // Get proposal verification hook
  const { verifyProposal, isVerifying } = useVerifyProposal();

  // Group options for dropdown
  const groupOptions = useMemo(() => {
    if (!userGroups) return [];
    return userGroups.map((group) => group.name);
  }, [userGroups]);

  // Campaign options for dropdown with phase information
  const campaignOptions = useMemo(() => {
    if (!campaigns) return [];

    return campaigns.map((campaign) => {
      try {
        const currentPhase = getCurrentPhase(campaign);
        const isInProposalPhase = currentPhase.currentPhase === "proposal";

        return {
          name: campaign.epoch_name,
          id: campaign.epoch_id,
          isInProposalPhase,
          currentPhase: currentPhase.currentPhase,
          phaseName: currentPhase.phaseName,
        };
      } catch (error) {
        console.error("Error checking campaign phase:", error);
        return {
          name: campaign.epoch_name,
          id: campaign.epoch_id,
          isInProposalPhase: false,
          currentPhase: "error",
          phaseName: "Error",
        };
      }
    });
  }, [campaigns]);

  // Proposal type options
  const proposalTypeOptions = [
    "Funding Request",
    "Governance",
    "Technical",
    "Other",
  ];

  // Currency type options
  const currencyTypeOptions = ["ETH", "USDC", "BTC"];

  // Funding type options
  const fundingTypeOptions = ["Lump sum payment"];

  // File validation constants
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ACCEPTED_FILE_TYPES = [".pdf", ".docx", ".txt"];

  // File validation functions
  const validateFile = (file) => {
    if (!file) return "Please select a file";

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }

    // Check file type
    const fileExtension = "." + file.name.split(".").pop().toLowerCase();
    if (!ACCEPTED_FILE_TYPES.includes(fileExtension)) {
      return `File type not supported. Please upload ${ACCEPTED_FILE_TYPES.join(
        ", "
      )} files`;
    }

    return "";
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Validation functions
  const validateField = (name, value) => {
    switch (name) {
      case "selectedGroup":
        return !value ? "Please select a group" : "";
      case "selectedCampaign":
        return !value ? "Please select a campaign" : "";
      case "proposalName":
        return !value ? "Proposal name is required" : "";
      case "description":
        return !value ? "Description is required" : "";
      case "amount":
        if (!value) return "Amount is required";
        if (!/^\d+$/.test(value)) return "Amount must be a positive integer";
        if (parseInt(value) <= 0) return "Amount must be greater than 0";
        return "";
      case "uploadedFile":
        return !value ? "Please upload a proposal document" : "";
      default:
        return "";
    }
  };

  const handleFieldChange = (name, value) => {
    // Update the field value
    switch (name) {
      case "selectedGroup":
        setSelectedGroup(value);
        // Reset campaign when group changes
        setSelectedCampaign("");
        break;
      case "selectedCampaign":
        setSelectedCampaign(value);
        break;
      case "proposalName":
        setProposalName(value);
        break;
      case "description":
        setDescription(value);
        break;
      case "proposalType":
        setProposalType(value);
        break;
      case "amount":
        setAmount(value);
        break;
      case "currencyType":
        setCurrencyType(value);
        break;
      case "fundingType":
        setFundingType(value);
        break;
    }

    // Validate and update errors
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  const handleFieldBlur = (name) => {
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));

    const value = {
      selectedGroup,
      selectedCampaign,
      proposalName,
      description,
      amount,
    }[name];

    const error = validateField(name, value);
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Mark all fields as touched
    const allFields = [
      "selectedGroup",
      "selectedCampaign",
      "proposalName",
      "description",
      "amount",
      "uploadedFile",
    ];
    const newTouched = {};
    const newErrors = {};

    allFields.forEach((field) => {
      newTouched[field] = true;
      const value = {
        selectedGroup,
        selectedCampaign,
        proposalName,
        description,
        amount,
        uploadedFile,
      }[field];
      newErrors[field] = validateField(field, value);
    });

    setTouched(newTouched);
    setErrors(newErrors);

    // Check if there are any errors
    const hasErrors = Object.values(newErrors).some((error) => error);
    if (hasErrors) {
      return;
    }

    // Show confirmation modal before proceeding to mnemonic input
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = () => {
    setShowSubmitConfirm(false);
    setShowMnemonicInput(true);
  };

  const handleCancelSubmit = () => {
    setShowSubmitConfirm(false);
  };

  const handleSubmitMnemonic = async (mnemonic) => {
    setShowMnemonicInput(false);
    setIsSubmitting(true);
    setUploadProgress("");

    try {
      // Upload file to IPFS if a file was selected
      let ipfsCid = null;
      if (uploadedFile) {
        setUploadProgress("Uploading file to IPFS...");
        console.log("Uploading file to IPFS:", uploadedFile.name);
        try {
          ipfsCid = await uploadFile(uploadedFile);
          console.log("File uploaded successfully. IPFS CID:", ipfsCid);
          setUploadProgress("File uploaded successfully!");
        } catch (uploadError) {
          console.error("File upload failed:", uploadError);
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }
      }

      setUploadProgress("Creating proposal...");

      // Create the proposal object with the IPFS CID
      const proposalData = {
        title: proposalName,
        description,
        funding: {
          type: fundingType.toLowerCase().replace(" ", ""),
          amount,
          currency: currencyType,
        },
        metadata: {
          ipfs_cid: ipfsCid,
        },
        payload: {
          target_contract: "0xGovernanceContractAddress", // This would be dynamic
          target_function: "executeProposal",
          target_action: "delegateDistributeGrant",
          value: "0",
          calldata: {
            recipient: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", // This would be dynamic
            amount,
          },
        },
      };

      console.log("Creating proposal with data:", proposalData);
      console.log("Mnemonic provided:", mnemonic);
      console.log("Selected group:", selectedGroup);
      console.log("Selected campaign:", selectedCampaign);

      // Validate required data
      if (!selectedGroupObject?.group_id) {
        throw new Error("No group ID available");
      }

      if (!selectedCampaign) {
        throw new Error("No campaign selected");
      }

      if (!commitmentArray) {
        throw new Error("Commitment array not loaded");
      }

      // Get the selected campaign object to access epoch_id
      const selectedCampaignObject = campaigns?.find(
        (campaign) => campaign.epoch_name === selectedCampaign
      );

      if (!selectedCampaignObject?.epoch_id) {
        throw new Error("No epoch ID available");
      }

      setUploadProgress("Generating zero-knowledge proof...");

      // Verify the proposal using the ZK proof system
      const { isValid, publicSignals } = await verifyProposal(
        commitmentArray,
        mnemonic,
        selectedGroupObject.group_id,
        selectedCampaignObject.epoch_id,
        proposalData.title,
        proposalData.description,
        proposalData.payload,
        proposalData.funding,
        proposalData.metadata
      );

      if (isValid) {
        setUploadProgress("Proposal verified successfully!");
        console.log("Proposal verified successfully!");
        console.log("Public signals:", publicSignals);

        // TODO: Store the proposal in the database
        // TODO: Navigate back to proposals page or show success message

        // For now, just simulate a delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log("Proposal created and verified successfully!");
      } else {
        throw new Error("Proposal verification failed");
      }
    } catch (error) {
      console.error("Error creating proposal:", error);
      alert(`Error creating proposal: ${error.message}`);
    } finally {
      setIsSubmitting(false);
      setUploadProgress("");
    }
  };

  // File upload handlers
  const handleFileSelect = (file) => {
    setUploadError("");

    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadedFile(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleCancel = () => {
    // TODO: Navigate back to proposals page
    console.log("Cancel clicked");
  };

  if (isLoadingGroups) {
    return <div>Loading groups...</div>;
  }

  if (groupsError) {
    return <div>Error loading groups: {groupsError.message}</div>;
  }

  // Create proposal object for mnemonic modal
  const proposalForModal = {
    title: proposalName || "Untitled Proposal",
    group_name: selectedGroup || "Unknown Group",
    description: description || "No description available",
  };

  return (
    <PageContainer>
      <PageHeader title="Create Proposal" />

      <FormSection>
        <SectionTitle>Instructions</SectionTitle>
        <InstructionsText>
          Please read the following instructions carefully before creating your
          proposal:
        </InstructionsText>
        <InstructionsList>
          <InstructionItem>All fields required.</InstructionItem>
          <InstructionItem>
            Upload a single proposal document with all related materials to
            support your proposal.
            <InfoIconWrapper>
              <InfoIcon />
              <Tooltip>
                This would be a file upload feature where users can attach
                supporting documents, images, or other materials to provide
                context for their proposal.
              </Tooltip>
            </InfoIconWrapper>
          </InstructionItem>
          <InstructionItem className="warning">
            Once submitted, the proposal cannot be altered.
          </InstructionItem>
        </InstructionsList>
      </FormSection>

      <FormSection>
        <FormField>
          <Label>
            Select Group
            <InfoIconWrapper>
              <InfoIcon />
              <Tooltip>
                Choose the group for which you want to create this proposal. You
                can only create proposals for groups you are a member of.
              </Tooltip>
            </InfoIconWrapper>
          </Label>
          <CustomDropdown
            options={groupOptions}
            selectedOption={selectedGroup}
            onSelect={(value) => handleFieldChange("selectedGroup", value)}
            placeholder="-"
            fullWidth={true}
          />
          {isLoadingCampaigns && selectedGroup && (
            <div
              style={{
                color: "var(--color-grey-400)",
                fontSize: "1.2rem",
                marginTop: "0.4rem",
              }}
            >
              Loading campaigns...
            </div>
          )}
          {campaignsError && (
            <div
              style={{
                color: "var(--color-red-400)",
                fontSize: "1.2rem",
                marginTop: "0.4rem",
              }}
            >
              Error loading campaigns: {campaignsError.message}
            </div>
          )}
          {touched.selectedGroup && errors.selectedGroup && (
            <ErrorMessage>{errors.selectedGroup}</ErrorMessage>
          )}
        </FormField>

        <FormField>
          <Label>
            Select Campaign
            <InfoIconWrapper>
              <InfoIcon />
              <Tooltip>
                Choose the campaign (epoch) for which you want to create this
                proposal. Only campaigns in the proposal phase will be
                selectable. Other campaigns will be shown in red and cannot be
                selected.
              </Tooltip>
            </InfoIconWrapper>
          </Label>
          <CustomDropdown
            options={campaignOptions}
            selectedOption={selectedCampaign}
            onSelect={(value) => handleFieldChange("selectedCampaign", value)}
            placeholder={
              campaignOptions.length === 0 ? "No campaigns available" : "-"
            }
            fullWidth={true}
            showStatus={true}
          />
          {touched.selectedCampaign && errors.selectedCampaign && (
            <ErrorMessage>{errors.selectedCampaign}</ErrorMessage>
          )}
        </FormField>

        <FormField>
          <Label>
            Proposal Name
            <InfoIconWrapper>
              <InfoIcon />
              <Tooltip>
                Enter a descriptive name for your proposal (max 50 characters).
                This will be displayed to all group members and cannot be
                changed after submission.
              </Tooltip>
            </InfoIconWrapper>
          </Label>
          <Input
            type="text"
            value={proposalName}
            onChange={(e) => handleFieldChange("proposalName", e.target.value)}
            onBlur={() => handleFieldBlur("proposalName")}
            placeholder="Enter proposal name"
            maxLength={50}
            required
          />
          {touched.proposalName && errors.proposalName && (
            <ErrorMessage>{errors.proposalName}</ErrorMessage>
          )}
        </FormField>

        <FormField>
          <Label>
            Description
            <InfoIconWrapper>
              <InfoIcon />
              <Tooltip>
                Provide a detailed description of your proposal (max 250
                characters). Include the purpose, benefits, and any relevant
                details that will help members understand your proposal.
              </Tooltip>
            </InfoIconWrapper>
          </Label>
          <TextArea
            value={description}
            onChange={(e) => handleFieldChange("description", e.target.value)}
            onBlur={() => handleFieldBlur("description")}
            placeholder="Enter proposal description"
            maxLength={250}
            required
          />
          {touched.description && errors.description && (
            <ErrorMessage>{errors.description}</ErrorMessage>
          )}
        </FormField>

        <UploadSection>
          <FormFieldsColumn>
            <FormField>
              <Label>
                Proposal Type
                <InfoIconWrapper>
                  <InfoIcon />
                  <Tooltip>
                    Select the type of proposal you are creating. This helps
                    categorize and organize proposals within the group.
                  </Tooltip>
                </InfoIconWrapper>
              </Label>
              <CustomDropdown
                options={proposalTypeOptions}
                selectedOption={proposalType}
                onSelect={(value) => handleFieldChange("proposalType", value)}
                placeholder="-"
              />
            </FormField>

            <FormField>
              <Label>
                Amount
                <InfoIconWrapper>
                  <InfoIcon />
                  <Tooltip>
                    Enter the funding amount requested. This should be a
                    positive integer representing the total amount needed for
                    your proposal.
                  </Tooltip>
                </InfoIconWrapper>
              </Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => handleFieldChange("amount", e.target.value)}
                onBlur={() => handleFieldBlur("amount")}
                placeholder="Enter amount"
                min="1"
                step="1"
                required
              />
              {touched.amount && errors.amount && (
                <ErrorMessage>{errors.amount}</ErrorMessage>
              )}
            </FormField>

            <FormField>
              <Label>
                Currency Type
                <InfoIconWrapper>
                  <InfoIcon />
                  <Tooltip>
                    Select the currency for the funding amount. This determines
                    which cryptocurrency will be used for the proposal.
                  </Tooltip>
                </InfoIconWrapper>
              </Label>
              <CustomDropdown
                options={currencyTypeOptions}
                selectedOption={currencyType}
                onSelect={(value) => handleFieldChange("currencyType", value)}
                placeholder="-"
              />
            </FormField>

            <FormField>
              <Label>
                Funding Type
                <InfoIconWrapper>
                  <InfoIcon />
                  <Tooltip>
                    Select how the funding will be distributed. Currently only
                    lump sum payments are supported.
                  </Tooltip>
                </InfoIconWrapper>
              </Label>
              <CustomDropdown
                options={fundingTypeOptions}
                selectedOption={fundingType}
                onSelect={(value) => handleFieldChange("fundingType", value)}
                placeholder="-"
              />
            </FormField>
          </FormFieldsColumn>

          <UploadColumn>
            <FormField>
              <Label>
                Proposal Document Upload
                <InfoIconWrapper>
                  <InfoIcon />
                  <Tooltip>
                    Upload a single proposal document with all related
                    materials. Supported formats: PDF, DOCX, TXT. Maximum size:
                    10MB.
                  </Tooltip>
                </InfoIconWrapper>
              </Label>

              {!uploadedFile ? (
                <UploadArea
                  className={
                    uploadError ? "error" : isDragOver ? "drag-over" : ""
                  }
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleBrowseClick}
                >
                  <UploadIcon />
                  <UploadText>Drag & Drop Files</UploadText>
                  <UploadSubtext>or</UploadSubtext>
                  <BrowseLink>Browse System Files</BrowseLink>
                  <UploadSubtext
                    style={{ marginTop: "1.2rem", marginBottom: "0" }}
                  >
                    Supported: PDF, DOCX, TXT (Max 10MB)
                  </UploadSubtext>
                </UploadArea>
              ) : (
                <UploadedFileSection>
                  <UploadedFileTitle>Uploaded</UploadedFileTitle>
                  <UploadedFileItem>
                    <FileInfo>
                      <FileName>{uploadedFile.name}</FileName>
                      <FileSize>{formatFileSize(uploadedFile.size)}</FileSize>
                    </FileInfo>
                    <RemoveButton
                      onClick={handleRemoveFile}
                      title="Remove file"
                    >
                      <IoClose size={20} />
                    </RemoveButton>
                  </UploadedFileItem>
                </UploadedFileSection>
              )}

              <HiddenFileInput
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileInputChange}
              />

              {uploadError && <ErrorMessage>{uploadError}</ErrorMessage>}
              {touched.uploadedFile && errors.uploadedFile && (
                <ErrorMessage>{errors.uploadedFile}</ErrorMessage>
              )}
            </FormField>
          </UploadColumn>
        </UploadSection>
      </FormSection>

      <ButtonRow>
        <CustomButton
          backgroundColor="#a5b4fc"
          textColor="#232328"
          hoverColor="#818cf8"
          onClick={handleSubmit}
          disabled={isSubmitting || isVerifying || isLoadingCommitments}
        >
          {isSubmitting ? uploadProgress || "Creating..." : "Create"}
        </CustomButton>
        <CustomButton
          backgroundColor="var(--color-red-300)"
          textColor="#232328"
          hoverColor="var(--color-red-400)"
          onClick={handleCancel}
          disabled={isSubmitting || isVerifying}
        >
          Cancel
        </CustomButton>
      </ButtonRow>

      {/* Mnemonic Input Modal */}
      {showMnemonicInput && (
        <MnemonicInput
          proposal={proposalForModal}
          onClose={() => setShowMnemonicInput(false)}
          onSubmit={handleSubmitMnemonic}
        />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSubmitConfirm}
        title="Create Proposal"
        message={`Are you sure you want to create the proposal "${
          proposalName || "Untitled Proposal"
        }"? This action will require your mnemonic phrase to generate a zero-knowledge proof for anonymous submission.`}
        confirmText="Continue"
        cancelText="Cancel"
        confirmButtonColor="#a5b4fc"
        confirmButtonHoverColor="#818cf8"
        cancelButtonColor="var(--color-grey-600)"
        cancelButtonHoverColor="var(--color-grey-500)"
        onConfirm={handleConfirmSubmit}
        onCancel={handleCancelSubmit}
      />
    </PageContainer>
  );
}
