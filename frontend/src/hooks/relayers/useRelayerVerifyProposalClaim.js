import { useMutation } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";

/**
 * Custom hook to verify proposal claim using the Supabase edge function relayer.
 * This hook handles the verification of ZK proofs for proposal claims, including
 * authentication, input validation, and error handling. It returns a mutation
 * function along with loading states and error handling capabilities.
 */
export function useRelayerVerifyProposalClaim() {
  const verifyProposalClaimMutation = useMutation({
    mutationFn: async ({ proof, publicSignals, contextKey }) => {
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

      if (!proof) {
        throw new Error("proof is required");
      }
      if (!publicSignals) {
        throw new Error("publicSignals is required");
      }
      if (!contextKey) {
        throw new Error("contextKey is required");
      }

      if (!Array.isArray(proof) || proof.length !== 24) {
        throw new Error("proof must be an array of 24 uint256 values");
      }

      if (!Array.isArray(publicSignals) || publicSignals.length !== 3) {
        throw new Error("publicSignals must be an array of 3 uint256 values");
      }

      console.log("[FRONTEND/useRelayerVerifyProposalClaim] Data received:", {
        proof: proof.length,
        publicSignals: publicSignals.length,
        contextKey,
      });

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

      console.log(
        "[FRONTEND/useRelayerVerifyProposalClaim] Edge function response:",
        data,
        error
      );

      if (error) {
        let errorMessage = `Edge function error: ${error.message}`;

        console.error("Full edge function error:", error);

        if (error.context) {
          console.error("Error context:", error.context);
        }

        if (error.status) {
          console.error("Error status:", error.status);
        }

        if (error.statusText) {
          console.error("Error status text:", error.statusText);
        }

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
