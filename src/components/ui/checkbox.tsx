import type { ComponentProps } from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return <CheckboxPrimitive.Root
    className={cn('size-4 shrink-0 rounded border border-input bg-white outline-offset-3 focus-visible:outline-2 focus-visible:outline-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white disabled:cursor-not-allowed', className)}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center"><Check className="size-3" strokeWidth={3} /></CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>;
}
