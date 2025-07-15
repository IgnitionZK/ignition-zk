import React from "react";
import styled from "styled-components";
import {
  calculateEpochPhases,
  getCurrentPhase,
  formatDate,
} from "../utils/epochPhaseCalculator";
import { FaInfoCircle } from "react-icons/fa";

// Dot color logic (solid colors, ProposalItem style)
const getDotColor = (phase, currentPhase) => {
  if (phase === currentPhase) return "#22c55e"; // green
  if (
    (phase === "proposal" &&
      ["voting", "review", "completed"].includes(currentPhase)) ||
    (phase === "voting" && ["review", "completed"].includes(currentPhase)) ||
    (phase === "review" && currentPhase === "completed")
  ) {
    return "#ef4444"; // red
  }
  return "#6b7280"; // gray
};

const EpochItemContainer = styled.div`
  background-color: rgba(165, 180, 252, 0.1);
  padding: 1.6rem;
  border-radius: 0.8rem;
  border: 1px solid rgba(165, 180, 252, 0.2);
  font-size: 1.6rem;
  transition: all 0.2s ease-in-out;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.2rem;

  &:hover {
    background-color: rgba(165, 180, 252, 0.15);
    transform: translateX(4px);
  }
`;

const InfoSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  flex: 1;
`;

const EpochName = styled.span`
  font-weight: 500;
  font-size: 1.8rem;
  color: var(--color-grey-100);
`;

const GroupName = styled.span`
  color: var(--color-grey-300);
  font-size: 1.4rem;
`;

const SectionTitle = styled.div`
  font-size: 1.2rem;
  font-weight: 500;
  margin-top: 1.2rem;
  margin-bottom: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-grey-200);
`;

const PhaseList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const PhaseRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-size: 1.4rem;
  color: var(--color-grey-300);
`;

const Dot = styled.span`
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 50%;
  display: inline-block;
  background: ${({ color }) => color};
`;

const PhaseText = styled.span`
  font-weight: ${({ $isCurrent }) => ($isCurrent ? "bold" : "normal")};
  text-decoration: ${({ $isCurrent }) => ($isCurrent ? "underline" : "none")};
  color: ${({ $isCurrent }) =>
    $isCurrent ? "var(--color-grey-100)" : "var(--color-grey-300)"};
`;

const DurationText = styled.div`
  margin-top: 1.2rem;
  font-size: 1.4rem;
  color: var(--color-grey-400);
`;

const RightSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1.2rem;
  min-width: 200px;
`;

export default function EpochItem({ epoch }) {
  const phases = calculateEpochPhases(epoch);
  const { currentPhase } = getCurrentPhase(epoch);

  // Helper for phase display
  const phaseList = [
    {
      key: "proposal",
      label: "Proposal Phase",
      start: phases.proposalPhase.start,
      end: phases.proposalPhase.end,
      duration: phases.proposalPhase.duration,
    },
    {
      key: "voting",
      label: "Voting Phase",
      start: phases.votingPhase.start,
      end: phases.votingPhase.end,
      duration: phases.votingPhase.duration,
    },
    {
      key: "review",
      label: "Review Phase",
      start: phases.reviewPhase.start,
      end: phases.reviewPhase.end,
      duration: phases.reviewPhase.duration,
    },
  ];

  // Duration in weeks
  const weeks = Math.round(epoch.epoch_duration / 7);

  return (
    <EpochItemContainer>
      <InfoSection>
        <EpochName>{epoch.epoch_name}</EpochName>
        <SectionTitle>
          Current Phase <FaInfoCircle size={16} />
        </SectionTitle>
        <PhaseList>
          {phaseList.map((phase) => (
            <PhaseRow key={phase.key}>
              <Dot color={getDotColor(phase.key, currentPhase)} />
              <PhaseText $isCurrent={currentPhase === phase.key}>
                {phase.label}: {formatDate(phase.start)} -{" "}
                {formatDate(phase.end)} ({phase.duration} day
                {phase.duration !== 1 ? "s" : ""})
              </PhaseText>
            </PhaseRow>
          ))}
        </PhaseList>
        <DurationText>
          Total Duration: {weeks} week{weeks !== 1 ? "s" : ""}
        </DurationText>
      </InfoSection>
      <RightSection>
        <GroupName>{epoch.groups?.name}</GroupName>
      </RightSection>
    </EpochItemContainer>
  );
}
