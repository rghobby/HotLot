import React from "react";
import { cn } from "@/lib/utils";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary"|"outline"|"secondary", size?: "sm"|"md" };
export function Button({ className, variant="primary", size="md", ...props }: Props) {
  const v = variant==="primary" ? "btn btn-primary" : variant==="outline" ? "btn btn-outline" : "btn";
  const s = size==="sm" ? "px-2 py-1 text-xs rounded-lg" : "";
  return <button className={cn(v, s, className)} {...props} />;
}
