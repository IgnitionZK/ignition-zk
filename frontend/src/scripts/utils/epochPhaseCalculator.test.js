import {
  calculateEpochPhases,
  getCurrentPhase,
  getPhaseProgress,
} from "./epochPhaseCalculator";

describe("epochPhaseCalculator", () => {
  describe("calculateEpochPhases", () => {
    it("should calculate phases correctly for 14-day epoch (not evenly divisible by 3)", () => {
      const epoch = {
        epoch_start_time: "2024-01-01T00:00:00Z",
        epoch_duration: 14,
      };

      const phases = calculateEpochPhases(epoch);

      // 14 / 3 = 4.666... so basePhaseDays = 4, remainder = 2
      // proposal: 4 days, voting: 4 + 2 = 6 days, review: 4 days
      expect(phases.proposalPhase.duration).toBe(4);
      expect(phases.votingPhase.duration).toBe(6);
      expect(phases.reviewPhase.duration).toBe(4);

      // Total should equal original duration
      expect(
        phases.proposalPhase.duration +
          phases.votingPhase.duration +
          phases.reviewPhase.duration
      ).toBe(14);
    });

    it("should calculate phases correctly for 15-day epoch (evenly divisible by 3)", () => {
      const epoch = {
        epoch_start_time: "2024-01-01T00:00:00Z",
        epoch_duration: 15,
      };

      const phases = calculateEpochPhases(epoch);

      // 15 / 3 = 5, so all phases should be 5 days
      expect(phases.proposalPhase.duration).toBe(5);
      expect(phases.votingPhase.duration).toBe(5);
      expect(phases.reviewPhase.duration).toBe(5);

      // Total should equal original duration
      expect(
        phases.proposalPhase.duration +
          phases.votingPhase.duration +
          phases.reviewPhase.duration
      ).toBe(15);
    });

    it("should calculate phases correctly for 16-day epoch (remainder of 1)", () => {
      const epoch = {
        epoch_start_time: "2024-01-01T00:00:00Z",
        epoch_duration: 16,
      };

      const phases = calculateEpochPhases(epoch);

      // 16 / 3 = 5.333... so basePhaseDays = 5, remainder = 1
      // proposal: 5 days, voting: 5 + 1 = 6 days, review: 5 days
      expect(phases.proposalPhase.duration).toBe(5);
      expect(phases.votingPhase.duration).toBe(6);
      expect(phases.reviewPhase.duration).toBe(5);

      // Total should equal original duration
      expect(
        phases.proposalPhase.duration +
          phases.votingPhase.duration +
          phases.reviewPhase.duration
      ).toBe(16);
    });

    it("should calculate correct start and end times", () => {
      const epoch = {
        epoch_start_time: "2024-01-01T00:00:00Z",
        epoch_duration: 9,
      };

      const phases = calculateEpochPhases(epoch);

      // All phases should be 3 days
      expect(phases.proposalPhase.duration).toBe(3);
      expect(phases.votingPhase.duration).toBe(3);
      expect(phases.reviewPhase.duration).toBe(3);

      // Check start times
      expect(phases.proposalPhase.start.toISOString()).toBe(
        "2024-01-01T00:00:00.000Z"
      );
      expect(phases.votingPhase.start.toISOString()).toBe(
        "2024-01-04T00:00:00.000Z"
      );
      expect(phases.reviewPhase.start.toISOString()).toBe(
        "2024-01-07T00:00:00.000Z"
      );

      // Check end times
      expect(phases.proposalPhase.end.toISOString()).toBe(
        "2024-01-04T00:00:00.000Z"
      );
      expect(phases.votingPhase.end.toISOString()).toBe(
        "2024-01-07T00:00:00.000Z"
      );
      expect(phases.reviewPhase.end.toISOString()).toBe(
        "2024-01-10T00:00:00.000Z"
      );
    });

    it("should throw error for missing epoch_start_time", () => {
      const epoch = {
        epoch_duration: 14,
      };

      expect(() => calculateEpochPhases(epoch)).toThrow(
        "epoch_start_time and epoch_duration are required"
      );
    });

    it("should throw error for missing epoch_duration", () => {
      const epoch = {
        epoch_start_time: "2024-01-01T00:00:00Z",
      };

      expect(() => calculateEpochPhases(epoch)).toThrow(
        "epoch_start_time and epoch_duration are required"
      );
    });
  });

  describe("getCurrentPhase", () => {
    it("should return pending phase before epoch starts", () => {
      const epoch = {
        epoch_start_time: "2024-12-31T00:00:00Z",
        epoch_duration: 9,
      };

      const currentTime = new Date("2024-12-30T12:00:00Z");
      const phase = getCurrentPhase(epoch, currentTime);

      expect(phase.currentPhase).toBe("pending");
      expect(phase.phaseName).toBe("Pending");
    });

    it("should return proposal phase during proposal period", () => {
      const epoch = {
        epoch_start_time: "2024-01-01T00:00:00Z",
        epoch_duration: 9,
      };

      const currentTime = new Date("2024-01-02T12:00:00Z");
      const phase = getCurrentPhase(epoch, currentTime);

      expect(phase.currentPhase).toBe("proposal");
      expect(phase.phaseName).toBe("Proposal Phase");
    });

    it("should return voting phase during voting period", () => {
      const epoch = {
        epoch_start_time: "2024-01-01T00:00:00Z",
        epoch_duration: 9,
      };

      const currentTime = new Date("2024-01-05T12:00:00Z");
      const phase = getCurrentPhase(epoch, currentTime);

      expect(phase.currentPhase).toBe("voting");
      expect(phase.phaseName).toBe("Voting Phase");
    });

    it("should return review phase during review period", () => {
      const epoch = {
        epoch_start_time: "2024-01-01T00:00:00Z",
        epoch_duration: 9,
      };

      const currentTime = new Date("2024-01-08T12:00:00Z");
      const phase = getCurrentPhase(epoch, currentTime);

      expect(phase.currentPhase).toBe("review");
      expect(phase.phaseName).toBe("Review Phase");
    });

    it("should return completed phase after epoch ends", () => {
      const epoch = {
        epoch_start_time: "2024-01-01T00:00:00Z",
        epoch_duration: 9,
      };

      const currentTime = new Date("2024-01-11T12:00:00Z");
      const phase = getCurrentPhase(epoch, currentTime);

      expect(phase.currentPhase).toBe("completed");
      expect(phase.phaseName).toBe("Completed");
    });
  });

  describe("getPhaseProgress", () => {
    it("should return 0 before epoch starts", () => {
      const epoch = {
        epoch_start_time: "2024-12-31T00:00:00Z",
        epoch_duration: 9,
      };

      const currentTime = new Date("2024-12-30T12:00:00Z");
      const progress = getPhaseProgress(epoch, currentTime);

      expect(progress).toBe(0);
    });

    it("should return 100 after epoch ends", () => {
      const epoch = {
        epoch_start_time: "2024-01-01T00:00:00Z",
        epoch_duration: 9,
      };

      const currentTime = new Date("2024-01-11T12:00:00Z");
      const progress = getPhaseProgress(epoch, currentTime);

      expect(progress).toBe(100);
    });

    it("should return 50 at midpoint of proposal phase", () => {
      const epoch = {
        epoch_start_time: "2024-01-01T00:00:00Z",
        epoch_duration: 9,
      };

      const currentTime = new Date("2024-01-02T12:00:00Z"); // 1.5 days into 3-day proposal phase
      const progress = getPhaseProgress(epoch, currentTime);

      expect(progress).toBeCloseTo(50, 0);
    });
  });
});
