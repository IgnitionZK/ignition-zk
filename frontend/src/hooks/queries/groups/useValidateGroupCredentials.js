import { useState, useEffect, useCallback } from "react";
import { getERC721TokenSupply } from "../../relayers/userRelayerGetERC721TokenSupply";
import { getLeavesByGroupId } from "../../../services/apiMerkleTreeLeaves";

/**
 * React hook to validate if all group members have generated credentials
 * by comparing ERC721 total supply with database commitments count
 *
 * @param {string} contractAddress - The ERC721 contract address
 * @param {string} groupId - The group ID
 * @param {boolean} enabled - Whether to run the validation (default: true)
 * @returns {Object} Object containing validation state and functions
 * @property {boolean} isLoading - Whether validation is in progress
 * @property {boolean} isValid - Whether all members have generated credentials
 * @property {number} totalMembers - Total number of members from ERC721
 * @property {number} commitmentsCount - Number of commitments in database
 * @property {string} message - Human-readable validation message
 * @property {string|null} error - Error message if validation failed
 * @property {Function} validate - Function to manually trigger validation
 */
export function useValidateGroupCredentials(
  contractAddress,
  groupId,
  enabled = true
) {
  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [totalMembers, setTotalMembers] = useState(0);
  const [commitmentsCount, setCommitmentsCount] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);

  const validate = useCallback(async () => {
    if (!contractAddress || !groupId || !enabled) {
      setError("Missing required parameters for validation");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get total supply from ERC721 contract via edge function
      const totalMembers = await getERC721TokenSupply(contractAddress, groupId);

      // Get commitments count from database
      const leaves = await getLeavesByGroupId({ groupId });
      const commitmentsCount = leaves.length;

      // Handle case where no tokens have been minted
      if (totalMembers === 0) {
        setError(
          "No members have been minted in the ERC721 contract. Please ensure group members have been added to the contract before creating campaigns."
        );
        setIsValid(false);
        setTotalMembers(0);
        setCommitmentsCount(commitmentsCount);
        setMessage("No members found in ERC721 contract");
        return;
      }

      const isValid = totalMembers === commitmentsCount;

      let message;
      if (isValid) {
        message = `All ${totalMembers} group members have generated their credentials. Campaign creation is allowed.`;
      } else {
        message = `Only ${commitmentsCount} out of ${totalMembers} group members have generated credentials. All members must generate credentials before creating a campaign.`;
      }

      setIsValid(isValid);
      setTotalMembers(totalMembers);
      setCommitmentsCount(commitmentsCount);
      setMessage(message);
    } catch (err) {
      setError(err.message);
      setIsValid(false);
      setTotalMembers(0);
      setCommitmentsCount(0);
      setMessage("");
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, groupId, enabled]);

  // Auto-validate when dependencies change
  useEffect(() => {
    if (enabled && contractAddress && groupId) {
      validate();
    }
  }, [validate, enabled, contractAddress, groupId]);

  return {
    isLoading,
    isValid,
    totalMembers,
    commitmentsCount,
    message,
    error,
    validate,
  };
}
