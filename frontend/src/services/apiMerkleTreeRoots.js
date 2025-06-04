import { supabase } from "./supabase";

export async function getActiveMerkleTreeRoot({ groupId }) {
  if (!groupId) {
    throw new Error("groupId is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("merkle_tree_roots")
    .select("*")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(error.message);
  }

  return data;
}

export async function insertMerkleTreeRoot({ groupId, rootHash, treeVersion }) {
  if (!groupId || !rootHash || treeVersion === undefined) {
    throw new Error("groupId, rootHash, and treeVersion are required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("merkle_tree_roots")
    .insert({
      group_id: groupId,
      root_hash: rootHash,
      tree_version: treeVersion,
      is_active: false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateMerkleTreeRootActiveStatus({ rootId, isActive }) {
  if (!rootId || isActive === undefined) {
    throw new Error("rootId and isActive are required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("merkle_tree_roots")
    .update({ is_active: isActive })
    .eq("root_id", rootId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
