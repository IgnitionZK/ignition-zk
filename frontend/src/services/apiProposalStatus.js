import { supabase } from "./supabase";

/**
 * Gets the status ID for a given status type
 * @param {string} statusType - The status type (e.g., "active", "approved", etc.)
 * @returns {Promise<string>} The status ID
 * @throws {Error} If status type is not found or if there's a database error
 * @example
 * const activeStatusId = await getStatusId("active");
 * console.log("Active status ID:", activeStatusId);
 */
export async function getStatusId(statusType) {
  if (!statusType) {
    throw new Error("statusType is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("proposal_status")
    .select("status_id")
    .eq("status_type", statusType)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data?.status_id;
}

/**
 * Gets all available proposal status types
 * @returns {Promise<Array<Object>>} Array of status objects with status_id and status_type
 * @throws {Error} If there's a database error
 * @example
 * const statuses = await getAllProposalStatuses();
 * console.log("Available statuses:", statuses);
 */
export async function getAllProposalStatuses() {
  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("proposal_status")
    .select("status_id, status_type")
    .order("status_type");

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Gets a proposal status by its ID
 * @param {string} statusId - The status ID to look up
 * @returns {Promise<Object>} The status object with status_id and status_type
 * @throws {Error} If status ID is not found or if there's a database error
 * @example
 * const status = await getProposalStatusById("some-uuid");
 * console.log("Status type:", status.status_type);
 */
export async function getProposalStatusById(statusId) {
  if (!statusId) {
    throw new Error("statusId is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("proposal_status")
    .select("status_id, status_type")
    .eq("status_id", statusId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
