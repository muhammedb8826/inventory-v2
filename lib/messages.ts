import { api } from "@/lib/api";
import type { PaginatedResponse, UserAdmin } from "@/lib/types";

export interface StaffMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
  fromUser?: UserAdmin;
  toUser?: UserAdmin;
}

export interface StaffConversation {
  otherUser: UserAdmin;
  lastMessage: {
    id: string;
    body: string;
    fromUserId: string;
    createdAt: string;
  };
  unreadCount: number;
}

export function fetchConversations() {
  return api<StaffConversation[]>("/messages/conversations");
}

export function fetchThread(userId: string, page = 1, limit = 100) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return api<PaginatedResponse<StaffMessage>>(
    `/messages/thread/${userId}?${params.toString()}`
  );
}

export function sendStaffMessage(toUserId: string, body: string) {
  return api<StaffMessage>("/messages", {
    method: "POST",
    body: { toUserId, body },
  });
}

export function markThreadRead(userId: string) {
  return api<{ updated: number }>(`/messages/thread/${userId}/read`, {
    method: "POST",
  });
}

export function fetchMessagesUnreadCount() {
  return api<{ count: number }>("/messages/unread-count");
}
