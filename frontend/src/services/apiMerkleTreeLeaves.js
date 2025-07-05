import { supabase } from "./supabase";

/**
 * Inserts a new leaf into the merkle tree leaves table
 * @param {Object} params - The parameters object
 * @param {string} params.groupMemberId - The ID of the group member
 * @param {string} params.commitment - The commitment value to be stored
 * @param {string} params.groupId - The ID of the group
 * @returns {Promise<Object>} The inserted data
 * @throws {Error} If there is an error during the database operation
 */
export async function insertLeaf({ groupMemberId, commitment, groupId }) {
  if (!groupMemberId || !commitment || !groupId) {
    throw new Error("groupMemberId, commitment and groupId are required.");
  }

  const insertData = {
    group_member_id: groupMemberId,
    commitment_value: commitment,
    group_id: groupId,
    is_active: true,
  };

  console.log("📝 insertLeaf - Data to be inserted:", insertData);

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("merkle_tree_leaves")
    .insert(insertData);

  if (error) {
    console.error("❌ insertLeaf - Database error:", error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Retrieves all merkle tree leaves for a specific group
 * @param {Object} params - The parameters object
 * @param {string} params.groupId - The ID of the group to fetch leaves for
 * @returns {Promise<Array<Object>>} Array of merkle tree leaves for the specified group
 * @throws {Error} If there is an error during the database operation
 */
export async function getLeavesByGroupId({ groupId }) {
  if (!groupId) {
    throw new Error("groupId is required.");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("merkle_tree_leaves")
    .select("*")
    .eq("group_id", groupId);

  if (error) throw new Error(error.message);

  return data;
}

/**
 * Retrieves an array of commitment values for a specific group, ordered by creation time
 * @param {Object} params - The parameters object
 * @param {string} params.groupId - The ID of the group to fetch commitments for
 * @returns {Promise<Array<{commitment_value: string}>>} Array of commitment values for the specified group
 * @throws {Error} If there is an error during the database operation or if groupId is not provided
 */
export async function getCommitmentArray({ groupId }) {
  if (!groupId) {
    throw new Error("groupId is required.");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("merkle_tree_leaves")
    .select("commitment_value")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return data;
}
