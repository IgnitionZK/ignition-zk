import { useMutation } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";
import { ZKProofGenerator } from "../../scripts/generateZKProof";
import { uuidToBytes32 } from "../../scripts/utils/uuidToBytes32";

/**
 * Custom hook to update Merkle tree root using the Supabase edge function relayer
 *
 * @returns {Object} An object containing:
 *   @property {Function} verifyProposal - Function to trigger the proposal verification
 *   @property {boolean} isLoading - Whether the verification is currently in progress
 *   @property {boolean} isError - Whether the last verification attempt resulted in an error
 *   @property {boolean} isSuccess - Whether the last verification attempt was successful
 *   @property {Object} error - Error object if the verification failed
 *   @property {Object} data - Response data from the successful verification
 *
 * @example
 * const { verifyProposal, isLoading, isError, error, data } = useRelayerVerifyProposal();
 *
 * // Usage
 * verifyProposal({
 *   proof: "0x123...",
 *   publicSignals: ["0xabc...", "0xdef..."],
 *   groupKey: "group-123",
 *   epochKey: "epoch-123"
 * }, {
 *   onSuccess: (data) => console.log('Proposal verified:', data),
 *   onError: (error) => console.error('Verification failed:', error)
 * });
 */
export function useRelayerVerifyProposal() {
  const verifyProposalMutation = useMutation({
    mutationFn: async ({ proof, publicSignals, groupKey, epochKey }) => {
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

      // LOG: Data received by relayer hook
      console.log("[FRONTEND/useRelayerVerifyProposal] Data received:", {
        proof,
        publicSignals,
        groupKey,
        epochKey,
      });

      // Compute the context_key using Poseidon hash (groupKey, epochKey)
      // this function applies modular reduction internally
      let contextKey;
      try {
        contextKey = await ZKProofGenerator.computeContextKey(
          groupKey.toString(),
          epochKey.toString()
        );

        console.log(
          "[FRONTEND/useRelayerVerifyProposal] Computed context_key:",
          {
            groupKey: groupKey.toString(),
            epochKey: epochKey.toString(),
            contextKey,
          }
        );
      } catch (error) {
        console.error(
          "[FRONTEND/useRelayerVerifyProposal] Error computing context_key:",
          error
        );
        throw new Error(`Failed to compute context_key: ${error.message}`);
      }

      // Convert the groupId UUID to bytes32 format
      console.log(
        "[FRONTEND/useRelayerVerifyProposal] Converting groupKey to bytes32 format"
      );
      console.log("Group Key to be converted:", groupKey);
      const groupKeyBytes32 = uuidToBytes32(groupKey);
      console.log(
        "[FRONTEND/useRelayerVerifyProposal] Group Key Bytes32:",
        groupKeyBytes32
      );

      // Call the Supabase edge function
      const { data, error } = await supabase.functions.invoke(
        "relayer-verify-proposal",
        {
          body: {
            proof: proof.map((item) => item.toString()),
            public_signals: publicSignals.map((item) => item.toString()),
            group_key: groupKeyBytes32.toString(), //groupKey.toString(),
            context_key: contextKey, // Send the pre-computed context_key
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      // LOG: Response from edge function
      console.log(
        "[FRONTEND/useRelayerVerifyProposal] Edge function response:",
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
      return {
        ...data,
        contextKey: contextKey, // Include the computed contextKey in the response
      };
    },
  });

  const verifyProposal = (params, callbacks = {}) => {
    const { onSuccess, onError } = callbacks;

    return verifyProposalMutation.mutate(params, {
      onSuccess: (data) => {
        if (onSuccess) {
          onSuccess(data);
        }
      },
      onError: (error) => {
        console.error("Proposal verification failed:", error);
        if (onError) {
          onError(error);
        }
      },
    });
  };

  return {
    verifyProposal,
    isLoading: verifyProposalMutation.isPending,
    isError: verifyProposalMutation.isError,
    isSuccess: verifyProposalMutation.isSuccess,
    error: verifyProposalMutation.error,
    data: verifyProposalMutation.data,
  };
}
