import { apiFetch } from "@/lib/api/api-fetch";
import { API_ROUTES } from "@/lib/api/constants";
import type {
  CreateSharedReportResponse,
  GetDailyLogResponse,
  GetDashboardResponse,
  GetProgressReportResponse,
  GetSharedReportResponse,
  GetWeightTrackerResponse,
  GetWeeklyReportResponse,
  ProgressReportQuery,
  GetWeeklySummaryResponse,
  SaveDailyLogResponse,
  ShareReportPayload,
  UpsertDailyLogPayload,
  WeeklySummaryQuery,
  WeightTrackerQuery,
} from "@/types/api";

export const logsApi = {
  saveDailyLog(payload: UpsertDailyLogPayload, token?: string | null) {
    return apiFetch<SaveDailyLogResponse["data"]>(API_ROUTES.logs.base, {
      method: "POST",
      body: payload,
      token,
    });
  },

  getDailyLog(date: string, token?: string | null, cookie?: string | null) {
    return apiFetch<GetDailyLogResponse["data"]>(`${API_ROUTES.logs.base}/${date}`, {
      method: "GET",
      token,
      cookie,
    });
  },

  getDashboard(date?: string, token?: string | null, cookie?: string | null) {
    return apiFetch<GetDashboardResponse["data"]>(API_ROUTES.logs.dashboard, {
      method: "GET",
      token,
      cookie,
      query: { date },
    });
  },

  getProgressReport(
    query?: ProgressReportQuery,
    token?: string | null,
    cookie?: string | null,
  ) {
    return apiFetch<GetProgressReportResponse["data"]>(API_ROUTES.logs.progressReport, {
      method: "GET",
      token,
      cookie,
      query: query
        ? {
            ...query,
            dates: query.dates?.join(","),
          }
        : undefined,
    });
  },

  getWeightTracker(
    query?: WeightTrackerQuery,
    token?: string | null,
    cookie?: string | null,
  ) {
    return apiFetch<GetWeightTrackerResponse["data"]>(API_ROUTES.logs.weightTracker, {
      method: "GET",
      token,
      cookie,
      query,
    });
  },

  getWeeklySummary(
    query?: WeeklySummaryQuery,
    token?: string | null,
    cookie?: string | null,
  ) {
    return apiFetch<GetWeeklySummaryResponse["data"]>(API_ROUTES.logs.weeklySummary, {
      method: "GET",
      token,
      cookie,
      query,
    });
  },

  getWeeklyReport(
    query?: WeeklySummaryQuery,
    token?: string | null,
    cookie?: string | null,
  ) {
    return apiFetch<GetWeeklyReportResponse["data"]>(API_ROUTES.logs.weeklyReport, {
      method: "GET",
      token,
      cookie,
      query,
    });
  },

  createSharedReport(payload: ShareReportPayload, token?: string | null) {
    return apiFetch<CreateSharedReportResponse["data"]>(API_ROUTES.logs.shareReport, {
      method: "POST",
      body: payload,
      token,
    });
  },

  getSharedReport(tokenValue: string) {
    return apiFetch<GetSharedReportResponse["data"]>(
      `${API_ROUTES.logs.sharedReport}/${tokenValue}`,
      {
        method: "GET",
      },
    );
  },
};
