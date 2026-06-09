import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { cn } from '~/lib/utils';

export type FieldOption = { label: string; value: string };

/**
 * Thin wrapper over the RNR Select that works with plain string values and a
 * flat options array, hiding the {value,label} option-object plumbing.
 */
export function SelectField({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
}: {
  value: string | null | undefined;
  onValueChange: (value: string) => void;
  options: FieldOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const selected = options.find((o) => o.value === value);

  return (
    <Select
      value={selected ? { value: selected.value, label: selected.label } : undefined}
      onValueChange={(opt) => {
        if (opt) onValueChange(opt.value);
      }}
    >
      <SelectTrigger className={cn('w-full', className)} disabled={disabled}>
        <SelectValue placeholder={placeholder ?? ''} />
      </SelectTrigger>
      <SelectContent className="w-[--radix-select-trigger-width] max-h-80">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} label={o.label} />
        ))}
      </SelectContent>
    </Select>
  );
}
