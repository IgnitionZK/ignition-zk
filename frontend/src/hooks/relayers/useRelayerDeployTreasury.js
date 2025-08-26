import { useMutation } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";
import { uuidToBytes32 } from "../../scripts/utils/uuidToBytes32";

/**
 * Custom hook to deploy treasuries using the Supabase edge function relayer.
 * This hook handles treasury deployment by converting group keys to bytes32 format
 * and delegating deployment to the backend relayer.
 * It returns deployment status and the deployed treasury address.
 */
export function useRelayerDeployTreasury() {
  const deployTreasuryMutation = useMutation({
    mutationFn: async ({ groupKey, treasuryMultiSig, treasuryRecovery }) => {
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

      if (!groupKey) {
        throw new Error("groupKey is required");
      }
      if (!treasuryMultiSig) {
        throw new Error("treasuryMultiSig is required");
      }
      if (!treasuryRecovery) {
        throw new Error("treasuryRecovery is required");
      }

      console.log("[FRONTEND/useRelayerDeployTreasury] Data received:", {
        groupKey,
        treasuryMultiSig,
        treasuryRecovery,
      });

      // Convert the groupId UUID to bytes32 format
      console.log(
        "[FRONTEND/useRelayerDeployTreasury] Converting groupKey to bytes32 format"
      );
      console.log("Group Key to be converted:", groupKey);
      const groupKeyBytes32 = uuidToBytes32(groupKey);
      console.log(
        "[FRONTEND/useRelayerDeployTreasury] Group Key Bytes32:",
        groupKeyBytes32
      );

      const { data, error } = await supabase.functions.invoke(
        "relayer-deploy-treasury",
        {
          body: {
            group_key: groupKeyBytes32.toString(),
            treasury_multisig: treasuryMultiSig,
            treasury_recovery: treasuryRecovery,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      console.log(
        "[FRONTEND/useRelayerDeployTreasury] Edge function response:",
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

  const deployTreasury = (params, callbacks = {}) => {
    const { onSuccess, onError } = callbacks;

    return deployTreasuryMutation.mutate(params, {
      onSuccess: (data) => {
        if (onSuccess) {
          onSuccess(data);
        }
      },
      onError: (error) => {
        console.error("Treasury deployment failed:", error);
        if (onError) {
          onError(error);
        }
      },
    });
  };

  return {
    deployTreasury,
    isLoading: deployTreasuryMutation.isPending,
    isError: deployTreasuryMutation.isError,
    isSuccess: deployTreasuryMutation.isSuccess,
    error: deployTreasuryMutation.error,
    data: deployTreasuryMutation.data,
  };
}
