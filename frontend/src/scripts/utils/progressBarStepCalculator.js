/**
 * Calculates the current step and rejection status for a proposal's progress bar
 * based on the proposal status type, current epoch phase, and whether the group has a treasury.
 * The progress bar respects the epoch phases - proposals only advance when the epoch allows it.
 *
 * @param {Object} proposal - The proposal object
 * @param {string} proposal.status_type - The current status of the proposal
 * @param {Object} phases - The epoch phases object containing proposalPhase, votingPhase, and reviewPhase
 * @param {Date} currentDate - The current date (defaults to new Date())
 * @param {boolean} hasTreasury - Whether the group has a treasury (defaults to true)
 * @returns {Object} Object containing currentStep and rejection flags
 */
export function calculateProgressBarStep(
  proposal,
  phases,
  currentDate = new Date(),
  hasTreasury = true
) {
  // Default values
  let currentStep = 1; // Step 1 is always "Submitted"
  let isStep2Rejected = false;
  let isStep3NotClaimed = false;
  let isStep5TransferRejected = false;
  let isStep4Completed = false;
  let isStep3Completed = false;

  if (!proposal || !phases || !currentDate) {
    return {
      currentStep,
      isStep2Rejected,
      isStep3NotClaimed,
      isStep5TransferRejected,
      isStep4Completed,
      isStep3Completed,
    };
  }

  const { status_type } = proposal;
  const { proposalPhase, votingPhase, reviewPhase } = phases;

  // Helper function to check if current date is within a phase
  const isInPhase = (phase) => {
    if (!phase || !phase.start || !phase.end) return false;
    return currentDate >= phase.start && currentDate <= phase.end;
  };

  // Determine current epoch phase
  const isInProposalPhase = isInPhase(proposalPhase);
  const isInVotingPhase = isInPhase(votingPhase);
  const isInReviewPhase = isInPhase(reviewPhase);

  // Step progression logic based on both proposal status and epoch phase
  if (status_type === "rejected") {
    // Rejected proposals always show at step 2 as rejected
    currentStep = 2;
    isStep2Rejected = true;
  } else if (status_type === "active") {
    // Active proposals advance based on epoch phase
    if (isInProposalPhase) {
      currentStep = 1; // Stay at "Submitted" during proposal phase
    } else if (isInVotingPhase || isInReviewPhase) {
      currentStep = 2; // Advance to "Accepted" during voting/review phases
    } else {
      currentStep = 2; // Default to step 2 if epoch has ended
    }
  } else if (status_type === "approved") {
    // Approved proposals advance based on epoch phase
    if (isInProposalPhase || isInVotingPhase) {
      currentStep = 2; // Stay at "Accepted" during proposal/voting phases
    } else if (isInReviewPhase) {
      currentStep = 3; // Advance to "Claimed" during review phase
    } else {
      currentStep = 3; // Default to step 3 if epoch has ended
    }
  } else if (hasTreasury && status_type === "claimed") {
    // Claimed proposals with treasury advance to transfer step
    currentStep = 4;
  } else if (hasTreasury && status_type === "requested") {
    // Requested proposals with treasury are at transfer step and completed
    currentStep = 4;
    isStep4Completed = true;
  } else if (
    !hasTreasury &&
    (status_type === "claimed" || status_type === "requested")
  ) {
    // For groups without treasury, "claimed" and "requested" statuses stay at step 3
    currentStep = 3;
    isStep3Completed = true;
  }

  return {
    currentStep,
    isStep2Rejected,
    isStep3NotClaimed,
    isStep5TransferRejected,
    isStep4Completed,
    isStep3Completed,
  };
}

/**
 * Alternative function that takes the proposal and phases directly
 * and calculates the progress bar state without requiring current date
 */
export function calculateProgressBarStepFromProposal(proposal, phases) {
  return calculateProgressBarStep(proposal, phases);
}
