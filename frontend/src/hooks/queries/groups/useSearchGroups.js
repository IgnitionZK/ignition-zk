import { useQuery } from "@tanstack/react-query";
import { searchGroups } from "../../../services/apiGroups";

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
