import { useMutation } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";

/**
 * Custom hook to verify proposal claim using the Supabase edge function relayer
 *
 * @returns {Object} An object containing:
 *   @property {Function} verifyProposalClaim - Function to trigger the proposal claim verification
 *   @property {boolean} isLoading - Whether the verification is currently in progress
 *   @property {boolean} isError - Whether the last verification attempt resulted in an error
 *   @property {boolean} isSuccess - Whether the last verification attempt was successful
 *   @property {Object} error - Error object if the verification failed
 *   @property {Object} data - Response data from the successful verification
 *
 * @example
 * const { verifyProposalClaim, isLoading, isError, error, data } = useRelayerVerifyProposalClaim();
 *
 * // Usage
 * verifyProposalClaim({
 *   proof: [/* 24 uint256 values *\/],
 *   publicSignals: [/* 3 uint256 values *\/],
 *   contextKey: "0x123..."
 * }, {
 *   onSuccess: (data) => console.log('Proposal claim verified:', data),
 *   onError: (error) => console.error('Verification failed:', error)
 * });
 */
export function useRelayerVerifyProposalClaim() {
  const verifyProposalClaimMutation = useMutation({
    mutationFn: async ({ proof, publicSignals, contextKey }) => {
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
      if (!contextKey) {
        throw new Error("contextKey is required");
      }

      // Validate proof array length (should be 24 uint256 values)
      if (!Array.isArray(proof) || proof.length !== 24) {
        throw new Error("proof must be an array of 24 uint256 values");
      }

      // Validate publicSignals array length (should be 3 uint256 values)
      if (!Array.isArray(publicSignals) || publicSignals.length !== 3) {
        throw new Error("publicSignals must be an array of 3 uint256 values");
      }

      // LOG: Data received by relayer hook
      console.log("[FRONTEND/useRelayerVerifyProposalClaim] Data received:", {
        proof: proof.length,
        publicSignals: publicSignals.length,
        contextKey,
      });

      // Call the Supabase edge function
      const { data, error } = await supabase.functions.invoke(
        "relayer-verify-proposal-claim",
        {
          body: {
            proof: proof.map((item) => item.toString()),
            publicSignals: publicSignals.map((item) => item.toString()),
            contextKey: contextKey.toString(),
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      // LOG: Response from edge function
      console.log(
        "[FRONTEND/useRelayerVerifyProposalClaim] Edge function response:",
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

  const verifyProposalClaim = (params, callbacks = {}) => {
    const { onSuccess, onError } = callbacks;

    return verifyProposalClaimMutation.mutate(params, {
      onSuccess: (data) => {
        if (onSuccess) {
          onSuccess(data);
        }
      },
      onError: (error) => {
        console.error("Proposal claim verification failed:", error);
        if (onError) {
          onError(error);
        }
      },
    });
  };

  return {
    verifyProposalClaim,
    isLoading: verifyProposalClaimMutation.isPending,
    isError: verifyProposalClaimMutation.isError,
    isSuccess: verifyProposalClaimMutation.isSuccess,
    error: verifyProposalClaimMutation.error,
    data: verifyProposalClaimMutation.data,
  };
}
