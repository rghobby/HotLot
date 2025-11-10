import React from "react";
import { cn } from "@/lib/utils";
export function Badge({ className, children, variant="outline" }: { className?: string, children: React.ReactNode, variant?: "outline"|"secondary"|"destructive" }) {
  const v = variant==="secondary" ? "border-slate-300 bg-slate-100" : variant==="destructive" ? "border-red-300 bg-red-50 text-red-700" : "border-slate-300";
  return <span className={cn("badge", v, className)}>{children}</span>;
}
