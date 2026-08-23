'use client';

import { useParameters } from '@/contexts/parameters-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface ParameterSelectProps {
  groupCode: string;
  value?: string;
  onChange?: (value: string) => void;
  onValueChange?: (value: string) => void;
  showAll?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ParameterSelect({
  groupCode,
  value,
  onChange,
  onValueChange,
  showAll = false,
  placeholder = 'Sélectionner...',
  disabled = false,
}: ParameterSelectProps) {
  const { getItems, isLoading } = useParameters();
  let items = getItems(groupCode);

  // Fallback for SENDER / PRODUCER compatibility
  if (items.length === 0 && groupCode === 'SENDER') {
    items = getItems('PRODUCER');
  } else if (items.length === 0 && groupCode === 'PRODUCER') {
    items = getItems('SENDER');
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 border rounded-md px-3 py-2 h-10">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange ?? onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showAll && <SelectItem value="__all__">Tous</SelectItem>}
        {items.map((item) => (
          <SelectItem key={item.id} value={item.code}>
            {item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}