import { useState, useEffect, useCallback } from "react";
import { getERC721TokenSupply } from "../../relayers/userRelayerGetERC721TokenSupply";
import { getLeavesByGroupId } from "../../../services/apiMerkleTreeLeaves";

/**
 * React hook to validate if all group members have generated credentials
 * by comparing ERC721 total supply with database commitments count
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
      const totalMembers = await getERC721TokenSupply(contractAddress, groupId);

      const leaves = await getLeavesByGroupId({ groupId });
      const commitmentsCount = leaves.length;

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
