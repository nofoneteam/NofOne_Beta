import { apiFetch } from "./api-fetch";

export interface ReminderPayload {
  title: string;
  message: string;
  reminderTime: string;
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  message: string;
  reminderTime: string;
  status: "pending" | "triggered";
  createdAt: string;
  triggeredAt: string | null;
}

export const reminderApi = {
  createReminder: (data: ReminderPayload, token: string) => {
    return apiFetch<Reminder>("/api/reminder/create", {
      method: "POST",
      body: data,
      token,
    });
  },

  getReminders: (token: string) => {
    return apiFetch<Reminder[]>("/api/reminder", {
      method: "GET",
      token,
    });
  },
};
