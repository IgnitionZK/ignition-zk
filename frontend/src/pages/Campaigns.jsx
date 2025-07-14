import React from "react";
import styled from "styled-components";

// custom hooks
import { useGetEpochByUserId } from "../hooks/queries/epochs/useGetEpochByUserId";
import CustomButtonIcon from "../components/CustomButtonIcon";

// components
import Spinner from "../components/Spinner";
import PageHeader from "../components/PageHeader";

// icon
import { FaCirclePlus } from "react-icons/fa6";

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

export default function Campaigns() {
  const {
    epochs,
    isLoading: isLoadingEpochs,
    error: epochsError,
  } = useGetEpochByUserId();

  console.log(epochs);

  return (
    <>
      <PageHeader title="Campaigns" />
      <SectionHeader>
        <SectionTitleInline>Active Campaigns</SectionTitleInline>
        <CustomButtonIcon
          icon={FaCirclePlus}
          tooltipText="Create new campaign"
          onClick={() => {}}
        />
      </SectionHeader>
    </>
  );
}
