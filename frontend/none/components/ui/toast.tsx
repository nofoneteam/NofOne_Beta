"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastItem = ToastOptions & {
  id: string;
};

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = React.useCallback((options: ToastOptions) => {
    const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

    const toastItem: ToastItem = {
      id,
      duration: 3200,
      variant: "info",
      ...options,
    };

    setToasts((current) => [toastItem, ...current]);

    window.setTimeout(() => {
      removeToast(id);
    }, toastItem.duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2 sm:right-6">
        {toasts.map((toastItem) => (
          <div
            key={toastItem.id}
            className={cn(
              "pointer-events-auto overflow-hidden rounded-3xl border px-4 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.12)] backdrop-blur-sm animate-toast-in",
              toastItem.variant === "success" && "border-green-100 bg-white text-green-950",
              toastItem.variant === "error" && "border-red-100 bg-white text-red-950",
              toastItem.variant === "info" && "border-slate-200 bg-white text-slate-950",
            )}
            role="status"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">{toastItem.title}</p>
                {toastItem.description ? (
                  <p className="mt-1 text-sm text-slate-600">{toastItem.description}</p>
                ) : null}
              </div>
              <button
                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                onClick={() => removeToast(toastItem.id)}
                type="button"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}
