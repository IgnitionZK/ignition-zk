import { supabase } from "./supabase";

/**
 * Authenticates a user with email and password using Supabase Auth
 * @param {Object} params - The login parameters
 * @param {string} params.email - The user's email address
 * @param {string} params.password - The user's password
 * @returns {Promise<Object>} The authentication data containing user and session information
 * @throws {Error} If authentication fails
 */
export async function login({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);

  return data;
}

/**
 * Signs out the currently authenticated user
 * @returns {Promise<void>}
 * @throws {Error} If sign out fails
 */
export async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Signout error: ", error.message);
    throw new Error(error.message);
  }
}

/**
 * Retrieves the currently authenticated user's information
 * @returns {Promise<Object|null>} The user object if authenticated, null otherwise
 * @throws {Error} If there's an error fetching the user data
 */
export async function getCurrentUser() {
  const { data: session } = await supabase.auth.getSession();

  if (!session.session) return null;

  const { data, error } = await supabase.auth.getUser();

  if (error) throw new Error(error.message);
  return data?.user;
}
