import React, { useState, useMemo } from "react";
import styled from "styled-components";

// custom hooks
import { useGetEpochByUserId } from "../hooks/queries/epochs/useGetEpochByUserId";
import CustomButtonIcon from "../components/CustomButtonIcon";
import CustomDropdown from "../components/CustomDropdown";

// components
import Spinner from "../components/Spinner";
import PageHeader from "../components/PageHeader";
import EpochItem from "../components/EpochItem";
import { getCurrentPhase } from "../utils/epochPhaseCalculator";

// icon
import { FaCirclePlus } from "react-icons/fa6";
import CreateCampaign from "./CreateCampaign";

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.6rem;
`;

const SectionTitleInline = styled.h2`
  font-size: 2rem;
  font-weight: 500;
  color: var(--color-grey-100);
  margin: 0;
`;

const NoCampaignsText = styled.div`
  color: var(--color-grey-100);
  font-size: 1.6rem;
  margin-bottom: 1.2rem;
`;

const Section = styled.div`
  margin-bottom: 3.2rem;
`;

const DropdownWrapper = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1.6rem;
`;

export default function Campaigns() {
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);

  const {
    epochs,
    isLoading: isLoadingEpochs,
    error: epochsError,
  } = useGetEpochByUserId();

  // Extract unique group names
  const groupNames = useMemo(() => {
    if (!Array.isArray(epochs)) return [];
    const names = epochs.map((e) => e.groups?.name).filter(Boolean);
    return ["All Campaigns", ...Array.from(new Set(names))];
  }, [epochs]);

  // State for selected group
  const [selectedGroup, setSelectedGroup] = useState("All Campaigns");

  // Filter function
  const filterByGroup = (epoch) =>
    selectedGroup === "All Campaigns" || epoch.groups?.name === selectedGroup;

  // Separate active and completed epochs, filtered and sorted
  const activeEpochs = Array.isArray(epochs)
    ? epochs
        .filter((epoch) => getCurrentPhase(epoch).currentPhase !== "completed")
        .filter(filterByGroup)
        .sort(
          (a, b) => new Date(a.epoch_start_time) - new Date(b.epoch_start_time)
        )
    : [];
  const completedEpochs = Array.isArray(epochs)
    ? epochs
        .filter((epoch) => getCurrentPhase(epoch).currentPhase === "completed")
        .filter(filterByGroup)
        .sort(
          (a, b) => new Date(a.epoch_start_time) - new Date(b.epoch_start_time)
        )
    : [];

  // Handler to show campaigns page again
  const handleCancelCreateCampaign = () => {
    setShowCreateCampaign(false);
  };

  if (showCreateCampaign) {
    return <CreateCampaign onCancel={handleCancelCreateCampaign} />;
  }

  return (
    <>
      <PageHeader title="" />
      <Section>
        <DropdownWrapper>
          <CustomDropdown
            options={groupNames}
            selectedOption={selectedGroup}
            onSelect={setSelectedGroup}
            placeholder="Filter by group"
          />
        </DropdownWrapper>
        <SectionHeader>
          <SectionTitleInline>Campaigns</SectionTitleInline>
          <CustomButtonIcon
            icon={FaCirclePlus}
            tooltipText="Create new campaign"
            onClick={() => {
              setShowCreateCampaign(true);
            }}
          />
        </SectionHeader>
        {isLoadingEpochs && <Spinner />}
        {epochsError && <div>Error loading campaigns.</div>}
        {activeEpochs.length === 0 && !isLoadingEpochs && (
          <NoCampaignsText>No active campaigns.</NoCampaignsText>
        )}
        {activeEpochs.map((epoch) => (
          <EpochItem key={epoch.epoch_id} epoch={epoch} />
        ))}
      </Section>
      <Section>
        <SectionHeader>
          <SectionTitleInline>Campaign History</SectionTitleInline>
        </SectionHeader>
        {completedEpochs.length === 0 && !isLoadingEpochs && (
          <NoCampaignsText>No campaign history.</NoCampaignsText>
        )}
        {completedEpochs.map((epoch) => (
          <EpochItem key={epoch.epoch_id} epoch={epoch} />
        ))}
      </Section>
    </>
  );
}
