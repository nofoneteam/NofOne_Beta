import { apiFetch } from "@/lib/api/api-fetch";
import { API_ROUTES } from "@/lib/api/constants";
import type {
  BootstrapAdminPayload,
  BootstrapAdminResponse,
  GetChatConfigResponse,
  GetAdminOverviewResponse,
  ListAdminsResponse,
  SearchAdminUsersQuery,
  SearchAdminUsersResponse,
  UpdateUserRolePayload,
  UpdateUserRoleResponse,
  UpsertChatConfigPayload,
  UpsertChatConfigResponse,
} from "@/types/api";

export const adminApi = {
  bootstrap(payload: BootstrapAdminPayload, token?: string | null) {
    return apiFetch<BootstrapAdminResponse["data"]>(API_ROUTES.admin.bootstrap, {
      method: "POST",
      body: payload,
      token,
    });
  },

  getOverview(token?: string | null) {
    return apiFetch<GetAdminOverviewResponse["data"]>(API_ROUTES.admin.overview, {
      method: "GET",
      token,
    });
  },

  searchUsers(query: SearchAdminUsersQuery, token?: string | null) {
    return apiFetch<SearchAdminUsersResponse["data"]>(API_ROUTES.admin.searchUsers, {
      method: "GET",
      token,
      query,
    });
  },

  listAdmins(token?: string | null) {
    return apiFetch<ListAdminsResponse["data"]>(API_ROUTES.admin.admins, {
      method: "GET",
      token,
    });
  },

  updateUserRole(
    userId: string,
    payload: UpdateUserRolePayload,
    token?: string | null,
  ) {
    return apiFetch<UpdateUserRoleResponse["data"]>(
      `${API_ROUTES.admin.updateUserRole}/${userId}/role`,
      {
        method: "PATCH",
        body: payload,
        token,
      },
    );
  },

  getChatConfig(token?: string | null, cookie?: string | null) {
    return apiFetch<GetChatConfigResponse["data"]>(API_ROUTES.admin.chatConfig, {
      method: "GET",
      token,
      cookie,
    });
  },

  upsertChatConfig(payload: UpsertChatConfigPayload, token?: string | null) {
    return apiFetch<UpsertChatConfigResponse["data"]>(API_ROUTES.admin.chatConfig, {
      method: "PUT",
      body: payload,
      token,
    });
  },
};
