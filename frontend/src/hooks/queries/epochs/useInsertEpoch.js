import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertEpoch } from "../../../services/apiEpochs";
import { useCalculateAndStoreRoot } from "../merkleTreeRoots/useCalculateAndStoreRoot";
import { useUpdateBlockchainRoot } from "../merkleTreeRoots/useUpdateBlockchainRoot";

/**
 * Custom hook to insert a new epoch with root calculation and blockchain update.
 *
 * This hook orchestrates the complete epoch creation process:
 * 1. Calculates and stores the new Merkle tree root in the database
 * 2. Updates the blockchain root if it has changed
 * 3. Creates the epoch/campaign record
 *
 * The hook handles all three operations sequentially and provides loading states
 * for each step. It also invalidates related queries to ensure UI consistency.
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
      queryClient.invalidateQueries(["epochsByGroupId", variables.group_id]);
      queryClient.invalidateQueries(["userEpochs"]);
    },
  });

  return {
    insertEpoch: insertEpochMutation,
    isLoading: isInsertingEpoch || isCalculatingRoot || isUpdatingRoot,
    error,
  };
}
