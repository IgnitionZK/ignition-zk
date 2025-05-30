import { supabase } from "./supabase";

export async function insertLeaf({ groupMemberId, commitment }) {
  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("merkle_tree_leaves")
    .insert({
      group_member_id: groupMemberId,
      commitment_value: commitment,
    });
  if (error) throw new Error(error.message);

  return data;
}
