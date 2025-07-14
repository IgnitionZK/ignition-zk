import { supabase } from "./supabase";

/**
 * Retrieves epochs that a user is a member of through group membership.
 * Queries the epochs table and joins with groups and group_members to find
 * epochs where the specified user is a member of at least one group.
 *
 * @param {string} userId - The user ID to search for
 * @returns {Promise<Array>} A promise that resolves to an array of epoch objects with group information
 * @throws {Error} If userId parameter is missing or if there's a database error
 *
 * @example
 * // Get all epochs where user "user123" is a member
 * const epochs = await getEpochByUserId("user123");
 */
export async function getEpochByUserId(userId) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("epochs")
    .select(
      `
    epoch_id,
    epoch_name,
    epoch_start_time,
    epoch_duration,
    groups (
      group_id,
      name,
      group_members (
        user_id
      )
    )
  `
    )
    .eq("groups.group_members.user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
