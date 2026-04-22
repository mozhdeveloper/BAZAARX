/**
 * ReturnMessageThread
 * Shows the buyer<->seller message thread for a return case.
 * Fetches from return_messages, subscribes to realtime inserts.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, MessageSquare } from "lucide-react";

interface ReturnMessage {
  id: string;
  return_id: string;
  sender_id: string | null;
  sender_role: "buyer" | "seller" | "admin" | "system";
  body: string;
  created_at: string;
}

interface ReturnMessageThreadProps {
  returnId: string;
  senderRole: "buyer" | "seller" | "admin";
  className?: string;
}

export function ReturnMessageThread({
  returnId,
  senderRole,
  className,
}: ReturnMessageThreadProps) {
  const [messages, setMessages] = useState<ReturnMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── fetch initial messages ─────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("return_messages")
        .select("*")
        .eq("return_id", returnId)
        .order("created_at", { ascending: true });
      if (mounted) {
        setMessages((data as ReturnMessage[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [returnId]);

  // ── realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`return_messages:${returnId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "return_messages",
          filter: `return_id=eq.${returnId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === (payload.new as ReturnMessage).id)) return prev;
            return [...prev, payload.new as ReturnMessage];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [returnId]);

  // ── auto-scroll to bottom ──────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── send message ───────────────────────────────────────────────────────────
  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSending(true);
    try {
      const { error } = await supabase.from("return_messages").insert({
        return_id: returnId,
        sender_id: user.id,
        sender_role: senderRole,
        body,
      });
      if (!error) setDraft("");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground py-4", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading messages…
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
        <MessageSquare className="h-4 w-4" />
        Return thread
        <span className="ml-auto text-xs text-muted-foreground">
          Ctrl+Enter to send
        </span>
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto rounded-lg border bg-zinc-50 p-3">
        {messages.length === 0 && (
          <p className="text-xs text-center text-muted-foreground py-4">
            No messages yet. Start the conversation below.
          </p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender_role === senderRole;
          const isSystem = msg.sender_role === "system";
          if (isSystem) {
            return (
              <div key={msg.id} className="text-xs text-center text-muted-foreground">
                {msg.body}
              </div>
            );
          }
          return (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col max-w-[80%] gap-1",
                isOwn ? "self-end items-end" : "self-start items-start"
              )}
            >
              <div
                className={cn(
                  "px-3 py-2 rounded-xl text-sm leading-relaxed",
                  isOwn
                    ? "bg-amber-500 text-white rounded-br-sm"
                    : "bg-white border text-zinc-800 rounded-bl-sm"
                )}
              >
                {msg.body}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {msg.sender_role === "admin" ? "BazaarX Support" : msg.sender_role} ·{" "}
                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={2}
          className="resize-none text-sm"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          className="shrink-0 self-end bg-amber-500 hover:bg-amber-600"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
