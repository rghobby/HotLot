import React from "react";
export function Slider({ defaultValue, onChange, max=10, step=0.1 }: { defaultValue?: number[], onChange?: (v:number[])=>void, max?:number, step?:number }) {
  const [val, setVal] = React.useState(defaultValue?.[0] ?? 0);
  return (
    <input
      type="range"
      min={0}
      max={max}
      step={step}
      value={val}
      onChange={(e)=>{ const v=Number(e.target.value); setVal(v); onChange?.([v]); }}
      className="w-full"
    />
  );
}
