import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout as logoutApi } from "../../../services/apiAuth";
import { useNavigate } from "react-router-dom";

/**
 * Custom hook for handling user logout functionality
 *
 * @description
 * This hook provides a mutation function to handle user logout. It uses React Query's useMutation
 * to manage the logout state and side effects. On successful logout, it clears all queries from
 * the query cache and redirects to the homepage.
 *
 * @mutation
 * - mutationFn: logoutApi - The API function that handles the server-side logout
 * - onSuccess: Clears all queries from the cache and navigates to homepage
 *
 * @returns {Object} An object containing:
 *   - logout: Function - The mutation function to trigger logout
 *   - isPending: boolean - Indicates if the logout mutation is in progress
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { mutate: logout, isPending } = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      queryClient.removeQueries();
      navigate("/homepage", { replace: true });
    },
  });

  return { logout, isPending };
}
