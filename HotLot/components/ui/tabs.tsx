import React from "react";
export function Tabs({ value, onValueChange, children }:{ value:string, onValueChange:(v:string)=>void, children:React.ReactNode }){
  return <div data-value={value} className="space-y-2">{children}</div>;
}
export function TabsList({ children }:{ children:React.ReactNode }){ return <div className="grid grid-cols-2 gap-2">{children}</div>; }
export function TabsTrigger({ value, children, active, onClick }:{ value:string, children:React.ReactNode, active?:boolean, onClick?:()=>void }){
  return <button className={"btn btn-outline " + (active ? "bg-slate-900 text-white" : "")} onClick={onClick}>{children}</button>;
}
export function TabsContent({ children }:{ children:React.ReactNode }){ return <div>{children}</div>; }
