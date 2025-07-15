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

/**
 * Retrieves all epochs for a specific group.
 * Queries the epochs table to find all epochs associated with the given group ID.
 *
 * @param {string} groupId - The group ID to search for
 * @returns {Promise<Array>} A promise that resolves to an array of epoch objects
 * @throws {Error} If groupId parameter is missing or if there's a database error
 *
 * @example
 * // Get all epochs for group "group123"
 * const epochs = await getEpochsByGroupId("group123");
 */
export async function getEpochsByGroupId(groupId) {
  if (!groupId) {
    throw new Error("groupId is required");
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
      created_at
    `
    )
    .eq("group_id", groupId)
    .order("epoch_start_time", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Inserts a new epoch into the database
 * @param {Object} params - The parameters object
 * @param {string} params.group_id - The group ID for the epoch
 * @param {number} params.epoch_duration - The duration in days
 * @param {string} params.epoch_name - The name of the epoch
 * @param {Date} params.epoch_start_time - The start time of the epoch
 * @returns {Promise<Object>} The newly created epoch record
 * @throws {Error} If required parameters are missing or if there's a database error
 */
export async function insertEpoch({
  group_id,
  epoch_duration,
  epoch_name,
  epoch_start_time,
}) {
  if (!group_id) {
    throw new Error("group_id is required");
  }
  if (!epoch_duration) {
    throw new Error("epoch_duration is required");
  }
  if (!epoch_name) {
    throw new Error("epoch_name is required");
  }
  if (!epoch_start_time) {
    throw new Error("epoch_start_time is required");
  }

  // Convert epoch_start_time to ISO string for timestamptz compatibility
  const formattedStartTime = new Date(epoch_start_time).toISOString();

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("epochs")
    .insert({
      group_id,
      epoch_duration,
      epoch_name,
      epoch_start_time: formattedStartTime,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
