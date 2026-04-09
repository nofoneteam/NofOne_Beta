import { apiFetch } from "@/lib/api/api-fetch";
import { API_ROUTES } from "@/lib/api/constants";
import type {
  ChatImagePayload,
  ChatMessagePayload,
  CreateChatMessageResponse,
  GetChatHistoryResponse,
} from "@/types/api";

function buildChatImageFormData(payload: ChatImagePayload): FormData {
  const formData = new FormData();

  if (payload.message != null) {
    formData.set("message", payload.message);
  }

  formData.set("type", "image");
  formData.set("image", payload.image);

  if (payload.includeDebug !== undefined) {
    formData.set("includeDebug", String(payload.includeDebug));
  }

  return formData;
}

export const chatApi = {
  createMessage(payload: ChatMessagePayload, token?: string | null) {
    return apiFetch<CreateChatMessageResponse["data"]>(API_ROUTES.chat.base, {
      method: "POST",
      body: payload,
      token,
    });
  },

  uploadImage(payload: ChatImagePayload, token?: string | null) {
    return apiFetch<CreateChatMessageResponse["data"]>(API_ROUTES.chat.base, {
      method: "POST",
      body: buildChatImageFormData(payload),
      token,
    });
  },

  getHistory(date: string, token?: string | null) {
    return apiFetch<GetChatHistoryResponse["data"]>(API_ROUTES.chat.base, {
      method: "GET",
      token,
      query: { date },
    });
  },
};

