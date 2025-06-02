import { supabase } from "./supabase";

/**
 * Retrieves the group member ID for a given user ID
 * @param {Object} params - The parameters object
 * @param {string} params.userId - The ID of the user to get the group member ID for
 * @returns {Promise<string>} The group member ID
 * @throws {Error} If userId is not provided or if there's a database error
 */
export async function getGroupMemberId({ userId }) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("group_members")
    .select("group_member_id")
    .eq("user_id", userId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data?.group_member_id;
}

/**
 * Retrieves all group IDs that a user is a member of
 * @param {Object} params - The parameters object
 * @param {string} params.userId - The ID of the user to get group memberships for
 * @returns {Promise<string[]>} Array of group IDs that the user is a member of
 * @throws {Error} If userId is not provided or if there's a database error
 */
export async function getAllGroupIdsForGroupMember({ userId }) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return data.map((item) => item.group_id);
}

export async function getUserGroups({ userId }) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("group_members")
    .select(
      `
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

  // Flatten: pull out only the `groups` array
  return data.map((row) => row.groups);
}
