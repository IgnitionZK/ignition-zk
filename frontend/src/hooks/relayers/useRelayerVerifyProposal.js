import { useMutation } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";
import { ZKProofGenerator } from "../../scripts/generateZKProof";
import { uuidToBytes32 } from "../../scripts/utils/uuidToBytes32";

/**
 * Custom hook to verify proposals using ZK proofs via the Supabase edge function relayer.
 * This hook handles proposal verification by sending ZK proof data to the backend for validation.
 */
export function useRelayerVerifyProposal() {
  const verifyProposalMutation = useMutation({
    mutationFn: async ({ proof, publicSignals, groupKey, epochKey }) => {
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
      if (!groupKey) {
        throw new Error("groupKey is required");
      }
      if (!epochKey) {
        throw new Error("epochKey is required");
      }

      console.log("[FRONTEND/useRelayerVerifyProposal] Data received:", {
        proof,
        publicSignals,
        groupKey,
        epochKey,
      });

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

      console.log(
        "[FRONTEND/useRelayerVerifyProposal] Converting groupKey to bytes32 format"
      );
      console.log("Group Key to be converted:", groupKey);
      const groupKeyBytes32 = uuidToBytes32(groupKey);
      console.log(
        "[FRONTEND/useRelayerVerifyProposal] Group Key Bytes32:",
        groupKeyBytes32
      );

      const { data, error } = await supabase.functions.invoke(
        "relayer-verify-proposal",
        {
          body: {
            proof: proof.map((item) => item.toString()),
            public_signals: publicSignals.map((item) => item.toString()),
            group_key: groupKeyBytes32.toString(),
            context_key: contextKey,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      console.log(
        "[FRONTEND/useRelayerVerifyProposal] Edge function response:",
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
      return {
        ...data,
        contextKey: contextKey,
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
