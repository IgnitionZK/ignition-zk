import { supabase } from "./supabase";

/**
 * Retrieves the active Merkle tree root for a specific group.
 * @param {Object} params - The parameters object
 * @param {string} params.groupId - The ID of the group to get the active root for
 * @returns {Promise<Object|null>} The active Merkle tree root object, or null if none exists
 * @throws {Error} If groupId is not provided or if there's a database error
 */
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

/**
 * Inserts a new Merkle tree root into the database.
 * @param {Object} params - The parameters object
 * @param {string} params.groupId - The ID of the group this root belongs to
 * @param {string} params.rootHash - The hash of the Merkle tree root
 * @param {number} params.treeVersion - The version number of the tree
 * @returns {Promise<Object>} The newly created Merkle tree root object
 * @throws {Error} If required parameters are missing or if there's a database error
 */
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

/**
 * Updates the active status of a Merkle tree root.
 * @param {Object} params - The parameters object
 * @param {string} params.rootId - The ID of the root to update
 * @param {boolean} params.isActive - The new active status to set
 * @returns {Promise<Object>} The updated Merkle tree root object
 * @throws {Error} If required parameters are missing or if there's a database error
 */
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
