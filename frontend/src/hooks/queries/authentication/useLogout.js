import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout as logoutApi } from "../../../services/apiAuth";
import { useNavigate } from "react-router-dom";

/**
 * Custom hook for handling user logout functionality
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
