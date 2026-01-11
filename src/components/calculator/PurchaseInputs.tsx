import { MortgageInputs, PurchaseInputs as PurchaseInputsType } from "@/lib/mortgage";
import { CurrencyInput } from "./CurrencyInput";
import { InputField } from "./InputField";
import { DownPaymentInput } from "./DownPaymentInput";

interface PurchaseInputsProps {
  inputs: MortgageInputs;
  onBatchUpdate: (updates: Partial<MortgageInputs>) => void;
}

export function PurchaseInputs({ inputs, onBatchUpdate }: PurchaseInputsProps) {
  const purchase = inputs.purchase;

  const updatePurchase = (updates: Partial<PurchaseInputsType>) => {
    onBatchUpdate({
      purchase: { ...purchase, ...updates },
    });
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <InputField label="Purchase price" description="The total price of the home">
        <CurrencyInput
          value={purchase.purchasePrice}
          onChange={(v) => updatePurchase({ purchasePrice: v })}
          min={0}
        />
      </InputField>

      <DownPaymentInput
        value={purchase.downPayment}
        type={purchase.downPaymentType}
        purchasePrice={purchase.purchasePrice}
        onChange={(value, type) => {
          updatePurchase({
            downPayment: value,
            downPaymentType: type,
          });
        }}
      />
    </div>
  );
}
