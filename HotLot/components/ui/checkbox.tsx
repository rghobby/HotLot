import React from "react";
export function Checkbox({ checked, onChange }: { checked?: boolean, onChange?: (v:boolean)=>void }) {
  return <input type="checkbox" className="size-4 rounded border-slate-400" checked={!!checked} onChange={e=>onChange?.(e.target.checked)} />;
}
