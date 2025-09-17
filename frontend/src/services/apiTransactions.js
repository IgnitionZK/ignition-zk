import { supabase } from "./supabase";

/**
 * Creates a new transaction record in the database
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
