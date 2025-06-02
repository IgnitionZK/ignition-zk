import { supabase } from "./supabase";

export async function insertLeaf({ groupMemberId, commitment, groupId }) {
  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("merkle_tree_leaves")
    .insert({
      group_member_id: groupMemberId,
      commitment_value: commitment,
      group_id: groupId,
    });
  if (error) throw new Error(error.message);

  return data;
}
