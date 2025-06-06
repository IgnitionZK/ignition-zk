import { useQuery } from "@tanstack/react-query";
import { searchGroups } from "../../../services/apiGroups";

/**
 * Custom hook for searching groups by name
 *
 * @param {Object} params - The parameters for the search
 * @param {string} params.name - The name to search for
 *
 * @returns {Object} An object containing:
 *   - searchResults: The search results from the API
 *   - isLoading: Boolean indicating if the search is in progress
 *   - error: Any error that occurred during the search
 *
 * @note The query uses the following configuration:
 *   - queryKey: ["searchGroups", name] - Unique key for caching and invalidation
 *   - queryFn: Calls searchGroups API with the provided name parameter
 *   - enabled: Only runs when name is provided (non-empty)
 */
export function useSearchGroups({ name }) {
  const {
    data: searchResults,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["searchGroups", name],
    queryFn: () => searchGroups({ name }),
    enabled: !!name,
  });

  return { searchResults, isLoading, error };
}
