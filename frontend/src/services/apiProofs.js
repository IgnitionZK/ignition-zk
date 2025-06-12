import { supabase } from "./supabase";

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
