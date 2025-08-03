import { useMutation } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";
import { ZKProofGenerator } from "../../scripts/generateZKProof";
import { uuidToBytes32 } from "../../utils/uuidToBytes32";

/**
 * Custom hook to verify vote using the Supabase edge function relayer
 *
 * @returns {Object} An object containing:
 *   @property {Function} verifyVote - Function to trigger the vote verification
 *   @property {boolean} isLoading - Whether the verification is currently in progress
 *   @property {boolean} isError - Whether the last verification attempt resulted in an error
 *   @property {boolean} isSuccess - Whether the last verification attempt was successful
 *   @property {Object} error - Error object if the verification failed
 *   @property {Object} data - Response data from the successful verification
 *
 * @example
 * const { verifyVote, isLoading, isError, error, data } = useRelayerVerifyVote();
 *
 * // Usage
 * verifyVote({
 *   proof: "0x123...",
 *   publicSignals: ["0xabc...", "0xdef..."],
 *   groupKey: "group-123",
 *   epochKey: "epoch-123"
 * }, {
 *   onSuccess: (data) => console.log('Vote verified:', data),
 *   onError: (error) => console.error('Verification failed:', error)
 * });
 */
export function useRelayerVerifyVote() {
  const verifyVoteMutation = useMutation({
    mutationFn: async ({
      proof,
      publicSignals,
      groupKey,
      epochKey,
      proposalKey,
    }) => {
      // Get the current session to extract the JWT token
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(`Failed to get session: ${sessionError.message}`);
      }

      if (!session?.access_token) {
        throw new Error("No authentication token found. Please log in.");
      }

      // Validate required parameters
      if (!proof) {
        throw new Error("proof is required");
      }
      if (!publicSignals) {
        throw new Error("publicSignals is required");
      }
      if (!groupKey) {
        throw new Error("groupKey is required");
      }
      if (!epochKey) {
        throw new Error("epochKey is required");
      }
      if (!proposalKey) {
        throw new Error("proposalKey is required");
      }

      // LOG: Data received by relayer hook
      console.log("[FRONTEND/useRelayerVerifyVote] Data received:", {
        proof,
        publicSignals,
        groupKey,
        epochKey,
        proposalKey,
      });

      // Compute the vote context_key using Poseidon hash (groupKey, epochKey, proposalKey)
      // this function applies modular reduction internally and matches the vote circuit
      let contextKey;
      try {
        contextKey = await ZKProofGenerator.computeVoteContextKey(
          groupKey.toString(),
          epochKey.toString(),
          proposalKey.toString()
        );

        console.log(
          "[FRONTEND/useRelayerVerifyVote] Computed vote context_key:",
          {
            groupKey: groupKey.toString(),
            epochKey: epochKey.toString(),
            proposalKey: proposalKey.toString(),
            contextKey,
          }
        );
      } catch (error) {
        console.error(
          "[FRONTEND/useRelayerVerifyVote] Error computing vote context_key:",
          error
        );
        throw new Error(`Failed to compute vote context_key: ${error.message}`);
      }

      // Convert the groupId UUID to bytes32 format
      console.log(
        "[FRONTEND/useRelayerVerifyVote] Converting groupKey to bytes32 format"
      );
      console.log("Group Key to be converted:", groupKey);
      const groupKeyBytes32 = uuidToBytes32(groupKey);
      console.log(
        "[FRONTEND/useRelayerVerifyVote] Group Key Bytes32:",
        groupKeyBytes32
      );

      // Call the Supabase edge function
      const { data, error } = await supabase.functions.invoke(
        "delegate-verify-vote",
        {
          body: {
            proof: proof.map((item) => item.toString()),
            public_signals: publicSignals.map((item) => item.toString()),
            group_key: groupKeyBytes32.toString(),
            context_key: contextKey, // Send the pre-computed context_key
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      // LOG: Response from edge function
      console.log(
        "[FRONTEND/useRelayerVerifyVote] Edge function response:",
        data,
        error
      );

      if (error) {
        // Try to get more detailed error information
        let errorMessage = `Edge function error: ${error.message}`;

        // Log the full error object for debugging
        console.error("Full edge function error:", error);

        // Try to extract more details from the error object
        if (error.context) {
          console.error("Error context:", error.context);
        }

        if (error.status) {
          console.error("Error status:", error.status);
        }

        if (error.statusText) {
          console.error("Error status text:", error.statusText);
        }

        // If there's response data, it might contain more error details
        if (error.context && error.context.body) {
          try {
            const errorBody = JSON.parse(error.context.body);
            if (errorBody.error) {
              errorMessage = `Edge function error: ${errorBody.error}`;
            }
            if (errorBody.details) {
              console.error("Error details:", errorBody.details);
            }
          } catch (e) {
            // If we can't parse the error body, use the original message
            console.error("Could not parse error body:", e);
          }
        }

        throw new Error(errorMessage);
      }

      console.log("Edge function response:", data);
      return data;
    },
  });

  const verifyVote = (params, callbacks = {}) => {
    const { onSuccess, onError } = callbacks;

    return verifyVoteMutation.mutate(params, {
      onSuccess: (data) => {
        if (onSuccess) {
          onSuccess(data);
        }
      },
      onError: (error) => {
        console.error("Vote verification failed:", error);
        if (onError) {
          onError(error);
        }
      },
    });
  };

  return {
    verifyVote,
    isLoading: verifyVoteMutation.isPending,
    isError: verifyVoteMutation.isError,
    isSuccess: verifyVoteMutation.isSuccess,
    error: verifyVoteMutation.error,
    data: verifyVoteMutation.data,
  };
}
