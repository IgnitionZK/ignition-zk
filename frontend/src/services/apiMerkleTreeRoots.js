import { supabase } from "./supabase";

/**
 * Retrieves the single active Merkle tree root for a specific group.
 * @param {Object} params - The parameters object
 * @param {string} params.groupId - The UUID of the group to get the active root for
 * @returns {Promise<Object|null>} The active Merkle tree root object with fields, or null if none exists
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
 * Inserts a new Merkle tree root into the database. The root is inserted with is_active set to false by default.
 * @param {Object} params - The parameters object
 * @param {string} params.groupId - The UUID of the group this root belongs to
 * @param {string|BigInt} params.rootHash - The hash of the Merkle tree root
 * @param {number} params.treeVersion - The version number of the tree
 * @returns {Promise<Object>} The newly created Merkle tree root object with fields
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
 * Updates the active status of a Merkle tree root. This is typically used to toggle between active and inactive states.
 * @param {Object} params - The parameters object
 * @param {string|number} params.rootId - The ID of the root to update
 * @param {boolean} params.isActive - The new active status to set
 * @returns {Promise<Object>} The updated Merkle tree root object with fields
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

/**
 * Atomically toggles the active status of Merkle tree roots for a group.
 * Deactivates all current active roots and activates the specified new root.
 * @param {Object} params - The parameters object
 * @param {string} params.groupId - The UUID of the group
 * @param {string|number} params.newRootId - The ID of the new root to activate
 * @returns {Promise<void>} Promise that resolves when the operation is complete
 * @throws {Error} If required parameters are missing or if there's a database error
 */
export async function toggleMerkleTreeRootActive({ groupId, newRootId }) {
  if (!groupId || !newRootId) {
    throw new Error("groupId and newRootId are required");
  }

  const { error } = await supabase.rpc("toggle_merkle_root_active", {
    p_group_id: groupId,
    p_new_root_id: newRootId,
  });

  if (error) {
    throw new Error(error.message);
  }
}
