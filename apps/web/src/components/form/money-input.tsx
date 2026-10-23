import { SUPPORTED_CURRENCIES, type Currency } from '@tutor-finance/shared';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function MoneyInput({
  id,
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
  amountName,
  currencyName,
  placeholder = '0.00',
  required,
}: {
  id?: string;
  amount: string;
  currency: Currency;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (value: Currency) => void;
  amountName?: string;
  currencyName?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <Input
        id={id}
        name={amountName}
        type="number"
        inputMode="decimal"
        min="0.01"
        step="0.01"
        placeholder={placeholder}
        value={amount}
        required={required}
        onChange={(e) => onAmountChange(e.target.value)}
      />
      <Select
        name={currencyName}
        value={currency}
        onValueChange={(v) => onCurrencyChange(v as Currency)}
      >
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_CURRENCIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
