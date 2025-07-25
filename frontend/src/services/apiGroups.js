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

/**
 * Creates a new group in the database with the specified name.
 * Inserts a new record into the groups table and returns the created group data.
 *
 * @param {Object} params - The group creation parameters
 * @param {string} params.name - The name of the group to create (required)
 * @returns {Promise<Array>} A promise that resolves to an array containing the created group object
 * @throws {Error} If name parameter is missing or if there's a database error
 *
 * @example
 * // Create a new group called "Development Team"
 * const newGroup = await insertNewGroup({ name: "Development Team" });
 * console.log(newGroup[0].id); // Access the created group's ID
 */
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

/**
 * Updates an existing group with an ERC721 contract address.
 * Finds the group by its ID and updates the erc721_contract_address field.
 * This is typically used after deploying an ERC721 contract for a specific group.
 *
 * @param {Object} params - The update parameters
 * @param {number|string} params.group_id - The ID of the group to update (required)
 * @param {string} params.erc721_contract_address - The Ethereum address of the ERC721 contract (required)
 * @returns {Promise<Array>} A promise that resolves to an array containing the updated group object
 * @throws {Error} If group_id or erc721_contract_address parameters are missing, or if there's a database error
 *
 * @example
 * // Update group with ID 123 to have the ERC721 contract address
 * const updatedGroup = await insertERC721ContractAddress({
 *   group_id: 123,
 *   erc721_contract_address: "0x1234567890abcdef1234567890abcdef12345678"
 * });
 * console.log(updatedGroup[0].erc721_contract_address); // Access the updated contract address
 */
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
    .eq("group_id", group_id)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
