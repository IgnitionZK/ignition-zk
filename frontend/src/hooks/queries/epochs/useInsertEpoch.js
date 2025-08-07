import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertEpoch } from "../../../services/apiEpochs";
import { useCalculateAndStoreRoot } from "../merkleTreeRoots/useCalculateAndStoreRoot";
import { useUpdateBlockchainRoot } from "../merkleTreeRoots/useUpdateBlockchainRoot";

/**
 * Custom hook to insert a new epoch with root calculation and blockchain update
 *
 * @returns {Object} Object containing:
 *   - insertEpoch: function - Function to insert new epoch with root calculation and blockchain update
 *   - isLoading: boolean - Loading state of the mutation
 *   - error: Error | null - Error state of the mutation
 *
 * @notes
 *   - Uses React Query's useMutation for optimistic updates
 *   - Automatically invalidates related queries after successful insertion
 *   - Calculates and stores root before creating campaign to ensure consistency
 *   - Skips blockchain updates when root is unchanged for efficiency
 */
export function useInsertEpoch() {
  const queryClient = useQueryClient();
  const { calculateAndStoreRoot, isLoading: isCalculatingRoot } =
    useCalculateAndStoreRoot();
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
        console.log(
          "Starting epoch creation with root calculation and blockchain update..."
        );

        // Step 1: Calculate and store root in database
        console.log("Calculating and storing root...");
        const rootData = await calculateAndStoreRoot({
          groupId: group_id,
          onSuccess: (rootResult) => {
            console.log("Root calculated and stored successfully:", rootResult);
          },
          onError: (rootError) => {
            console.error("Root calculation failed:", rootError);
            throw new Error(`Root calculation failed: ${rootError.message}`);
          },
        });

        // Step 2: Update blockchain only if root has changed
        if (rootData.rootUnchanged) {
          console.log("Root unchanged, skipping blockchain update...");
        } else {
          console.log("Root has changed, updating blockchain...");
          await updateBlockchainRoot({
            groupId: group_id,
            onSuccess: (blockchainData) => {
              console.log(
                "Blockchain root updated successfully:",
                blockchainData
              );
            },
            onError: (blockchainError) => {
              console.error("Blockchain root update failed:", blockchainError);
              throw new Error(
                `Blockchain root update failed: ${blockchainError.message}`
              );
            },
          });
        }

        // Step 3: Create the epoch/campaign
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

  // Only include blockchain update loading if we're actually updating
  // For now, we'll keep it simple and include it in the loading state
  return {
    insertEpoch: insertEpochMutation,
    isLoading: isInsertingEpoch || isCalculatingRoot || isUpdatingRoot,
    error,
  };
}
