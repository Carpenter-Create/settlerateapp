import { MortgageInputs } from "@/lib/mortgage";
import { CurrencyInput } from "./CurrencyInput";
import { InputField } from "./InputField";
import { DownPaymentInput } from "./DownPaymentInput";

interface PurchaseInputsProps {
  inputs: MortgageInputs;
  onUpdate: <K extends keyof MortgageInputs>(key: K, value: MortgageInputs[K]) => void;
  onBatchUpdate: (updates: Partial<MortgageInputs>) => void;
}

export function PurchaseInputs({ inputs, onUpdate, onBatchUpdate }: PurchaseInputsProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <InputField label="Purchase price" description="The total price of the home">
        <CurrencyInput
          value={inputs.purchasePrice}
          onChange={(v) => onUpdate("purchasePrice", v)}
          min={0}
        />
      </InputField>

      <DownPaymentInput
        value={inputs.downPayment}
        type={inputs.downPaymentType}
        purchasePrice={inputs.purchasePrice}
        onChange={(value, type) => {
          onBatchUpdate({
            downPayment: value,
            downPaymentType: type,
          });
        }}
      />
    </div>
  );
}
