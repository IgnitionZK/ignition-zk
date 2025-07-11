import { supabase } from "./supabase";

/**
 * Retrieves proposals by group ID(s) from the database using an RPC function
 * @param {Object} params - The parameters object
 * @param {string|string[]} params.groupId - Single group ID or array of group IDs to fetch proposals for
 * @returns {Promise<Array<Object>|null>} Array of proposal objects with group names and status types, or null if no proposals found
 * @throws {Error} If groupId is not provided or if there's a database error
 * @example
 * // Get proposals for a single group
 * const proposals = await getProposalsByGroupId({ groupId: '123' });
 *
 * // Get proposals for multiple groups
 * const proposals = await getProposalsByGroupId({ groupId: ['123', '456'] });
 */
export async function getProposalsByGroupId({ groupId }) {
  if (!groupId) {
    throw new Error("groupId is required");
  }

  // Convert single groupId to array if it's not already
  const groupIds = Array.isArray(groupId) ? groupId : [groupId];

  const { data, error } = await supabase
    .schema("ignitionzk")
    .rpc("get_proposals_with_details", {
      p_group_ids: groupIds,
    }); // Call the RPC function with explicit schema

  if (error) {
    if (error.code === "PGRST116") {
      // This error code typically means "no rows found", so return null
      return null;
    }
    throw new Error(error.message);
  }

  // The RPC function already returns the data in the desired format,
  // so no further transformation is needed here for group_name or status_type.
  return data;
}

/**
 * Updates the status type of a proposal in the database
 * @param {Object} params - The parameters object
 * @param {string} params.proposalId - The ID of the proposal to update
 * @param {string} params.statusType - The new status type to set for the proposal
 * @returns {Promise<Object>} The updated proposal object
 * @throws {Error} If proposalId or statusType is not provided, or if there's a database error
 * @example
 * const updatedProposal = await updateProposalStatus({
 *   proposalId: '123',
 *   statusType: 'approved'
 * });
 */
export async function updateProposalStatus({ proposalId, statusType }) {
  if (!proposalId) {
    throw new Error("proposalId is required");
  }
  if (!statusType) {
    throw new Error("statusType is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("proposals")
    .update({ status_type: statusType })
    .eq("proposal_id", proposalId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
