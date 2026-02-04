import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  default: "bg-primary/20 text-white hover:bg-primary/30 border-primary/20",
  secondary: "bg-secondary/20 text-secondary-foreground hover:bg-secondary/30 border-secondary/20",
  destructive: "bg-red-900/30 text-red-200 hover:bg-red-900/50 border-red-500/30",
  outline: "text-slate-100 border-slate-700",
  success: "bg-emerald-900/30 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-900/30 text-amber-400 border-amber-500/30",
  security: "bg-cyan-950/50 text-cyan-400 border-cyan-800/50 uppercase tracking-widest font-mono text-[10px]"
};

function Badge({ className, variant = "default", ...props }) {
  return (
    <div className={cn(
      "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      variants[variant],
      className
    )} {...props} />
  );
}

export { Badge };
