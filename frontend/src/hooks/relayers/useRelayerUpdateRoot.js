import { useMutation } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";

/**
 * Custom hook to update Merkle tree root using the Supabase edge function relayer
 *
 * @returns {Object} An object containing:
 *   @property {Function} updateMerkleRoot - Function to trigger the Merkle root update
 *   @property {boolean} isLoading - Whether the update is currently in progress
 *   @property {boolean} isError - Whether the last update attempt resulted in an error
 *   @property {boolean} isSuccess - Whether the last update attempt was successful
 *   @property {Object} error - Error object if the update failed
 *   @property {Object} data - Response data from the successful update
 *
 * @example
 * const { updateMerkleRoot, isLoading, isError, error, data } = useRelayerUpdateRoot();
 *
 * // Usage
 * updateMerkleRoot({
 *   treeVersion: 1,
 *   rootValue: "0x123...",
 *   groupKey: "group-123"
 * }, {
 *   onSuccess: (data) => console.log('Merkle root updated:', data),
 *   onError: (error) => console.error('Update failed:', error)
 * });
 */
export function useRelayerUpdateRoot() {
  const updateMerkleRootMutation = useMutation({
    mutationFn: async ({ treeVersion, rootValue, groupKey }) => {
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
      if (typeof treeVersion === "undefined" || treeVersion === null) {
        throw new Error("treeVersion is required");
      }
      if (!rootValue) {
        throw new Error("rootValue is required");
      }
      if (!groupKey) {
        throw new Error("groupKey is required");
      }

      console.log("Initiating blockchain transaction...");

      // Call the Supabase edge function
      const { data, error } = await supabase.functions.invoke(
        "relayer-update-root",
        {
          body: {
            tree_version: treeVersion,
            root_value: rootValue,
            group_key: groupKey.toString(), // Convert to string as expected by edge function
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
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

      console.log("Blockchain transaction completed:", data);

      // Check if the response includes block number (indicating confirmation)
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
