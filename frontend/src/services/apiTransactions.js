import { supabase } from "./supabase";

/**
 * Creates a new transaction record in the database
 * @param {Object} params - The parameters object
 * @param {string} params.txFunction - The transaction function name
 * @param {string} params.txEventIdentifier - The transaction event identifier
 * @param {string} params.txHash - The transaction hash
 * @param {string} params.status - The transaction status
 * @param {string} params.childId - The child ID (UUID)
 * @returns {Promise<Object>} The newly created transaction object
 * @throws {Error} If required parameters are missing or if there's a database error
 */
export async function createTransaction({
  txFunction,
  txEventIdentifier,
  txHash,
  status,
  childId,
}) {
  if (!txFunction) {
    throw new Error("txFunction is required");
  }
  if (!txEventIdentifier) {
    throw new Error("txEventIdentifier is required");
  }
  if (!txHash) {
    throw new Error("txHash is required");
  }
  if (!status) {
    throw new Error("status is required");
  }
  if (!childId) {
    throw new Error("childId is required");
  }

  const insertData = {
    tx_funcion: txFunction,
    tx_event_identifier: txEventIdentifier,
    tx_hash: txHash,
    status: status,
    child_id: childId,
  };

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("transactions")
    .insert(insertData)
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  // If data is an array, take the first item
  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }

  // If data is an object, return it directly
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data;
  }

  return null;
}

/**
 * Retrieves the status of a transaction by its child_id
 * @param {Object} params - The parameters object
 * @param {string} params.childId - The child ID (UUID) to search for
 * @returns {Promise<Object|null>} The transaction object with status information, or null if not found
 * @throws {Error} If childId is not provided or if there's a database error
 */
export async function getStatus({ childId }) {
  if (!childId) {
    throw new Error("childId is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("transactions")
    .select("*")
    .eq("child_id", childId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(error.message);
  }

  return data;
}
