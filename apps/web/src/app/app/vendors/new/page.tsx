import { createVendorAction } from "../../actions";
import { Field, Input } from "@/components/finance-form";

export default function NewVendorPage() {
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Counterparty record</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">New vendor</h1>
        <p className="text-muted mt-2 text-sm">
          Keep this operational: identity, category and an optional finance
          contact.
        </p>
        <form
          action={createVendorAction}
          className="card mt-8 grid gap-5 p-5 sm:grid-cols-2 md:p-8"
        >
          <Field label="Display name">
            <Input name="displayName" required maxLength={100} />
          </Field>
          <Field label="Legal name">
            <Input name="legalName" required maxLength={160} />
          </Field>
          <Field label="Category">
            <Input name="category" maxLength={80} />
          </Field>
          <Field label="Contact name">
            <Input name="contactName" maxLength={100} />
          </Field>
          <Field label="Contact email">
            <Input name="contactEmail" type="email" />
          </Field>
          <div className="flex items-end">
            <button className="button button-dark w-full" type="submit">
              Create vendor
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
