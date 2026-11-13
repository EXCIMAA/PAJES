import { api } from "../lib/api";
import type { Notification } from "../types";

export const notificationsApi = {
  list: () => api.get<Notification[]>("/notifications"),
  unreadCount: async () => {
    const result = await api.get<{ count: number }>("/notifications/unread-count");
    return result.count;
  },
  create: (body: { title: string; message: string; type: string }) =>
    api.post<Notification>("/notifications", body),
  markRead: (id: string) =>
    api.patch<Notification>(
      `/notifications/${encodeURIComponent(id)}/read`,
    ),
  markAllRead: () =>
    api.patch<{ count: number }>("/notifications/read-all"),
  delete: (id: string) =>
    api.delete<void>(`/notifications/${encodeURIComponent(id)}`),
};
