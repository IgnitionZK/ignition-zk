import { useMutation } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";
import { insertGroupMember } from "../../services/apiGroupMembers";
import { uuidToBytes32 } from "../../scripts/utils/uuidToBytes32";

/**
 * Custom hook to deploy an ERC721 contract using the Supabase edge function relayer.
 * Handles authentication, parameter validation, contract deployment, and automatically
 * adds the group creator to the group_members table upon successful deployment.
 */
export function useRelayerDeployERC721() {
  const deployERC721Mutation = useMutation({
    mutationFn: async ({
      groupId,
      tokenName,
      tokenSymbol,
      memberAddresses,
      userId,
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

      // Validate required parameters
      if (!groupId) {
        throw new Error("groupId is required");
      }
      if (!tokenName) {
        throw new Error("tokenName is required");
      }
      if (!tokenSymbol) {
        throw new Error("tokenSymbol is required");
      }
      if (!userId) {
        throw new Error("userId is required");
      }

      if (memberAddresses && !Array.isArray(memberAddresses)) {
        throw new Error("memberAddresses must be an array");
      }

      const groupKeyBytes32 = uuidToBytes32(groupId);

      const { data, error } = await supabase.functions.invoke(
        "relayer-deploy-erc721",
        {
          body: {
            groupKey: groupKeyBytes32.toString(),
            name: tokenName,
            symbol: tokenSymbol,
            memberAddresses: memberAddresses || [],
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

      console.log("Edge function response:", data);

      if (data.deployedNftAddress) {
        try {
          console.log("Adding group creator to group_members table...");
          const groupMemberData = await insertGroupMember({
            userId: userId,
            groupId: groupId,
          });
          console.log("Group creator added to group_members:", groupMemberData);

          data.groupMemberData = groupMemberData;
        } catch (groupMemberError) {
          console.error(
            "Failed to add group creator to group_members:",
            groupMemberError
          );

          data.groupMemberError = groupMemberError.message;
        }
      }

      return data;
    },
  });

  const deployERC721 = (params, callbacks = {}) => {
    const { onSuccess, onError } = callbacks;

    return deployERC721Mutation.mutate(params, {
      onSuccess: (data) => {
        if (onSuccess) {
          onSuccess(data);
        }
      },
      onError: (error) => {
        console.error("ERC721 deployment failed:", error);
        if (onError) {
          onError(error);
        }
      },
    });
  };

  return {
    deployERC721,
    isLoading: deployERC721Mutation.isPending,
    isError: deployERC721Mutation.isError,
    isSuccess: deployERC721Mutation.isSuccess,
    error: deployERC721Mutation.error,
    data: deployERC721Mutation.data,
  };
}
