import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";
import { uuidToBytes32 } from "../../scripts/utils/uuidToBytes32";
import { ethers } from "ethers";
import { updateProposalStatus } from "../../services/apiProposals";
import { getRequestedStatusId } from "../../services/apiProposalStatus";

/**
 * Custom hook to distribute funding using the Supabase edge function relayer.
 * This hook handles the distribution of funds from the group treasury to the proposal recipient
 * after a proposal has been successfully claimed. It converts group IDs to bytes32 format,
 * validates parameters, and delegates the distribution to the backend relayer.
 * On successful distribution, it updates the proposal status to "requested".
 */
export function useRelayerDistributeFunding() {
  const queryClient = useQueryClient();

  const distributeFundingMutation = useMutation({
    mutationFn: async ({
      groupId,
      contextKey,
      recipient,
      amount,
      fundingType,
      expectedProposalNullifier,
      proposalId,
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

      if (!groupId) {
        throw new Error("groupId is required");
      }
      if (!contextKey) {
        throw new Error("contextKey is required");
      }
      if (!recipient) {
        throw new Error("recipient is required");
      }
      if (!amount) {
        throw new Error("amount is required");
      }
      if (!fundingType) {
        throw new Error("fundingType is required");
      }
      if (!expectedProposalNullifier) {
        throw new Error("expectedProposalNullifier is required");
      }
      if (!proposalId) {
        throw new Error("proposalId is required");
      }

      if (!ethers.isAddress(recipient)) {
        throw new Error("recipient must be a valid Ethereum address");
      }

      const amountNumber = Number(amount);
      if (isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error("amount must be a positive number");
      }

      const amountInWei = ethers.parseEther(amount.toString());

      console.log("[FRONTEND/useRelayerDistributeFunding] Data received:", {
        groupId,
        contextKey,
        recipient,
        amount: amount,
        amountInWei: amountInWei.toString(),
        fundingType,
        expectedProposalNullifier,
        proposalId,
      });

      console.log(
        "[FRONTEND/useRelayerDistributeFunding] Converting groupId to bytes32 format"
      );
      console.log("Group ID to be converted:", groupId);
      const groupKeyBytes32 = uuidToBytes32(groupId);
      console.log(
        "[FRONTEND/useRelayerDistributeFunding] Group Key Bytes32:",
        groupKeyBytes32
      );

      const { data, error } = await supabase.functions.invoke(
        "relayer-distribute-funding",
        {
          body: {
            group_key: groupKeyBytes32.toString(),
            context_key: contextKey.toString(),
            to: recipient,
            amount: amountInWei.toString(),
            funding_type: fundingType,
            expected_proposal_nullifier: expectedProposalNullifier.toString(),
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      console.log(
        "[FRONTEND/useRelayerDistributeFunding] Edge function response:",
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

      if (!data) {
        throw new Error("No response data received from edge function");
      }

      console.log(
        "[FRONTEND/useRelayerDistributeFunding] Funding distribution successful:",
        data
      );

      if (proposalId) {
        try {
          const requestedStatusId = getRequestedStatusId();
          await updateProposalStatus({
            proposalId: proposalId,
            statusId: requestedStatusId,
          });
          console.log(
            `[FRONTEND/useRelayerDistributeFunding] Proposal ${proposalId} status updated to "requested".`
          );
        } catch (updateError) {
          console.error(
            `[FRONTEND/useRelayerDistributeFunding] Failed to update proposal ${proposalId} status to "requested":`,
            updateError
          );
        }
      }

      return data;
    },
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["proposals"] });
        queryClient.invalidateQueries({ queryKey: ["pendingInboxProposals"] });
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === "proposals",
        });
      }, 500);
    },
  });

  return {
    distributeFunding: distributeFundingMutation.mutateAsync,
    isDistributing: distributeFundingMutation.isPending,
    error: distributeFundingMutation.error,
    reset: distributeFundingMutation.reset,
  };
}
