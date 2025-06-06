import { supabase } from "./supabase";

/**
 * Retrieves the group member ID for a given user ID
 * @param {Object} params - The parameters object
 * @param {string} params.userId - The ID of the user to get the group member ID for
 * @param {string} params.groupId - The ID of the group to get the group member ID for
 * @returns {Promise<string>} The group member ID
 * @throws {Error} If userId is not provided or if there's a database error
 */
export async function getGroupMemberId({ userId, groupId }) {
  if (!userId) {
    throw new Error("userId is required");
  }
  if (!groupId) {
    throw new Error("groupId is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("group_members")
    .select("group_member_id")
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data?.group_member_id;
}

/**
 * Retrieves all groups that a user is a member of
 * @param {Object} params - The parameters object
 * @param {string} params.userId - The ID of the user to get groups for
 * @returns {Promise<Array<Object>>} Array of group objects containing group details and group_member_id
 * @throws {Error} If userId is not provided or if there's a database error
 */
export async function getUserGroups({ userId }) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("group_members")
    .select(
      `
      group_member_id,
      group_id,
      groups (
        group_id,
        erc721_contract_address,
        name,
        created_at
      )
    `
    )
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  // Return both group info and group_member_id
  return data.map((row) => ({
    ...row.groups,
    group_member_id: row.group_member_id,
  }));
}

/**
 * Checks if a commitment exists for a given group member
 * @param {Object} params - The parameters object
 * @param {string} params.groupMemberId - The ID of the group member to check for
 * @returns {Promise<boolean>} True if an active commitment exists, false otherwise
 * @throws {Error} If groupMemberId is not provided or if there's a database error
 */
export async function checkCommitmentExists({ groupMemberId }) {
  if (!groupMemberId) {
    throw new Error("groupMemberId is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("merkle_tree_leaves")
    .select("commitment_id")
    .eq("group_member_id", groupMemberId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned - this means no commitment exists
      return false;
    }
    throw new Error(error.message);
  }

  return !!data; // Returns true if commitment exists, false otherwise
}

/**
 * Inserts a new group member into the database
 * @param {Object} params - The parameters object
 * @param {string} params.userId - The ID of the user to add as a group member
 * @param {string} params.groupId - The ID of the group to add the user to
 * @returns {Promise<Object>} The newly created group member record
 * @throws {Error} If userId or groupId are not provided or if there's a database error
 */
export async function insertGroupMember({ userId, groupId }) {
  if (!userId || !groupId) {
    throw new Error("userId and groupId are required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("group_members")
    .insert({
      user_id: userId,
      group_id: groupId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
