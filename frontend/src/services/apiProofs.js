import { supabase } from "./supabase";

/**
 * Inserts a new proof record into the database.
 * @param {Object} params - The parameters for the proof
 * @param {string} params.proposalId - The ID of the proposal this proof is for
 * @param {string} params.groupId - The ID of the group this proof belongs to
 * @param {string} params.groupMemberId - The ID of the group member who created this proof
 * @param {string} params.nullifierHash - The nullifier hash of the proof
 * @param {string} params.circuitType - The type of circuit used (e.g., "proposal", "voting", "membership", "claim")
 * @param {Array<string>} [params.proof] - The proof array (required for voting circuit, optional for others)
 * @param {Array<string>} [params.publicSignals] - The public signals array (required for voting circuit, optional for others)
 * @param {string} [params.contextKey] - The context key for the proof (computed from group, epoch, proposal)
 * @returns {Promise<Object>} The inserted proof record with database fields (proposal_id, circuit_id, group_id, group_member_id, nullifier_hash, is_verified, context_key, proof, public_signals)
 * @throws {Error} If any required parameter is missing, if circuit type is unknown, or if the database operation fails
 */
export async function insertProof({
  proposalId,
  groupId,
  groupMemberId,
  nullifierHash,
  circuitType,
  proof,
  publicSignals,
  contextKey,
}) {
  console.log("🔍 insertProof called with parameters:", {
    proposalId,
    groupId,
    groupMemberId,
    nullifierHash,
    circuitType,
    proof: proof ? `${proof.length} elements` : undefined,
    publicSignals: publicSignals
      ? `${publicSignals.length} elements`
      : undefined,
    contextKey,
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
    claim: "587c8dfa-5566-4458-ab96-c439542343c9",
  };

  const circuitId = circuitIdMap[circuitType];
  if (!circuitId) {
    throw new Error(`Unknown circuit type: ${circuitType}`);
  }

  const insertData = {
    proposal_id: proposalId,
    circuit_id: circuitId,
    group_id: groupId,
    group_member_id: groupMemberId,
    nullifier_hash: nullifierHash,
    is_verified: true,
  };

  // Add contextKey if provided
  if (contextKey) {
    insertData.context_key = contextKey;
  }

  // Add proof and public_signals for voting circuit (required by database constraint)
  if (circuitType === "voting") {
    if (!proof) {
      throw new Error("proof is required for voting circuit");
    }
    if (!publicSignals) {
      throw new Error("publicSignals is required for voting circuit");
    }
    insertData.proof = proof;
    insertData.public_signals = publicSignals;
  }

  console.log("insertProof - Data to be inserted:", insertData);
  console.log("insertProof - Circuit ID mapped:", circuitId);

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("proofs")
    .insert(insertData)
    .select()
    .single();

  console.log("insertProof - Supabase response:", { data, error });

  if (error) {
    console.error("insertProof - Database error:", error);
    throw new Error(error.message);
  }

  console.log("insertProof - Successfully inserted proof:", data);
  return data;
}

/**
 * Retrieves all proofs associated with one or more group member IDs.
 * @param {string|string[]} groupMemberId - A single group member ID or an array of group member IDs
 * @returns {Promise<Array<Object>>} An array of proof records with database fields
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

/**
 * Retrieves all proofs associated with a specific proposal ID.
 * @param {string} proposalId - The ID of the proposal
 * @returns {Promise<Array<Object>>} An array of proof records with database fields
 * @throws {Error} If proposalId is not provided or if the database operation fails
 */
export async function getProofsByProposalId(proposalId) {
  if (!proposalId) {
    throw new Error("proposalId is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("proofs")
    .select("*")
    .eq("proposal_id", proposalId);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Retrieves the proposal submission nullifier for a specific proposal.
 * @param {string} proposalId - The ID of the proposal
 * @returns {Promise<string|null>} The proposal submission nullifier hash, or null if no proof is found
 * @throws {Error} If proposalId is not provided or if the database operation fails (excluding "not found" cases)
 */
export async function getProposalSubmissionNullifier(proposalId) {
  if (!proposalId) {
    throw new Error("proposalId is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("proofs")
    .select("nullifier_hash")
    .eq("proposal_id", proposalId)
    .eq("circuit_id", "a1a0a504-e3aa-4e5d-bb9f-bbd98aefbd52") // proposal circuit uuid
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      console.log(
        `getProposalSubmissionNullifier - No proposal submission proof found for proposal_id: ${proposalId}`
      );
      return null;
    }
    console.error(`getProposalSubmissionNullifier - Database error:`, error);
    throw new Error(error.message);
  }

  return data?.nullifier_hash || null;
}
