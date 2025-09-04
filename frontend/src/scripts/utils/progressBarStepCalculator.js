/**
 * Calculates the current step and rejection status for a proposal's progress bar
 * based on the proposal status type and current epoch phase.
 *
 * @param {Object} proposal - The proposal object
 * @param {string} proposal.status_type - The current status of the proposal
 * @param {Object} phases - The epoch phases object containing proposalPhase, votingPhase, and reviewPhase
 * @param {Date} currentDate - The current date (defaults to new Date())
 * @returns {Object} Object containing currentStep and rejection flags
 */
export function calculateProgressBarStep(
  proposal,
  phases,
  currentDate = new Date()
) {
  // Default values
  let currentStep = 1; // Step 1 is always "Submitted"
  let isStep2Rejected = false;
  let isStep3NotClaimed = false;
  let isStep5TransferRejected = false;
  let isStep6Completed = false;

  if (!proposal || !phases || !currentDate) {
    return {
      currentStep,
      isStep2Rejected,
      isStep3NotClaimed,
      isStep5TransferRejected,
      isStep6Completed,
    };
  }

  const { status_type } = proposal;
  const { votingPhase, reviewPhase } = phases;

  // Helper function to check if current date is within a phase
  const isInPhase = (phase) => {
    if (!phase || !phase.start || !phase.end) return false;
    return currentDate >= phase.start && currentDate <= phase.end;
  };

  // Step 2: "Accepted" - Current if in voting phase and status is active
  if (isInPhase(votingPhase) && status_type === "active") {
    currentStep = 2;
  }
  // Step 3: "Claimed" - Current if in review phase and status is approved
  else if (isInPhase(reviewPhase) && status_type === "approved") {
    currentStep = 3;
  }
  // Step 4: "Transfer Requested" - Current if status is claimed
  else if (status_type === "claimed") {
    currentStep = 4;
  }
  // Step 4: "Transfer Requested" - Completed if status is requested
  else if (status_type === "requested") {
    currentStep = 5; // Move to step 5 since step 4 is completed
    isStep6Completed = false; // Ensure step 6 is not marked as completed
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
    isStep6Completed,
  };
}

/**
 * Alternative function that takes the proposal and phases directly
 * and calculates the progress bar state without requiring current date
 */
export function calculateProgressBarStepFromProposal(proposal, phases) {
  return calculateProgressBarStep(proposal, phases);
}
