import { useMutation } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";

/**
 * Custom hook to update Merkle tree roots on the blockchain through a Supabase edge function relayer.
 * Handles authentication, parameter validation, and provides mutation state management for the root update operation.
 */
export function useRelayerUpdateRoot() {
  const updateMerkleRootMutation = useMutation({
    mutationFn: async ({ treeVersion, rootValue, groupKey, memberCount }) => {
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

      if (typeof treeVersion === "undefined" || treeVersion === null) {
        throw new Error("treeVersion is required");
      }
      if (!rootValue) {
        throw new Error("rootValue is required");
      }
      if (!groupKey) {
        throw new Error("groupKey is required");
      }
      if (!memberCount || memberCount <= 0) {
        throw new Error("memberCount must be a positive integer");
      }

      console.log("Initiating blockchain transaction...");

      const { data, error } = await supabase.functions.invoke(
        "relayer-update-root",
        {
          body: {
            tree_version: treeVersion,
            root_value: rootValue,
            group_key: groupKey.toString(),
            member_count: memberCount.toString(),
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
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

      console.log("Blockchain transaction completed:", data);

      if (data.blockNumber) {
        console.log(`Transaction confirmed in block ${data.blockNumber}`);
      } else {
        console.warn(
          "Transaction response does not include block number - may not be confirmed"
        );
      }

      return data;
    },
  });

  const updateMerkleRoot = (params, callbacks = {}) => {
    const { onSuccess, onError } = callbacks;

    return new Promise((resolve, reject) => {
      updateMerkleRootMutation.mutate(params, {
        onSuccess: (data) => {
          if (onSuccess) {
            onSuccess(data);
          }
          resolve(data);
        },
        onError: (error) => {
          console.error("Merkle root update failed:", error);
          if (onError) {
            onError(error);
          }
          reject(error);
        },
      });
    });
  };

  return {
    updateMerkleRoot,
    isLoading: updateMerkleRootMutation.isPending,
    isError: updateMerkleRootMutation.isError,
    isSuccess: updateMerkleRootMutation.isSuccess,
    error: updateMerkleRootMutation.error,
    data: updateMerkleRootMutation.data,
  };
}
