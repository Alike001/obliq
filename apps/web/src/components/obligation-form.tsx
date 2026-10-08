import type { listVendors } from "@obliq/database";
import { Field, Input, Select, Textarea } from "./finance-form";
import { SubmitButton } from "./submit-button";

type Vendors = Awaited<ReturnType<typeof listVendors>>;
export function ObligationForm({
  vendors,
  action,
  defaults = {},
  submitLabel = "Create obligation",
}: {
  vendors: Vendors;
  action: (data: FormData) => void | Promise<void>;
  defaults?: Record<string, string>;
  submitLabel?: string;
}) {
  return (
    <form
      action={action}
      className="card mt-8 grid gap-5 p-5 sm:grid-cols-2 md:p-8"
    >
      <Field label="Vendor">
        <Select name="vendorId" required defaultValue={defaults.vendorId ?? ""}>
          <option value="" disabled>
            Select vendor
          </option>
          {vendors.map((v) => (
            <option value={v.id} key={v.id}>
              {v.displayName}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Obligation type">
        <Select
          name="type"
          required
          defaultValue={defaults.type ?? "VENDOR_INVOICE"}
        >
          <option value="VENDOR_INVOICE">Vendor invoice</option>
          <option value="CONTRACTOR_BILL">Contractor bill</option>
        </Select>
      </Field>
      <Field label="Invoice / reference number">
        <Input
          name="reference"
          required
          maxLength={100}
          defaultValue={defaults.reference}
        />
      </Field>
      {/* Two fields under one heading, each with its own name. */}
      <div
        role="group"
        aria-labelledby="amount-group"
        aria-describedby="amount-hint"
      >
        <p id="amount-group" className="text-[0.8125rem] font-bold">
          Amount
        </p>
        <div className="grid grid-cols-[90px_1fr] gap-2">
          <Input
            name="currency"
            aria-label="Currency code, three letters"
            required
            pattern="[A-Za-z]{3}"
            maxLength={3}
            autoCapitalize="characters"
            defaultValue={defaults.currency ?? "USD"}
          />
          <Input
            name="amount"
            aria-label="Amount"
            required
            inputMode="decimal"
            placeholder="0.00"
            defaultValue={defaults.amount}
          />
        </div>
        <p id="amount-hint" className="text-muted mt-1 text-xs">
          Two decimal places maximum; stored as integer minor units.
        </p>
      </div>
      <Field label="Due date">
        <Input
          name="dueDate"
          required
          type="date"
          defaultValue={defaults.dueDate}
        />
      </Field>
      <Field label="Category">
        <Input
          name="category"
          maxLength={80}
          defaultValue={defaults.category}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Business purpose">
          <Textarea
            name="description"
            required
            maxLength={500}
            defaultValue={defaults.description}
          />
        </Field>
      </div>
      <div className="flex flex-col gap-3 border-t pt-5 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted text-xs">
          Submitting confirms this financial record as a human action. It stops
          at Under review; nothing is approved or paid.
        </p>
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
