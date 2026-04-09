"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "w-full",
        months: "flex flex-col",
        month: "space-y-4",
        month_caption: "relative flex h-10 items-center justify-center",
        caption_label: "text-sm font-semibold text-[#111111]",
        nav: "pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-1",
        button_previous:
          "pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full text-[#111111] transition-colors hover:bg-[#f4f4ef]",
        button_next:
          "pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full text-[#111111] transition-colors hover:bg-[#f4f4ef]",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 text-[12px] font-medium text-[#8a9198]",
        week: "mt-1 flex w-full",
        day: "h-9 w-9 p-0 text-center text-sm",
        day_button:
          "h-9 w-9 rounded-md p-0 font-normal text-[#111111] transition-colors hover:bg-[#f4f4ef] aria-selected:opacity-100",
        selected:
          "bg-green-800 text-white hover:bg-green-800 hover:text-white focus:bg-green-800 focus:text-white",
        today: "bg-[#edf5ee] text-green-800 font-semibold",
        outside: "text-[#b8bcc2] opacity-70 aria-selected:bg-[#f4f4ef]",
        disabled: "text-[#c9ccd1] opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft className={className} {...chevronProps} />
          ) : (
            <ChevronRight className={className} {...chevronProps} />
          ),
      }}
      {...props}
    />
  );
}

function ChevronLeft({
  className,
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-4 w-4", className)}
      {...props}
    >
      <path
        d="m15 18-6-6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRight({
  className,
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-4 w-4", className)}
      {...props}
    >
      <path
        d="m9 18 6-6-6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
