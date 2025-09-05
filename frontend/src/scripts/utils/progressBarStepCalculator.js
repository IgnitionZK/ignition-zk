/**
 * Calculates the current step and rejection status for a proposal's progress bar
 * based on the proposal status type, current epoch phase, and whether the group has a treasury.
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
  const { votingPhase, reviewPhase } = phases;

  // Helper function to check if current date is within a phase
  const isInPhase = (phase) => {
    if (!phase || !phase.start || !phase.end) return false;
    return currentDate >= phase.start && currentDate <= phase.end;
  };

  // Step 2: "Accepted" - Current if status is active (regardless of phase)
  if (status_type === "active") {
    currentStep = 2;
  }
  // Step 3: "Claimed" - Current if status is approved (regardless of phase)
  else if (status_type === "approved") {
    currentStep = 3;
  }
  // Step 4: "Transfer Requested" - Only available if group has treasury
  else if (hasTreasury && status_type === "claimed") {
    currentStep = 4;
  } else if (hasTreasury && status_type === "requested") {
    currentStep = 4;
    isStep4Completed = true;
  }
  // For groups without treasury, "claimed" and "requested" statuses stay at step 3
  else if (
    !hasTreasury &&
    (status_type === "claimed" || status_type === "requested")
  ) {
    currentStep = 3;
    // Mark step 3 as completed for groups without treasury
    isStep3Completed = true;
  }
  // If proposal is rejected, always show at step 2 as rejected
  else if (status_type === "rejected") {
    currentStep = 2;
    isStep2Rejected = true;
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
