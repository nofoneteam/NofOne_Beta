import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-green-200 bg-white px-3 py-2 text-sm text-green-950 outline-none transition-colors placeholder:text-green-700/45 focus:border-green-600",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };

