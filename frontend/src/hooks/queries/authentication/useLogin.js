import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login as loginApi } from "../../../services/apiAuth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

/**
 * Custom hook for handling user login functionality
 *
 * @returns {Object} An object containing:
 *   - login: Function to trigger the login mutation
 *   - isLoading: Boolean indicating if the login request is in progress
 *
 * @example
 * const { login, isLoading } = useLogin();
 * login({ email: "user@example.com", password: "password123" });
 *
 * @mutation
 * - mutationFn: Calls loginApi with email and password
 * - onSuccess: Updates user data in cache with key ["user"] and redirects to dashboard
 * - onError: Shows error toast for invalid credentials
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { mutate: login, isLoading } = useMutation({
    mutationFn: ({ email, password }) => loginApi({ email, password }),
    onSuccess: (user) => {
      queryClient.setQueryData(["user"], user.user);
      navigate("/dashboard", { replace: true });
    },
    onError: (err) => {
      console.log("ERROR", err);
      toast.error("Provided email or password are incorrect");
    },
  });

  return { login, isLoading };
}
