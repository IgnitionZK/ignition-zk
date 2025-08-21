/**
 * Calculates the three phases for an epoch: proposal, voting, and review
 * Each phase duration is calculated in days, with the voting phase receiving any remainder days
 * When epoch_duration is not evenly divisible by 3, the voting phase gets extended
 *
 * @param {Object} epoch - The epoch object containing start time and duration
 * @param {string} epoch.epoch_start_time - Start time of the epoch as ISO string
 * @param {number} epoch.epoch_duration - Duration of the epoch in days
 * @returns {Object} Object containing the three phases with start, end times and durations
 */
export function calculateEpochPhases(epoch) {
  const { epoch_start_time, epoch_duration } = epoch;

  if (!epoch_start_time || !epoch_duration) {
    throw new Error("epoch_start_time and epoch_duration are required");
  }

  const startDate = new Date(epoch_start_time);
  const totalDays = epoch_duration;

  // Calculate base phase duration (integer division)
  const basePhaseDays = Math.floor(totalDays / 3);

  // Calculate remainder days to be added to voting phase
  const remainderDays = totalDays % 3;

  // Calculate phase durations
  const proposalPhaseDays = basePhaseDays;
  const votingPhaseDays = basePhaseDays + remainderDays; // Voting phase gets the remainder
  const reviewPhaseDays = basePhaseDays;

  // Calculate phase start and end times
  const proposalPhaseStart = new Date(startDate);
  const proposalPhaseEnd = new Date(
    startDate.getTime() + proposalPhaseDays * 24 * 60 * 60 * 1000
  );

  const votingPhaseStart = new Date(proposalPhaseEnd);
  const votingPhaseEnd = new Date(
    votingPhaseStart.getTime() + votingPhaseDays * 24 * 60 * 60 * 1000
  );

  const reviewPhaseStart = new Date(votingPhaseEnd);
  const reviewPhaseEnd = new Date(
    reviewPhaseStart.getTime() + reviewPhaseDays * 24 * 60 * 60 * 1000
  );

  return {
    proposalPhase: {
      start: proposalPhaseStart,
      end: proposalPhaseEnd,
      duration: proposalPhaseDays,
    },
    votingPhase: {
      start: votingPhaseStart,
      end: votingPhaseEnd,
      duration: votingPhaseDays,
    },
    reviewPhase: {
      start: reviewPhaseStart,
      end: reviewPhaseEnd,
      duration: reviewPhaseDays,
    },
  };
}

/**
 * Determines the current phase of an epoch based on the current time
 *
 * @param {Object} epoch - The epoch object containing start time and duration
 * @param {Date} currentTime - Current time to check against, defaults to current date
 * @returns {Object} Object containing current phase information and next phase details
 */
export function getCurrentPhase(epoch, currentTime = new Date()) {
  const phases = calculateEpochPhases(epoch);
  const now = new Date(currentTime);

  // Check if epoch hasn't started yet
  if (now < phases.proposalPhase.start) {
    return {
      currentPhase: "pending",
      phaseName: "Pending",
      startTime: phases.proposalPhase.start,
      endTime: phases.proposalPhase.end,
      nextPhase: "proposal",
      nextPhaseName: "Proposal Phase",
      nextPhaseStart: phases.proposalPhase.start,
    };
  }

  // Check proposal phase
  if (now >= phases.proposalPhase.start && now < phases.proposalPhase.end) {
    return {
      currentPhase: "proposal",
      phaseName: "Proposal Phase",
      startTime: phases.proposalPhase.start,
      endTime: phases.proposalPhase.end,
      nextPhase: "voting",
      nextPhaseName: "Voting Phase",
      nextPhaseStart: phases.proposalPhase.end,
    };
  }

  // Check voting phase
  if (now >= phases.votingPhase.start && now < phases.votingPhase.end) {
    return {
      currentPhase: "voting",
      phaseName: "Voting Phase",
      startTime: phases.votingPhase.start,
      endTime: phases.votingPhase.end,
      nextPhase: "review",
      nextPhaseName: "Review Phase",
      nextPhaseStart: phases.votingPhase.end,
    };
  }

  // Check review phase
  if (now >= phases.reviewPhase.start && now < phases.reviewPhase.end) {
    return {
      currentPhase: "review",
      phaseName: "Review Phase",
      startTime: phases.reviewPhase.start,
      endTime: phases.reviewPhase.end,
      nextPhase: "completed",
      nextPhaseName: "Completed",
      nextPhaseStart: phases.reviewPhase.end,
    };
  }

  // Epoch has completed
  return {
    currentPhase: "completed",
    phaseName: "Completed",
    startTime: phases.reviewPhase.end,
    endTime: phases.reviewPhase.end,
    nextPhase: null,
    nextPhaseName: null,
    nextPhaseStart: null,
  };
}

/**
 * Formats a date for display using locale-specific formatting
 *
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string in locale format
 */
export function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Calculates the percentage of completion for the current phase of an epoch
 *
 * @param {Object} epoch - The epoch object containing start time and duration
 * @param {Date} currentTime - Current time to check against, defaults to current date
 * @returns {number} Percentage of completion from 0 to 100
 */
export function getPhaseProgress(epoch, currentTime = new Date()) {
  const phases = calculateEpochPhases(epoch);
  const now = new Date(currentTime);

  // Check if epoch hasn't started yet
  if (now < phases.proposalPhase.start) {
    return 0;
  }

  // Check proposal phase
  if (now >= phases.proposalPhase.start && now < phases.proposalPhase.end) {
    const phaseDuration = phases.proposalPhase.end - phases.proposalPhase.start;
    const elapsed = now - phases.proposalPhase.start;
    return Math.min(100, Math.max(0, (elapsed / phaseDuration) * 100));
  }

  // Check voting phase
  if (now >= phases.votingPhase.start && now < phases.votingPhase.end) {
    const phaseDuration = phases.votingPhase.end - phases.votingPhase.start;
    const elapsed = now - phases.votingPhase.start;
    return Math.min(100, Math.max(0, (elapsed / phaseDuration) * 100));
  }

  // Check review phase
  if (now >= phases.reviewPhase.start && now < phases.reviewPhase.end) {
    const phaseDuration = phases.reviewPhase.end - phases.reviewPhase.start;
    const elapsed = now - phases.reviewPhase.start;
    return Math.min(100, Math.max(0, (elapsed / phaseDuration) * 100));
  }

  // Epoch has completed
  return 100;
}
