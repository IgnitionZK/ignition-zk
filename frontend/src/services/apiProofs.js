import { supabase } from "./supabase";

/**
 * Inserts a new proof record into the database.
 * @param {Object} params - The parameters for the proof
 * @param {string} params.proposalId - The ID of the proposal this proof is for
 * @param {string} params.groupId - The ID of the group this proof belongs to
 * @param {string} params.groupMemberId - The ID of the group member who created this proof
 * @param {string} params.nullifierHash - The nullifier hash of the proof
 * @param {string} params.circuitType - The type of circuit used (e.g., "proposal", "voting", "membership")
 * @returns {Promise<Object>} The inserted proof record
 * @throws {Error} If any required parameter is missing or if the database operation fails
 */
export async function insertProof({
  proposalId,
  groupId,
  groupMemberId,
  nullifierHash,
  circuitType,
}) {
  console.log("🔍 insertProof called with parameters:", {
    proposalId,
    groupId,
    groupMemberId,
    nullifierHash,
    circuitType,
  });

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
  if (!circuitType) {
    throw new Error("circuitType is required");
  }

  // Map circuit types to their corresponding UUIDs
  const circuitIdMap = {
    proposal: "a1a0a504-e3aa-4e5d-bb9f-bbd98aefbd52",
    voting: "4cf28644-3d5c-4a09-b96d-d3138503ee7d",
    membership: "898fa405-69e5-4615-8da4-63b13a2b0012",
  };

  const circuitId = circuitIdMap[circuitType];
  if (!circuitId) {
    throw new Error(`Unknown circuit type: ${circuitType}`);
  }

  const insertData = {
    proposal_id: proposalId,
    circuit_id: circuitId,
    group_id: groupId,
    circuit_type: circuitType,
    group_member_id: groupMemberId,
    nullifier_hash: nullifierHash,
    is_verified: true,
  };

  console.log("📝 insertProof - Data to be inserted:", insertData);
  console.log("🔗 insertProof - Circuit ID mapped:", circuitId);

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("proofs")
    .insert(insertData)
    .select()
    .single();

  console.log("✅ insertProof - Supabase response:", { data, error });

  if (error) {
    console.error("❌ insertProof - Database error:", error);
    throw new Error(error.message);
  }

  console.log("🎉 insertProof - Successfully inserted proof:", data);
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
