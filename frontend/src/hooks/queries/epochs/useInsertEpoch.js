import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertEpoch } from "../../../services/apiEpochs";
import { useUpdateBlockchainRoot } from "../merkleTreeRoots/useUpdateBlockchainRoot";

/**
 * Custom hook to insert a new epoch with blockchain root update
 *
 * @returns {Object} Object containing:
 *   - insertEpoch: function - Function to insert new epoch with blockchain update
 *   - isLoading: boolean - Loading state of the mutation
 *   - error: Error | null - Error state of the mutation
 *
 * @notes
 *   - Uses React Query's useMutation for optimistic updates
 *   - Automatically invalidates related queries after successful insertion
 *   - Updates blockchain root before creating campaign to ensure consistency
 */
export function useInsertEpoch() {
  const queryClient = useQueryClient();
  const { updateBlockchainRoot, isLoading: isUpdatingRoot } =
    useUpdateBlockchainRoot();

  const {
    mutate: insertEpochMutation,
    isLoading: isInsertingEpoch,
    error,
  } = useMutation({
    mutationFn: async ({
      group_id,
      epoch_duration,
      epoch_name,
      epoch_start_time,
      onSuccess,
      onError,
    }) => {
      try {
        console.log("Starting epoch creation with blockchain root update...");

        // Step 1: Update blockchain root first
        console.log("Updating blockchain root...");
        await updateBlockchainRoot({
          groupId: group_id,
          onSuccess: (rootData) => {
            console.log("Blockchain root updated successfully:", rootData);
          },
          onError: (rootError) => {
            console.error("Blockchain root update failed:", rootError);
            throw new Error(
              `Blockchain root update failed: ${rootError.message}`
            );
          },
        });

        // Step 2: Create the epoch/campaign
        console.log("Creating epoch...");
        const epochData = await insertEpoch({
          group_id,
          epoch_duration,
          epoch_name,
          epoch_start_time,
        });

        console.log("Epoch created successfully:", epochData);

        if (onSuccess) {
          onSuccess(epochData);
        }

        return epochData;
      } catch (error) {
        console.error("Error in epoch creation:", error);
        if (onError) {
          onError(error);
        }
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries(["epochsByGroupId", variables.group_id]);
      queryClient.invalidateQueries(["userEpochs"]);
    },
  });

  return {
    insertEpoch: insertEpochMutation,
    isLoading: isInsertingEpoch || isUpdatingRoot,
    error,
  };
}
