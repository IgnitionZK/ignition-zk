import { supabase } from "./supabase";

export const PROPOSAL_STATUS_IDS = {
  // uuid from "claimed" status_type from backend
  CLAIMED: "a9f2bdcf-ab17-44d5-96c3-afcb742c696a",
  // uuid from "requested" status_type from backend
  REQUESTED: "4e8a689c-545a-45d4-be2d-7ace9b53e880",
};

/**
 * Gets the status ID for a given status type
 * @param {string} statusType - The status type (e.g., "active", "approved", etc.)
 * @returns {Promise<string>} The status ID
 * @throws {Error} If status type is not found or if there's a database error
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
    throw new Error(
      `Failed to get status ID for ${statusType}: ${error.message}`
    );
  }

  if (!data || !data.status_id) {
    throw new Error(`Status type "${statusType}" not found`);
  }

  return data.status_id;
}

/**
 * Gets the claimed status ID
 * @returns {string} The claimed status ID
 */
export function getClaimedStatusId() {
  return PROPOSAL_STATUS_IDS.CLAIMED;
}

/**
 * Gets the requested status ID
 * @returns {string} The requested status ID
 */
export function getRequestedStatusId() {
  return PROPOSAL_STATUS_IDS.REQUESTED;
}

/**
 * Gets all available proposal status types
 * @returns {Promise<Array<Object>>} Array of status objects with status_id and status_type
 * @throws {Error} If there's a database error
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
