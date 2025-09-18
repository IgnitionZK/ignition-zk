import { useMutation } from "@tanstack/react-query";
import { createTransaction } from "../../../services/apiTransactions";

/**
 * Custom hook for creating transaction records in the database
 *
 * This hook handles the creation of transaction records that track
 * blockchain transactions associated with various operations like
 * proposal verification, voting, etc.
 */
export function useCreateTransaction() {
  const createTransactionMutation = useMutation({
    mutationFn: async ({
      txFunction,
      txEventIdentifier,
      txHash,
      status,
      childId,
    }) => {
      return await createTransaction({
        txFunction,
        txEventIdentifier,
        txHash,
        status,
        childId,
      });
    },
  });

  const createTransactionRecord = (params, callbacks = {}) => {
    const { onSuccess, onError } = callbacks;

    return createTransactionMutation.mutate(params, {
      onSuccess: (data) => {
        if (onSuccess) {
          onSuccess(data);
        }
      },
      onError: (error) => {
        console.error("Transaction creation failed:", error);
        if (onError) {
          onError(error);
        }
      },
    });
  };

  return {
    createTransactionRecord,
    isLoading: createTransactionMutation.isPending,
    isError: createTransactionMutation.isError,
    isSuccess: createTransactionMutation.isSuccess,
    error: createTransactionMutation.error,
    data: createTransactionMutation.data,
  };
}
