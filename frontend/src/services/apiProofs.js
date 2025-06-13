import { supabase } from "./supabase";

/**
 * Inserts a new proof record into the database.
 * @param {Object} params - The parameters for the proof
 * @param {string} params.proposalId - The ID of the proposal this proof is for
 * @param {string} params.groupId - The ID of the group this proof belongs to
 * @param {string} params.groupMemberId - The ID of the group member who created this proof
 * @param {string} params.nullifierHash - The nullifier hash of the proof
 * @returns {Promise<Object>} The inserted proof record
 * @throws {Error} If any required parameter is missing or if the database operation fails
 */
export async function insertProof({
  proposalId,
  groupId,
  groupMemberId,
  nullifierHash,
}) {
  if (!proposalId) {
    throw new Error("proposalId is required");
  }
  if (!groupId) {
    throw new Error("groupId is required");
  }
  if (!groupMemberId) {
    throw new Error("groupMemberId is required");
  }
  if (!nullifierHash) {
    throw new Error("nullifierHash is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("proofs")
    .insert({
      proposal_id: proposalId,
      circuit_type: "voting",
      group_id: groupId,
      group_member_id: groupMemberId,
      nullifier_hash: nullifierHash,
      is_verified: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Retrieves all proofs associated with one or more group member IDs.
 * @param {string|string[]} groupMemberId - A single group member ID or an array of group member IDs
 * @returns {Promise<Array<Object>>} An array of proof records
 * @throws {Error} If groupMemberId is not provided or if the database operation fails
 */
export async function getProofsByGroupMemberId(groupMemberId) {
  if (!groupMemberId) {
    throw new Error("groupMemberId is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("proofs")
    .select("*")
    .in(
      "group_member_id",
      Array.isArray(groupMemberId) ? groupMemberId : [groupMemberId]
    );

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
