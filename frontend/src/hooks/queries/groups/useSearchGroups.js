import { useQuery } from "@tanstack/react-query";
import { searchGroups } from "../../../services/apiGroups";

/**
 * Custom hook for searching groups by name using case-insensitive partial matching.
 * The search is performed against the groups table in the database and will match
 * the search term anywhere in the group name. The query is only enabled when a
 * name parameter is provided.
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
