import { supabase } from "./supabase";

export async function insertProof({
  proposalId,
  proof,
  publicInputs,
  groupId,
  groupMemberId,
  nullifierHash,
}) {
  if (!proposalId) {
    throw new Error("proposalId is required");
  }
  if (!proof) {
    throw new Error("proof is required");
  }
  if (!publicInputs) {
    throw new Error("publicInputs is required");
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
      proof: proof,
      public: publicInputs,
      circuit_id: "898fa405-69e5-4615-8da4-63b13a2b0012",
      circuit_type: "membership",
      group_id: groupId,
      group_member_id: groupMemberId,
      nullifier_hash: nullifierHash,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
