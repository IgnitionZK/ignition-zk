import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "../../../services/apiAuth";

/**
 * Custom hook to fetch and manage the current user's authentication state
 *
 * @returns {Object} An object containing:
 *   @property {boolean} isLoading - Whether the user data is currently being fetched
 *   @property {Object|null} user - The current user object if authenticated, null otherwise
 *   @property {boolean} isAuthenticated - Whether the user is authenticated (based on user.role === "authenticated")
 *
 * @example
 * const { isLoading, user, isAuthenticated } = useUser();
 *
 * @queryKey ["user"] - Used to cache and identify the user data in React Query's cache
 * @queryFn getCurrentUser - Function that fetches the current user's data from the API
 */
export function useUser() {
  const { isLoading, data: user } = useQuery({
    queryKey: ["user"],
    queryFn: getCurrentUser,
  });

  return { isLoading, user, isAuthenticated: user?.role === "authenticated" };
}
