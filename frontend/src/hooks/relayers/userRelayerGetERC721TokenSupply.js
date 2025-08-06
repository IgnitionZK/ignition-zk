import { supabase } from "../../services/supabase";

/**
 * Gets the total supply of tokens from an ERC721 contract via the edge function
 * @param {string} contractAddress - The address of the ERC721 contract
 * @param {string} groupId - The ID of the group
 * @returns {Promise<number>} The total supply of tokens
 * @throws {Error} If there's an error calling the edge function
 */
export async function getERC721TokenSupply(contractAddress, groupId) {
  if (!contractAddress || !groupId) {
    throw new Error("Contract address and group ID are required");
  }

  try {
    // Get the current session for authentication
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(`Authentication error: ${sessionError.message}`);
    }

    if (!session) {
      throw new Error("No active session. Please log in.");
    }

    // Call the edge function
    const { data, error } = await supabase.functions.invoke(
      "relayer-ERC721-get-token-supply",
      {
        body: {
          contractAddress,
          groupId,
        },
      }
    );

    if (error) {
      throw new Error(`Edge function error: ${error.message}`);
    }

    if (!data || typeof data.totalSupply !== "number") {
      throw new Error("Invalid response from edge function");
    }

    return data.totalSupply;
  } catch (error) {
    console.error("Error getting ERC721 token supply:", error);
    throw new Error(`Failed to get token supply: ${error.message}`);
  }
}
