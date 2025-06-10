import { supabase } from "./supabase";

export async function insertProof({ groupMemberId, groupId, circuitType, nullifierHash, proof, publicSignals }) {
  if (!groupMemberId | !groupId | !circuitType || !nullifierHash || !proof || !publicSignals) {
    throw new Error("groupMemberId, groupId, circuitId, nullifier_hash, proof and public are required.");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("proofs")
    .insert({
      group_member_id: groupMemberId,
      group_id: groupId,
      circuit_type: circuitType,
      nullifier_hash: nullifierHash,
      proof: proof,
      public: publicSignals
    });
  if (error) throw new Error(error.message);

  return data;
}
