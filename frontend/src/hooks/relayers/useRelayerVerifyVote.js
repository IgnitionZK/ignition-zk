import { useMutation } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";
import { ZKProofGenerator } from "../../scripts/generateZKProof";
import { uuidToBytes32 } from "../../scripts/utils/uuidToBytes32";

/**
 * Custom hook to verify vote proofs using the Supabase edge function relayer.
 * This hook handles ZK proof verification for votes by computing vote context keys,
 * converting group keys to bytes32 format, and delegating verification to the backend.
 * It returns verification status and computed context keys for vote validation.
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
      if (!proposalKey) {
        throw new Error("proposalKey is required");
      }

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

      console.log(
        "[FRONTEND/useRelayerVerifyVote] Edge function response:",
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
