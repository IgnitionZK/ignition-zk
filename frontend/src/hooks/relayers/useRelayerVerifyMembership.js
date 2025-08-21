import { useMutation } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";

/**
 * Custom hook to verify membership using the Supabase edge function relayer.
 * This hook handles ZK proof verification by sending proof data, public signals, and group key
 * to the backend relayer service, which then verifies the proof on-chain.
 * Returns a mutation function along with loading states and error handling.
 */
export function useRelayerVerifyMembership() {
  const verifyMembershipMutation = useMutation({
    mutationFn: async ({ proof, publicSignals, groupKey }) => {
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

      if (!Array.isArray(proof) || proof.length !== 24) {
        throw new Error("proof must be an array of 24 uint256 values");
      }

      if (!Array.isArray(publicSignals) || publicSignals.length !== 2) {
        throw new Error("publicSignals must be an array of 2 uint256 values");
      }

      console.log("[FRONTEND/useRelayerVerifyMembership] Data received:", {
        proof: proof.length,
        publicSignals: publicSignals.length,
        groupKey,
      });

      const { data, error } = await supabase.functions.invoke(
        "relayer-verify-membership",
        {
          body: {
            proof: proof.map((item) => item.toString()),
            publicSignals: publicSignals.map((item) => item.toString()),

            groupKey: groupKey.toString(),
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      console.log(
        "[FRONTEND/useRelayerVerifyMembership] Edge function response:",
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

  const verifyMembership = (params, callbacks = {}) => {
    const { onSuccess, onError } = callbacks;

    return verifyMembershipMutation.mutate(params, {
      onSuccess: (data) => {
        if (onSuccess) {
          onSuccess(data);
        }
      },
      onError: (error) => {
        console.error("Membership verification failed:", error);
        if (onError) {
          onError(error);
        }
      },
    });
  };

  return {
    verifyMembership,
    isLoading: verifyMembershipMutation.isPending,
    isError: verifyMembershipMutation.isError,
    isSuccess: verifyMembershipMutation.isSuccess,
    error: verifyMembershipMutation.error,
    data: verifyMembershipMutation.data,
  };
}
