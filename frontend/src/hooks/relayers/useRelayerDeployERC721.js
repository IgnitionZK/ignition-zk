import { useMutation } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";

/**
 * Custom hook to deploy an ERC721 contract using the Supabase edge function relayer
 *
 * @returns {Object} An object containing:
 *   @property {Function} deployERC721 - Function to trigger the ERC721 deployment
 *   @property {boolean} isLoading - Whether the deployment is currently in progress
 *   @property {boolean} isError - Whether the last deployment attempt resulted in an error
 *   @property {boolean} isSuccess - Whether the last deployment attempt was successful
 *   @property {Object} error - Error object if the deployment failed
 *   @property {Object} data - Response data from the successful deployment
 *
 * @example
 * const { deployERC721, isLoading, isError, error, data } = useRelayerDeployERC721();
 *
 * // Usage
 * deployERC721({
 *   groupId: "123",
 *   tokenName: "MyToken",
 *   tokenSymbol: "MTK"
 * }, {
 *   onSuccess: (data) => console.log('ERC721 deployed:', data),
 *   onError: (error) => console.error('Deployment failed:', error)
 * });
 */
export function useRelayerDeployERC721() {
  const deployERC721Mutation = useMutation({
    mutationFn: async ({ groupId, tokenName, tokenSymbol }) => {
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
      if (!groupId) {
        throw new Error("groupId is required");
      }
      if (!tokenName) {
        throw new Error("tokenName is required");
      }
      if (!tokenSymbol) {
        throw new Error("tokenSymbol is required");
      }

      // Call the Supabase edge function
      const { data, error } = await supabase.functions.invoke(
        "relayer-deploy-erc721",
        {
          body: {
            groupKey: groupId.toString(), // Convert to string as expected by edge function
            name: tokenName,
            symbol: tokenSymbol,
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

      console.log("Edge function response:", data);
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
