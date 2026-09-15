"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronRight, CircleAlert, Inbox, X } from "lucide-react";
import {
  getChangedWarrantyTickets,
  getUnreadWarrantyTickets,
  getWarrantyTicketVersion,
  getWarrantyTicketVersions,
  type WarrantyTicketVersions,
} from "@/features/warranty/model/notifications";
import type { WarrantyTicket } from "@/features/warranty/model/types";

const STORAGE_KEY = "gascomp-admin-warranty-notifications-v1";
const POLL_INTERVAL_MS = 30_000;

type TicketResponse =
  | { success: true; tickets: WarrantyTicket[] }
  | { success: false; error: string };

type NotificationToast = {
  title: string;
  detail: string;
  ticket: WarrantyTicket;
};

export function WarrantyNotifications({
  tickets,
  setTickets,
  acknowledgedTickets,
  openInbox,
}: {
  tickets: WarrantyTicket[];
  setTickets: React.Dispatch<React.SetStateAction<WarrantyTicket[]>>;
  acknowledgedTickets: Record<string, WarrantyTicket>;
  openInbox: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const [refreshError, setRefreshError] = useState("");
  const [toast, setToast] = useState<NotificationToast | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ticketsRef = useRef(tickets);
  const seenVersionsRef = useRef<WarrantyTicketVersions>({});
  const requestPendingRef = useRef(false);

  const recentTickets = useMemo(
    () => [...tickets].sort((left, right) => ticketActivity(right).localeCompare(ticketActivity(left))).slice(0, 6),
    [tickets],
  );
  const visibleUnreadIds = useMemo(() => {
    const currentTickets = new Map(tickets.map((ticket) => [ticket.ticketId, ticket]));
    return new Set([...unreadIds].filter((ticketId) => {
      const acknowledged = acknowledgedTickets[ticketId];
      const current = currentTickets.get(ticketId);
      return Boolean(current) && (!acknowledged || getWarrantyTicketVersion(acknowledged) !== getWarrantyTicketVersion(current!));
    }));
  }, [acknowledgedTickets, tickets, unreadIds]);

  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  useEffect(() => {
    const storedVersions = readStoredVersions();
    seenVersionsRef.current = storedVersions ?? {};
    setUnreadIds(new Set(
      getUnreadWarrantyTickets(ticketsRef.current, storedVersions).map((ticket) => ticket.ticketId),
    ));
  }, []);

  useEffect(() => {
    const acknowledged = Object.values(acknowledgedTickets);
    if (!acknowledged.length) return;
    const nextSeenVersions = {
      ...seenVersionsRef.current,
      ...getWarrantyTicketVersions(acknowledged),
    };
    seenVersionsRef.current = nextSeenVersions;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSeenVersions));
    } catch {
      // The current session still tracks read state when browser storage is unavailable.
    }
  }, [acknowledgedTickets]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 6_000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const refreshTickets = useCallback(async () => {
    if (requestPendingRef.current) return;
    requestPendingRef.current = true;

    try {
      const response = await fetch("/admin/warranty-tickets", {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const result = await response.json() as TicketResponse;
      if (!response.ok || !result.success) {
        setRefreshError(result.success ? "Warranty updates could not be checked." : result.error);
        return;
      }

      const previousTickets = ticketsRef.current;
      const changedTickets = getChangedWarrantyTickets(previousTickets, result.tickets);
      const unseenChanges = getUnreadWarrantyTickets(changedTickets, seenVersionsRef.current);

      ticketsRef.current = result.tickets;
      setTickets(result.tickets);
      setRefreshError("");

      if (unseenChanges.length) {
        setUnreadIds((current) => {
          const next = new Set(current);
          for (const ticket of unseenChanges) next.add(ticket.ticketId);
          return next;
        });
        setToast(createToast(unseenChanges, new Set(previousTickets.map((ticket) => ticket.ticketId))));
      }
    } catch {
      setRefreshError("Warranty updates could not be checked.");
    } finally {
      requestPendingRef.current = false;
    }
  }, [setTickets]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshTickets();
    }, POLL_INTERVAL_MS);

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void refreshTickets();
    }

    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshTickets]);

  function persistSeenVersions(next: WarrantyTicketVersions) {
    seenVersionsRef.current = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // The current session still tracks read state when browser storage is unavailable.
    }
  }

  function markTicketRead(ticket: WarrantyTicket) {
    persistSeenVersions({
      ...seenVersionsRef.current,
      [ticket.ticketId]: getWarrantyTicketVersion(ticket),
    });
    setUnreadIds((current) => {
      const next = new Set(current);
      next.delete(ticket.ticketId);
      return next;
    });
  }

  function markAllRead() {
    persistSeenVersions({
      ...seenVersionsRef.current,
      ...getWarrantyTicketVersions(tickets),
    });
    setUnreadIds(new Set());
  }

  function showInbox(ticket?: WarrantyTicket) {
    if (ticket) markTicketRead(ticket);
    setOpen(false);
    setToast(null);
    openInbox();
  }

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label={visibleUnreadIds.size ? `${visibleUnreadIds.size} unread warranty notifications` : "Warranty notifications"}
          aria-expanded={open}
          aria-controls="warranty-notification-panel"
          className="relative grid size-9 place-items-center rounded-full border border-[#2c3038]/10 bg-white text-[#69747b] transition hover:border-[#0035b9]/25 hover:bg-[#edf4ff] hover:text-[#0035b9]"
        >
          <Bell className="size-4" />
          {visibleUnreadIds.size > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-[#d94136] px-1 text-[9px] font-black leading-5 text-white ring-2 ring-white">
              {visibleUnreadIds.size > 99 ? "99+" : visibleUnreadIds.size}
            </span>
          )}
        </button>

        {open && (
          <section
            id="warranty-notification-panel"
            aria-label="Warranty notifications"
            className="fixed left-4 right-4 top-[68px] z-50 overflow-hidden rounded-[22px] border border-[#2c3038]/10 bg-white shadow-[0_24px_70px_rgba(29,48,73,0.2)] sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[22rem]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#2c3038]/8 p-4">
              <div>
                <p className="text-xs font-extrabold">Warranty notifications</p>
                <p className="mt-1 text-[10px] text-[#7d878d]">Checks for updates every 30 seconds.</p>
              </div>
              {visibleUnreadIds.size > 0 && (
                <button type="button" onClick={markAllRead} className="shrink-0 text-[10px] font-extrabold text-[#0035b9]">
                  Mark all read
                </button>
              )}
            </div>

            {refreshError && (
              <p role="alert" className="flex items-start gap-2 border-b border-[#d65d50]/20 bg-[#fff4f2] px-4 py-3 text-[10px] leading-4 text-[#a23f36]">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> {refreshError}
              </p>
            )}

            <div className="max-h-[25rem] overflow-y-auto">
              {recentTickets.map((ticket) => {
                const unread = visibleUnreadIds.has(ticket.ticketId);
                return (
                  <button
                    key={ticket.ticketId}
                    type="button"
                    onClick={() => showInbox(ticket)}
                    className={`flex w-full items-start gap-3 border-b border-[#2c3038]/7 px-4 py-3 text-left transition last:border-b-0 hover:bg-[#f5f7fb] ${unread ? "bg-[#edf4ff]/70" : "bg-white"}`}
                  >
                    <span className={`mt-1 size-2 shrink-0 rounded-full ${unread ? "bg-[#d94136]" : "bg-[#c5cbd0]"}`} />
                    <span className="min-w-0 flex-1">
                      <strong className="block text-xs">{ticket.status === "new" ? "New warranty claim" : "Warranty claim updated"}</strong>
                      <span className="mt-1 block truncate text-[10px] font-semibold text-[#56636b]">{ticket.product.name} · {ticket.product.sku}</span>
                      <span className="mt-1 block text-[9px] text-[#8a9398]">{formatActivity(ticket)} · {statusLabel(ticket.status)}</span>
                    </span>
                    <ChevronRight className="mt-2 size-3.5 shrink-0 text-[#8a9398]" />
                  </button>
                );
              })}
              {recentTickets.length === 0 && (
                <div className="px-5 py-10 text-center">
                  <Inbox className="mx-auto size-7 text-[#a4acb1]" />
                  <p className="mt-3 text-xs font-extrabold">No warranty updates yet</p>
                </div>
              )}
            </div>

            <button type="button" onClick={() => showInbox()} className="flex h-11 w-full items-center justify-center gap-2 border-t border-[#2c3038]/8 text-[10px] font-extrabold text-[#0035b9] hover:bg-[#f5f7fb]">
              Open warranty tickets <ChevronRight className="size-3.5" />
            </button>
          </section>
        )}
      </div>

      {toast && (
        <div role="status" aria-live="polite" className="fixed right-4 top-20 z-[70] w-[min(22rem,calc(100vw-2rem))] rounded-[20px] border border-[#0035b9]/15 bg-white p-4 shadow-[0_20px_60px_rgba(29,48,73,0.2)] sm:right-6">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#edf4ff] text-[#0035b9]"><Bell className="size-4" /></span>
            <button type="button" onClick={() => showInbox(toast.ticket)} className="min-w-0 flex-1 text-left">
              <strong className="block text-xs">{toast.title}</strong>
              <span className="mt-1 block truncate text-[10px] text-[#68747b]">{toast.detail}</span>
            </button>
            <button type="button" onClick={() => setToast(null)} aria-label="Dismiss warranty notification" className="grid size-7 shrink-0 place-items-center rounded-full text-[#8a9398] hover:bg-[#f1f3f5]"><X className="size-3.5" /></button>
          </div>
        </div>
      )}
    </>
  );
}

function ticketActivity(ticket: WarrantyTicket) {
  return ticket.updatedAt || ticket.submittedAt;
}

function formatActivity(ticket: WarrantyTicket) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ticketActivity(ticket)));
}

function statusLabel(status: WarrantyTicket["status"]) {
  return ({
    new: "New",
    reviewing: "Under review",
    approved: "Approved",
    rejected: "Rejected",
    closed: "Closed",
  } as const)[status];
}

function readStoredVersions(): WarrantyTicketVersions | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
  } catch {
    return null;
  }
}

function createToast(changes: WarrantyTicket[], previousIds: Set<string>): NotificationToast {
  const sorted = [...changes].sort((left, right) => ticketActivity(right).localeCompare(ticketActivity(left)));
  const newest = sorted[0];
  const newCount = changes.filter((ticket) => !previousIds.has(ticket.ticketId)).length;
  const title = changes.length === 1
    ? newCount === 1 ? "New warranty claim received" : "Warranty claim updated"
    : newCount === changes.length ? `${changes.length} new warranty claims` : `${changes.length} warranty claim updates`;

  return {
    title,
    detail: `${newest.customer.name} · ${newest.product.name} · ${newest.product.sku}`,
    ticket: newest,
  };
}
