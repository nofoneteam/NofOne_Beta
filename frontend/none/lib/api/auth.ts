import { API_ROUTES } from "@/lib/api/constants";
import { apiFetch } from "@/lib/api/api-fetch";
import type {
  AuthMeResponse,
  GoogleLoginPayload,
  GoogleLoginResponse,
  OtpRequestPayload,
  PhoneLoginPayload,
  PhoneLoginResponse,
  RefreshSessionPayload,
  RefreshSessionResponse,
  RequestLoginOtpResponse,
  RequestSignupOtpResponse,
  VerifyLoginOtpResponse,
  VerifyOtpPayload,
  VerifySignupOtpResponse,
} from "@/types/api";

export const authApi = {
  requestSignupOtp(payload: OtpRequestPayload, token?: string | null) {
    return apiFetch<RequestSignupOtpResponse["data"]>(API_ROUTES.auth.signupRequestOtp, {
      method: "POST",
      body: payload,
      token,
    });
  },

  verifySignupOtp(payload: VerifyOtpPayload, token?: string | null) {
    return apiFetch<VerifySignupOtpResponse["data"]>(API_ROUTES.auth.signupVerifyOtp, {
      method: "POST",
      body: payload,
      token,
    });
  },

  requestLoginOtp(payload: OtpRequestPayload, token?: string | null) {
    return apiFetch<RequestLoginOtpResponse["data"]>(API_ROUTES.auth.loginRequestOtp, {
      method: "POST",
      body: payload,
      token,
    });
  },

  verifyLoginOtp(payload: VerifyOtpPayload, token?: string | null) {
    return apiFetch<VerifyLoginOtpResponse["data"]>(API_ROUTES.auth.loginVerifyOtp, {
      method: "POST",
      body: payload,
      token,
    });
  },

  googleLogin(payload: GoogleLoginPayload, token?: string | null) {
    return apiFetch<GoogleLoginResponse["data"]>(API_ROUTES.auth.google, {
      method: "POST",
      body: payload,
      token,
    });
  },

  phoneLogin(payload: PhoneLoginPayload, token?: string | null) {
    return apiFetch<PhoneLoginResponse["data"]>(API_ROUTES.auth.phone, {
      method: "POST",
      body: payload,
      token,
    });
  },

  refreshSession(payload?: RefreshSessionPayload, token?: string | null) {
    return apiFetch<RefreshSessionResponse["data"]>(API_ROUTES.auth.refresh, {
      method: "POST",
      body: payload ?? {},
      token,
    });
  },

  logout(payload?: RefreshSessionPayload, token?: string | null) {
    return apiFetch<null>(API_ROUTES.auth.logout, {
      method: "POST",
      body: payload ?? {},
      token,
    });
  },

  getMe(token?: string | null, cookie?: string | null) {
    return apiFetch<AuthMeResponse["data"]>(API_ROUTES.auth.me, {
      method: "GET",
      token,
      cookie,
    });
  },
};
