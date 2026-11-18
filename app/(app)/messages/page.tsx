"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageLoading } from "@/components/shared/page-loading";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { errorMessage, formatRelativeDate } from "@/lib/format";
import {
  fetchConversations,
  fetchThread,
  markThreadRead,
  sendStaffMessage,
  type StaffConversation,
  type StaffMessage,
} from "@/lib/messages";
import type { UserAdmin } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkUserId = searchParams.get("with");

  const canRead = hasPermission(user, "messages.read");
  const canWrite = hasPermission(user, "messages.write");

  const [conversations, setConversations] = useState<StaffConversation[]>([]);
  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [composeUserId, setComposeUserId] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = useCallback(async () => {
    const rows = await fetchConversations();
    setConversations(rows);
    return rows;
  }, []);

  useEffect(() => {
    if (authLoading || !canRead) return;
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      try {
        const [rows, assignees] = await Promise.all([
          loadConversations(),
          api<UserAdmin[]>("/users/assignees"),
        ]);
        if (cancelled) return;
        setUsers(assignees.filter((u) => u.id !== user?.id));
        if (deepLinkUserId) {
          setActiveUserId(deepLinkUserId);
        } else if (!activeUserId && rows.length > 0) {
          setActiveUserId(rows[0].otherUser.id);
        }
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open deep link once
  }, [authLoading, canRead, loadConversations, user?.id, deepLinkUserId]);

  useEffect(() => {
    if (!activeUserId || !canRead) return;
    let cancelled = false;
    (async () => {
      setLoadingThread(true);
      try {
        const res = await fetchThread(activeUserId);
        if (cancelled) return;
        setMessages(res.data);
        await markThreadRead(activeUserId);
        await loadConversations();
        if (deepLinkUserId === activeUserId) {
          router.replace("/messages");
        }
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeUserId, canRead, loadConversations, deepLinkUserId, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeUser = useMemo(() => {
    if (!activeUserId) return null;
    return (
      conversations.find((c) => c.otherUser.id === activeUserId)?.otherUser ??
      users.find((u) => u.id === activeUserId) ??
      null
    );
  }, [activeUserId, conversations, users]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || !activeUserId) return;
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      const created = await sendStaffMessage(activeUserId, body);
      setMessages((prev) => [...prev, created]);
      setDraft("");
      await loadConversations();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  function startConversation() {
    if (!composeUserId) return;
    setActiveUserId(composeUserId);
    setComposeUserId("");
  }

  if (authLoading) {
    return (
      <AppShell title="Messages">
        <PageLoading />
      </AppShell>
    );
  }

  if (!canRead) {
    return (
      <AppShell title="Messages">
        <AccessDenied />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Messages"
      subtitle="Direct messages between staff"
      breadcrumbs={[
        { label: "Home", href: "/dashboard" },
        { label: "Messages" },
      ]}
    >
      <div className="grid min-h-[70vh] overflow-hidden rounded-lg border border-[var(--erp-border)] bg-[var(--erp-surface)] lg:grid-cols-[280px_1fr]">
        <aside className="flex flex-col border-b border-[var(--erp-border)] lg:border-b-0 lg:border-r">
          {canWrite && (
            <div className="flex gap-2 border-b border-[var(--erp-border)] p-3">
              <Select value={composeUserId} onValueChange={setComposeUserId}>
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue placeholder="New message…" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                disabled={!composeUserId}
                onClick={startConversation}
              >
                Open
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <p className="p-4 text-sm text-[var(--erp-text-muted)]">
                Loading…
              </p>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-[var(--erp-text-muted)]">
                <MessageCircle className="h-8 w-8 opacity-40" />
                <p>No conversations yet.</p>
              </div>
            ) : (
              conversations.map((c) => {
                const selected = c.otherUser.id === activeUserId;
                return (
                  <button
                    key={c.otherUser.id}
                    type="button"
                    onClick={() => setActiveUserId(c.otherUser.id)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 border-b border-[var(--erp-border)] px-3 py-3 text-left transition-colors hover:bg-[var(--erp-desk)]",
                      selected && "bg-[var(--erp-desk)]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-[var(--erp-text)]">
                        {c.otherUser.fullName}
                      </span>
                      {c.unreadCount > 0 && (
                        <Badge variant="default" className="shrink-0">
                          {c.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <span className="truncate text-xs text-[var(--erp-text-muted)]">
                      {c.lastMessage.body}
                    </span>
                    <span className="text-[10px] text-[var(--erp-text-muted)]">
                      {formatRelativeDate(c.lastMessage.createdAt)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex min-h-[50vh] flex-col">
          {!activeUserId ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-[var(--erp-text-muted)]">
              Select a conversation or start a new message.
            </div>
          ) : (
            <>
              <header className="border-b border-[var(--erp-border)] px-4 py-3">
                <h2 className="text-sm font-semibold text-[var(--erp-text)]">
                  {activeUser?.fullName ?? "Conversation"}
                </h2>
                {activeUser?.email && (
                  <p className="text-xs text-[var(--erp-text-muted)]">
                    {activeUser.email}
                  </p>
                )}
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {loadingThread ? (
                  <p className="text-sm text-[var(--erp-text-muted)]">
                    Loading messages…
                  </p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-[var(--erp-text-muted)]">
                    No messages yet. Say hello.
                  </p>
                ) : (
                  messages.map((m) => {
                    const mine = m.fromUserId === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex",
                          mine ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                            mine
                              ? "bg-[var(--frappe-primary)] text-white"
                              : "bg-[var(--erp-desk)] text-[var(--erp-text)]"
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {m.body}
                          </p>
                          <p
                            className={cn(
                              "mt-1 text-[10px]",
                              mine ? "text-white/70" : "text-[var(--erp-text-muted)]"
                            )}
                          >
                            {formatRelativeDate(m.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {canWrite && (
                <form
                  onSubmit={handleSend}
                  className="flex gap-2 border-t border-[var(--erp-border)] p-3"
                >
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`Message ${activeUser?.fullName ?? ""}…`}
                    rows={2}
                    className="min-h-[44px] flex-1 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend(e);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Send</span>
                  </Button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
