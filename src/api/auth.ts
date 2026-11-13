import { api } from "../lib/api";

export interface AuthProfile {
  id: string;
  email: string;
  full_name: string;
  role: string | null;
  avatar_url?: string | null;
  department?: string | null;
  phone?: string | null;
  created_at?: string | null;
}

export interface AuthMessage {
  message: string;
}

let currentProfileRequest: Promise<AuthProfile> | null = null;

export const authApi = {
  currentProfile() {
    if (!currentProfileRequest) {
      currentProfileRequest = api
        .get<AuthProfile>("/auth/me")
        .finally(() => {
          currentProfileRequest = null;
        });
    }
    return currentProfileRequest;
  },
  login(email: string, password: string) {
    return api.post<AuthProfile>("/auth/login", { email, password });
  },
  signup(params: {
    email: string;
    first_name: string;
    last_name: string;
  }) {
    return api.post<AuthMessage>("/auth/signup", params);
  },
  activateAccount(token: string, password: string) {
    return api.post<AuthMessage>("/auth/activate", { token, password });
  },
  logout() {
    return api.post<AuthMessage>("/auth/logout");
  },
  changePassword(current_password: string, new_password: string) {
    return api.post<AuthMessage>("/auth/change-password", {
      current_password,
      new_password,
    });
  },
  requestPasswordReset(email: string) {
    return api.post<AuthMessage>("/auth/reset-password", { email });
  },
  confirmPasswordReset(token: string, new_password: string) {
    return api.post<AuthMessage>("/auth/reset-password/confirm", {
      token,
      new_password,
    });
  },
};
