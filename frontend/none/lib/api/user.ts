import { apiFetch } from "@/lib/api/api-fetch";
import { API_ROUTES } from "@/lib/api/constants";
import type {
  GetChatPreferencesResponse,
  GetProfileResponse,
  GetMedicalReportsResponse,
  ProfileAiSuggestionPayload,
  ProfileAiSuggestionResponse,
  SaveProfileResponse,
  UpdateChatPreferencesPayload,
  UpdateChatPreferencesResponse,
  UploadMedicalReportPayload,
  UploadMedicalReportResponse,
  UpsertHealthProfilePayload,
} from "@/types/api";

function buildReportFormData(payload: UploadMedicalReportPayload): FormData {
  const formData = new FormData();

  if (payload.title != null) {
    formData.set("title", payload.title);
  }

  formData.set("report", payload.report);

  return formData;
}

export const userApi = {
  saveProfile(payload: UpsertHealthProfilePayload, token?: string | null) {
    return apiFetch<SaveProfileResponse["data"]>(API_ROUTES.user.profile, {
      method: "POST",
      body: payload,
      token,
    });
  },

  getProfile(token?: string | null, cookie?: string | null) {
    return apiFetch<GetProfileResponse["data"]>(API_ROUTES.user.profile, {
      method: "GET",
      token,
      cookie,
    });
  },

  getProfileAiSuggestion(payload: ProfileAiSuggestionPayload, token?: string | null) {
    return apiFetch<ProfileAiSuggestionResponse["data"]>(API_ROUTES.user.profileAiSuggestion, {
      method: "POST",
      body: payload,
      token,
    });
  },

  getChatPreferences(token?: string | null, cookie?: string | null) {
    return apiFetch<GetChatPreferencesResponse["data"]>(API_ROUTES.user.chatPreferences, {
      method: "GET",
      token,
      cookie,
    });
  },

  updateChatPreferences(payload: UpdateChatPreferencesPayload, token?: string | null) {
    return apiFetch<UpdateChatPreferencesResponse["data"]>(API_ROUTES.user.chatPreferences, {
      method: "POST",
      body: payload,
      token,
    });
  },

  getReports(token?: string | null, cookie?: string | null) {
    return apiFetch<GetMedicalReportsResponse["data"]>(API_ROUTES.user.reports, {
      method: "GET",
      token,
      cookie,
    });
  },

  uploadReport(payload: UploadMedicalReportPayload, token?: string | null) {
    return apiFetch<UploadMedicalReportResponse["data"]>(API_ROUTES.user.reports, {
      method: "POST",
      body: buildReportFormData(payload),
      token,
    });
  },
};
