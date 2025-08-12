import { supabase } from "./supabase";
import { getStatusId } from "./apiProposalStatus";

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

/**
 * Inserts a new proposal into the database
 * @param {Object} params - The parameters object
 * @param {string} params.epochId - The ID of the epoch/campaign for this proposal
 * @param {string} params.groupId - The ID of the group this proposal belongs to
 * @param {string} params.groupMemberId - The ID of the group member creating the proposal
 * @param {string} params.title - The title of the proposal
 * @param {string} params.description - The description of the proposal
 * @param {Object} params.metadata - The metadata object (e.g., IPFS CID)
 * @param {Object} params.payload - The payload object containing execution details
 * @param {Object} params.funding - The funding object containing amount and currency
 * @param {string} params.claimHash - The claim hash for the proposal (optional)
 * @param {string} params.statusId - The status ID for the proposal (optional, defaults to active status)
 * @param {string} params.contextKey - The context key for the proposal (computed from group and epoch)
 * @returns {Promise<Object>} The newly created proposal object
 * @throws {Error} If required parameters are missing or if there's a database error
 */
export async function insertProposal({
  epochId,
  groupId,
  groupMemberId,
  title,
  description,
  metadata,
  payload,
  funding,
  claimHash = null,
  statusId = null,
  contextKey = null,
}) {
  if (!epochId) {
    throw new Error("epochId is required");
  }
  if (!groupId) {
    throw new Error("groupId is required");
  }
  if (!groupMemberId) {
    throw new Error("groupMemberId is required");
  }
  if (!title) {
    throw new Error("title is required");
  }
  if (!description) {
    throw new Error("description is required");
  }
  if (!metadata) {
    throw new Error("metadata is required");
  }
  if (!payload) {
    throw new Error("payload is required");
  }
  if (!funding) {
    throw new Error("funding is required");
  }

  // Get the status_id for "active" status if not provided
  let finalStatusId = statusId;
  if (!finalStatusId) {
    try {
      finalStatusId = await getStatusId("active");
      console.log("Retrieved active status ID:", finalStatusId);
    } catch (statusError) {
      console.warn(
        "Could not get active status ID, trying without status_id:",
        statusError.message
      );
      // Try without status_id - the database might have a default
      finalStatusId = undefined;
    }
  }

  console.log("Inserting proposal with status_id:", finalStatusId);
  console.log("Insert data:", {
    epoch_id: epochId,
    group_id: groupId,
    group_member_id: groupMemberId,
    title,
    description,
    metadata,
    payload,
    funding,
    claim_hash: claimHash,
    status_id: finalStatusId,
    context_key: contextKey,
  });

  const insertData = {
    epoch_id: epochId,
    group_id: groupId,
    group_member_id: groupMemberId,
    title,
    description,
    metadata,
    payload,
    funding,
    claim_hash: claimHash,
    context_key: contextKey,
  };

  // Only include status_id if it's not undefined
  if (finalStatusId !== undefined) {
    insertData.status_id = finalStatusId;
  }

  // Try without .single() first to see what we get
  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("proposals")
    .insert(insertData)
    .select("*");

  console.log("Insert result:", { data, error });
  console.log("Data type:", typeof data);
  console.log("Is array:", Array.isArray(data));
  console.log(
    "Data length:",
    data
      ? Array.isArray(data)
        ? data.length
        : Object.keys(data).length
      : "null/undefined"
  );

  if (error) {
    console.error("Database error:", error);
    throw new Error(error.message);
  }

  // If data is an array, take the first item
  if (Array.isArray(data) && data.length > 0) {
    console.log("Returning first item from array:", data[0]);
    return data[0];
  }

  // If data is an object, return it directly
  if (data && typeof data === "object" && !Array.isArray(data)) {
    console.log("Returning object directly:", data);
    return data;
  }

  console.warn("No data returned from insert");
  return null;
}

/**
 * Fetches a proposal by its identifying fields
 * @param {Object} params - The parameters object
 * @param {string} params.epochId - The ID of the epoch/campaign for this proposal
 * @param {string} params.groupId - The ID of the group this proposal belongs to
 * @param {string} params.groupMemberId - The ID of the group member who created the proposal
 * @param {string} params.title - The title of the proposal
 * @returns {Promise<Object>} The proposal object
 * @throws {Error} If required parameters are missing or if there's a database error
 * @example
 * const proposal = await getProposalByIdentifiers({
 *   epochId: '123',
 *   groupId: '456',
 *   groupMemberId: '789',
 *   title: 'My Proposal'
 * });
 */
export async function getProposalByIdentifiers({
  epochId,
  groupId,
  groupMemberId,
  title,
}) {
  if (!epochId) {
    throw new Error("epochId is required");
  }
  if (!groupId) {
    throw new Error("groupId is required");
  }
  if (!groupMemberId) {
    throw new Error("groupMemberId is required");
  }
  if (!title) {
    throw new Error("title is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("proposals")
    .select("*")
    .eq("epoch_id", epochId)
    .eq("group_id", groupId)
    .eq("group_member_id", groupMemberId)
    .eq("title", title)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Retrieves pending inbox proposals by group ID(s) from the database using an RPC function
 * This function returns proposals that are active AND have no associated voting proof
 * @param {Object} params - The parameters object
 * @param {string|string[]} params.groupId - Single group ID or array of group IDs to fetch proposals for
 * @returns {Promise<Array<Object>|null>} Array of proposal objects with group names and status types, or null if no proposals found
 * @throws {Error} If groupId is not provided or if there's a database error
 * @example
 * // Get pending proposals for a single group
 * const proposals = await getPendingInboxProposals({ groupId: '123' });
 *
 * // Get pending proposals for multiple groups
 * const proposals = await getPendingInboxProposals({ groupId: ['123', '456'] });
 */
export async function getPendingInboxProposals({ groupId }) {
  if (!groupId) {
    throw new Error("groupId is required");
  }

  // Convert single groupId to array if it's not already
  const groupIds = Array.isArray(groupId) ? groupId : [groupId];

  const { data, error } = await supabase
    .schema("ignitionzk")
    .rpc("get_pending_inbox_proposals", {
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
