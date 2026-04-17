import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import {cn} from '@/lib/utils';

const textareaVariants = cva(
  'flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
  {
    variants: {
      variant: {
        default: 'border-input bg-background',
        flushed: 'border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-foreground',
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, VariantProps<typeof textareaVariants> {}


const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({className, variant, ...props}, ref) => {
    return (
      <textarea
        className={cn(textareaVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea};
