"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import type { TooltipProps } from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    color?: string;
  };
};

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  }
>(({ className, config, children, ...props }, ref) => {
  const style = React.useMemo(
    () =>
      Object.fromEntries(
        Object.entries(config).map(([key, value]) => [`--color-${key}`, value.color ?? "#166534"]),
      ) as React.CSSProperties,
    [config],
  );

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        className={cn(
          "h-[260px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-[#6b7a6d] [&_.recharts-cartesian-grid_line]:stroke-[#e3ece3] [&_.recharts-curve.recharts-tooltip-cursor]:stroke-[#c9d8cb] [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none",
          className,
        )}
        style={style}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string | number; color?: string }>;
  label?: string | number;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#dce9dc] bg-white px-3 py-2 shadow-[0_12px_32px_rgba(23,49,34,0.10)]">
      <p className="text-[12px] font-semibold text-[#173122]">{String(label)}</p>
      <div className="mt-2 space-y-1.5">
        {payload.map((item) => {
          const key = String(item.dataKey);
          const itemConfig = config[key];

          return (
            <div key={key} className="flex items-center justify-between gap-4 text-[12px]">
              <div className="flex items-center gap-2 text-[#5f7363]">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color || itemConfig?.color || "#166534" }}
                />
                <span>{itemConfig?.label || key}</span>
              </div>
              <span className="font-semibold text-[#173122]">{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent };
