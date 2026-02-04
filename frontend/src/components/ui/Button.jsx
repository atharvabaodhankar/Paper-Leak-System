import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const variants = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-white/10 glass-card',
  danger: 'bg-red-900/50 border border-red-500/50 text-red-200 hover:bg-red-900/70 hover:text-red-100',
  ghost: 'hover:bg-white/5 text-slate-300 hover:text-white',
  outline: 'border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
};

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 py-2',
  lg: 'h-12 px-6 text-lg',
  icon: 'h-10 w-10 p-0 flex items-center justify-center'
};

const Button = React.forwardRef(({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  children, 
  disabled,
  type = 'button',
  ...props 
}, ref) => {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-slate-950',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </motion.button>
  );
});

Button.displayName = 'Button';

export { Button };
