"use client";

import { useState, useEffect } from "react";
import { reminderApi, Reminder, AUTH_TOKEN_STORAGE_KEY } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, CheckCircle2, CircleDashed } from "lucide-react";

function getStoredAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function ReminderSection({ onBack }: { onBack: () => void }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadReminders();
  }, []);

  async function loadReminders() {
    const token = getStoredAccessToken();
    if (!token) return;

    try {
      setLoading(true);
      const res = await reminderApi.getReminders(token);
      setReminders(res.data);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to load reminders", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !message || !reminderTime) return;

    const token = getStoredAccessToken();
    if (!token) return;

    setSaving(true);
    try {
      const dbDate = new Date(reminderTime).toISOString();
      await reminderApi.createReminder({
        title,
        message,
        reminderTime: dbDate,
      }, token);

      toast({
        title: "Notification scheduled",
        description: "Your reminder has been registered.",
        variant: "success",
      });

      setTitle("");
      setMessage("");
      setReminderTime("");
      await loadReminders();
    } catch (err: any) {
      toast({
        title: "Failed to set reminder",
        description: err.message,
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-10 animate-fade-up">
      <div className="flex items-center gap-3 px-1">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#4b4f55] transition-colors hover:bg-[#f3f3ee]"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-[32px] font-semibold tracking-tight text-[#171717]">Reminders</h1>
      </div>

      <div className="rounded-[24px] border border-[#ecece7] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-[18px] font-semibold text-[#111111]">Create Reminder</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#111111] mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Drink Water"
              className="w-full rounded-[14px] border border-[#ecece7] bg-[#fcfcf9] px-4 py-3 text-[14px] outline-none transition-colors focus:border-green-800"
              required
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#111111] mb-1">Message</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Time to drink a glass of water!"
              className="w-full rounded-[14px] border border-[#ecece7] bg-[#fcfcf9] px-4 py-3 text-[14px] outline-none transition-colors focus:border-green-800"
              required
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#111111] mb-1">Time</label>
            <input
              type="datetime-local"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full rounded-[14px] border border-[#ecece7] bg-[#fcfcf9] px-4 py-3 text-[14px] outline-none transition-colors focus:border-green-800"
              required
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Scheduling..." : "Schedule Notification"}
          </Button>
        </form>
      </div>

      <div className="space-y-3">
        <h2 className="px-1 text-[18px] font-semibold text-[#111111]">Your Reminders</h2>
        {loading ? (
          <p className="px-1 text-[13px] text-[#8e949c]">Loading...</p>
        ) : reminders.length === 0 ? (
          <p className="px-1 text-[13px] text-[#8e949c]">No active reminders.</p>
        ) : (
          reminders.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-[20px] bg-white p-4 border border-[#ecece7] shadow-sm">
              <div>
                <p className="text-[15px] font-semibold text-[#111111]">{r.title}</p>
                <p className="text-[13px] text-[#8e949c]">{new Date(r.reminderTime).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                {r.status === "triggered" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <CircleDashed className="h-5 w-5 text-yellow-500" />
                )}
                <span className="text-[13px] capitalize font-medium text-[#111111]">{r.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
