import { useMutation } from "@tanstack/react-query";
import { supabase } from "../../services/supabase";

/**
 * Custom hook to verify membership using the Supabase edge function relayer
 *
 * @returns {Object} An object containing:
 *   @property {Function} verifyMembership - Function to trigger the membership verification
 *   @property {boolean} isLoading - Whether the verification is currently in progress
 *   @property {boolean} isError - Whether the last verification attempt resulted in an error
 *   @property {boolean} isSuccess - Whether the last verification attempt was successful
 *   @property {Object} error - Error object if the verification failed
 *   @property {Object} data - Response data from the successful verification
 *
 * @example
 * const { verifyMembership, isLoading, isError, error, data } = useRelayerVerifyMembership();
 *
 * // Usage
 * verifyMembership({
 *   proof: [/* 24 uint256 values *\/],
 *   publicSignals: [/* 2 uint256 values *\/],
 *   groupKey: "0x123..."
 * }, {
 *   onSuccess: (data) => console.log('Membership verified:', data),
 *   onError: (error) => console.error('Verification failed:', error)
 * });
 */
export function useRelayerVerifyMembership() {
  const verifyMembershipMutation = useMutation({
    mutationFn: async ({ proof, publicSignals, groupKey }) => {
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
      if (!proof) {
        throw new Error("proof is required");
      }
      if (!publicSignals) {
        throw new Error("publicSignals is required");
      }
      if (!groupKey) {
        throw new Error("groupKey is required");
      }

      // Validate proof array length (should be 24 uint256 values)
      if (!Array.isArray(proof) || proof.length !== 24) {
        throw new Error("proof must be an array of 24 uint256 values");
      }

      // Validate publicSignals array length (should be 2 uint256 values)
      if (!Array.isArray(publicSignals) || publicSignals.length !== 2) {
        throw new Error("publicSignals must be an array of 2 uint256 values");
      }

      // LOG: Data received by relayer hook
      console.log("[FRONTEND/useRelayerVerifyMembership] Data received:", {
        proof: proof.length,
        publicSignals: publicSignals.length,
        groupKey,
      });

      // Call the Supabase edge function
      const { data, error } = await supabase.functions.invoke(
        "relayer-verify-membership",
        {
          body: {
            proof: proof.map((item) => item.toString()),
            publicSignals: publicSignals.map((item) => item.toString()),
            groupKey: groupKey.toString(),
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      // LOG: Response from edge function
      console.log(
        "[FRONTEND/useRelayerVerifyMembership] Edge function response:",
        data,
        error
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

  const verifyMembership = (params, callbacks = {}) => {
    const { onSuccess, onError } = callbacks;

    return verifyMembershipMutation.mutate(params, {
      onSuccess: (data) => {
        if (onSuccess) {
          onSuccess(data);
        }
      },
      onError: (error) => {
        console.error("Membership verification failed:", error);
        if (onError) {
          onError(error);
        }
      },
    });
  };

  return {
    verifyMembership,
    isLoading: verifyMembershipMutation.isPending,
    isError: verifyMembershipMutation.isError,
    isSuccess: verifyMembershipMutation.isSuccess,
    error: verifyMembershipMutation.error,
    data: verifyMembershipMutation.data,
  };
}
