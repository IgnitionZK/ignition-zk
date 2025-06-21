import { supabase } from "./supabase";

/**
 * Searches for groups in the database by name using case-insensitive partial matching.
 * Uses PostgreSQL's ILIKE operator which performs case-insensitive pattern matching.
 * The search term is wrapped in % wildcards, so it will match the term anywhere in the name.
 * For example, searching for "dev" would match "Dev Team", "DEVELOPERS", "Frontend Dev", etc.
 *
 * @param {Object} params - The search parameters
 * @param {string} params.name - The name to search for (required)
 * @returns {Promise<Array>} A promise that resolves to an array of matching group objects
 * @throws {Error} If name parameter is missing or if there's a database error
 *
 * @example
 * // Search for groups containing "dev" in their name
 * const groups = await searchGroups({ name: "dev" });
 */
export async function searchGroups({ name }) {
  if (!name) {
    throw new Error("name is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("groups")
    .select("*")
    .ilike("name", `%${name}%`);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function insertNewGroup({ name }) {
  if (!name) {
    throw new Error("name is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("groups")
    .insert([{ name }])
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function insertERC721ContractAddress({
  group_id,
  erc721_contract_address,
}) {
  if (!group_id) {
    throw new Error("group_id is required");
  }

  if (!erc721_contract_address) {
    throw new Error("erc721_contract_address is required");
  }

  const { data, error } = await supabase
    .schema("ignitionzk")
    .from("groups")
    .update({ erc721_contract_address })
    .eq("id", group_id)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
