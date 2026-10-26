
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  FileText,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useRequireAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Customer = {
  id: string;
  name: string;
  type: string;
};

type InvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};
type TaxSettings = {
  defaultTaxRate: number;
  pricingMode: "inclusive" | "exclusive";
  taxSummary: "itemized" | "compact" | "hidden";
  enabledTaxes: string[];
};

type AccountingSettings = {
  baseCurrency: string;
  fyStartDate: string;
  dateFormat: string;
  paymentTerms: string;
  invoiceFormat: string;
  defaultSalesAccount: string;
  defaultExpenseAccount: string;
};

const PAYMENT_TERM_DAYS: Record<string, number> = {
  due_receipt: 0,
  net_7: 7,
  net_15: 15,
  net_30: 30,
  net_45: 45,
  net_60: 60,
};

function addDaysToDate(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  const resultYear = date.getFullYear();
  const resultMonth = String(date.getMonth() + 1).padStart(2, "0");
  const resultDay = String(date.getDate()).padStart(2, "0");

  return `${resultYear}-${resultMonth}-${resultDay}`;
}

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};



function NewInvoicePage() {
  const { loading: authLoading } = useRequireAuth();
  const router = useRouter();
const [editId, setEditId] = useState<string | null>(null);
const isEditing = Boolean(editId);

useEffect(() => {
  setEditId(
    new URLSearchParams(window.location.search).get("edit")
  );
}, []);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customerId, setCustomerId] = useState("");
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState(today());
  const [taxRate, setTaxRate] = useState(0);

const [taxSettings, setTaxSettings] = useState<TaxSettings>({
  defaultTaxRate: 0,
  pricingMode: "exclusive",
  taxSummary: "itemized",
  enabledTaxes: [],
});

const [accountingSettings, setAccountingSettings] =
  useState<AccountingSettings>({
    baseCurrency: "INR",
    fyStartDate: "04-01",
    dateFormat: "DD/MM/YYYY",
    paymentTerms: "net_30",
    invoiceFormat: "INV-{YYYY}-{SEQ}",
    defaultSalesAccount: "",
    defaultExpenseAccount: "",
  });


const [accountingSettingsLoading, setAccountingSettingsLoading] =
  useState(true);

const [taxSettingsLoading, setTaxSettingsLoading] = useState(true);
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const money = (amount: number) => {
  const currency = accountingSettings.baseCurrency || "INR";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(amount);
};

 useEffect(() => {
  if (authLoading) return;

  fetch("/api/contacts")
    .then(async (response) => {
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load customers.");
      }

      setCustomers(
        (data.contacts ?? []).filter(
          (contact: Customer) =>
            contact.type === "customer" || contact.type === "both"
        )
      );
    })
    .catch((err) => {
      setError(
        err instanceof Error ? err.message : "Unable to load customers."
      );
    })
    .finally(() => setCustomersLoading(false));
}, [authLoading]);


useEffect(() => {
  if (authLoading || customersLoading || !editId) return;

  let cancelled = false;

  async function loadInvoice() {
    try {
      setError("");

      const response = await fetch("/api/invoices");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load invoices.");
      }

     const invoice = (data.invoices as {
  id: string;
  status?: string;
  customerId?: string;
  issueDate?: string;
  dueDate?: string;
  taxRate?: number;
  items?: InvoiceItem[];
}[] | undefined)?.find(
  (item) => item.id === editId
);
      if (!invoice) {
        throw new Error("Invoice not found.");
      }

      if ((invoice.status ?? "draft").toLowerCase() !== "draft") {
        throw new Error("Only draft invoices can be edited.");
      }

      if (cancelled) return;

      setCustomerId(invoice.customerId ?? "");
      setIssueDate(invoice.issueDate ?? today());
      setDueDate(invoice.dueDate ?? today());
      setTaxRate(Number(invoice.taxRate ?? 0));

      setItems(
        invoice.items?.length
          ? invoice.items.map((item) => ({
              description: item.description ?? "",
              quantity: Number(item.quantity ?? 1),
              unitPrice: Number(item.unitPrice ?? 0),
            }))
          : [{ description: "", quantity: 1, unitPrice: 0 }]
      );
    } catch (err) {
      if (!cancelled) {
        setError(
          err instanceof Error ? err.message : "Unable to load invoice."
        );
      }
    }
  }

  void loadInvoice();

  return () => {
    cancelled = true;
  };
}, [authLoading, customersLoading, editId]);

useEffect(() => {
  if (authLoading) return;

  let cancelled = false;

  async function loadTaxSettings() {
    try {
      const response = await fetch("/api/tax-settings");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load tax settings."
        );
      }

      const settings = data.settings ?? {};

      if (cancelled) return;

      const loadedSettings: TaxSettings = {
        defaultTaxRate: Number(settings.defaultTaxRate ?? 0),
        pricingMode:
          settings.pricingMode === "inclusive"
            ? "inclusive"
            : "exclusive",
      taxSummary:
  settings.taxSummary === "itemized" ||
  settings.taxSummary === "compact" ||
  settings.taxSummary === "hidden"
    ? settings.taxSummary
    : "itemized",
        enabledTaxes: Array.isArray(settings.enabledTaxes)
          ? settings.enabledTaxes
          : [],
      };

      setTaxSettings(loadedSettings);

      // Apply the default only when creating a new invoice.
      // Existing draft invoices retain their saved tax rate.
      if (!editId) {
        setTaxRate(loadedSettings.defaultTaxRate);
      }
    } catch (err) {
      if (!cancelled) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load tax settings."
        );
      }
    } finally {
      if (!cancelled) {
        setTaxSettingsLoading(false);
      }
    }
  }

  void loadTaxSettings();

  return () => {
    cancelled = true;
  };
}, [authLoading, editId]);


useEffect(() => {
  if (authLoading) return;

  let cancelled = false;

  async function loadAccountingSettings() {
    try {
      const response = await fetch("/api/accounting-preferences");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load accounting preferences."
        );
      }

      if (cancelled) return;

      const settings = data.settings ?? {};

      setAccountingSettings((current) => ({
        ...current,
        ...settings,
      }));
    } catch (err) {
      if (!cancelled) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load accounting preferences."
        );
      }
    } finally {
      if (!cancelled) {
        setAccountingSettingsLoading(false);
      }
    }
  }

  void loadAccountingSettings();

  return () => {
    cancelled = true;
  };
}, [authLoading]);


useEffect(() => {
  if (
    authLoading ||
    accountingSettingsLoading ||
    isEditing
  ) {
    return;
  }

  const days =
    PAYMENT_TERM_DAYS[accountingSettings.paymentTerms] ?? 30;

  setDueDate(addDaysToDate(issueDate, days));
}, [
  authLoading,
  accountingSettingsLoading,
  accountingSettings.paymentTerms,
  isEditing,
  issueDate,
]);
 const enteredSubtotal = items.reduce(
  (sum, item) =>
    sum +
    Math.max(0, item.quantity) *
      Math.max(0, item.unitPrice),
  0
);

const taxMultiplier = 1 + taxRate / 100;

const subtotal =
  taxSettings.pricingMode === "inclusive" && taxMultiplier > 0
    ? enteredSubtotal / taxMultiplier
    : enteredSubtotal;

const tax =
  taxSettings.pricingMode === "inclusive"
    ? enteredSubtotal - subtotal
    : subtotal * taxRate / 100;

const total =
  taxSettings.pricingMode === "inclusive"
    ? enteredSubtotal
    : subtotal + tax;
   

  function updateItem(
    index: number,
    field: keyof InvoiceItem,
    value: string
  ) {
    setItems((current) =>
      current.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]:
                field === "description" ? value : Number(value),
            }
          : item
      )
    );
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }

    if (dueDate < issueDate) {
      setError("Due date cannot be earlier than the invoice date.");
      return;
    }

    if (
      items.some(
        (item) =>
          !item.description.trim() ||
          !Number.isFinite(item.quantity) ||
          !Number.isFinite(item.unitPrice) ||
          item.quantity <= 0 ||
          item.unitPrice < 0
      )
    ) {
      setError("Enter a description, positive quantity, and valid price for every item.");
      return;
    }

    setSaving(true);

    try {
     const response = await fetch(
  isEditing ? `/api/invoices/${editId}` : "/api/invoices",
  {
    method: isEditing ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerId,
      issueDate,
      dueDate,
      taxRate,
      items,
    }),
  }
);

const data = await response.json();

if (!response.ok) {
  throw new Error(
    data.error ||
      (isEditing ? "Unable to update invoice." : "Unable to create invoice.")
  );
}

router.push("/invoices");
router.refresh();
   
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create invoice."
      );
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }


return (
  <div className="min-h-screen bg-background text-foreground">
    <div className="hidden md:block">
      <Sidebar />
    </div>

    <main className="min-w-0 flex-1 md:ml-64">
      <Header />


        <div className="mx-auto w-full max-w-[1500px] space-y-5 p-3 sm:p-4 lg:p-6">
          <button
            type="button"
            onClick={() => router.push("/invoices")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Invoices
          </button>

          <div>
     <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
  {isEditing ? "Edit Invoice" : "Create Invoice"}
</h1>

<p className="mt-1 text-sm text-muted-foreground">
  {isEditing
    ? "Update the customer, dates, and line items for this draft."
    : "Create a customer invoice and review the totals before saving."}
</p>      </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300"
            >
              {error}
            </div>
          )}

        <form onSubmit={handleSave} className="space-y-5">
  <div className="grid grid-cols-1 items-start gap-5">

    {/* LEFT COLUMN */}
    <div className="min-w-0 space-y-5">

      {/* Invoice Details */}
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b px-4 py-3.5 sm:px-5">
          <h2 className="text-sm font-semibold">Invoice Details</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Choose the customer and set the invoice dates.
          </p>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
          {/* Customer */}
          <div className="space-y-1.5 sm:col-span-2 xl:col-span-1">
            <label htmlFor="customer" className="text-sm font-medium">
              Customer *
            </label>

            <select
              id="customer"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              required
              disabled={customersLoading}
            >
              <option value="">
                {customersLoading ? "Loading customers..." : "Select customer"}
              </option>

              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>

            {!customersLoading && customers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Add a customer in Contacts before creating an invoice.
              </p>
            )}
          </div>

          {/* Invoice Date */}
          <div className="space-y-1.5">
            <label htmlFor="issue-date" className="text-sm font-medium">
              Invoice Date *
            </label>

            <Input
              id="issue-date"
              type="date"
              className="h-9 text-sm"
              value={issueDate}
              onChange={(event) => {
                setIssueDate(event.target.value);

                if (dueDate < event.target.value) {
                  setDueDate(event.target.value);
                }
              }}
              required
            />
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <label htmlFor="due-date" className="text-sm font-medium">
              Due Date *
            </label>

            <Input
              id="due-date"
              type="date"
              className="h-9 text-sm"
              min={issueDate}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              required
            />
          </div>
        </div>
      </section>

      {/* Invoice Items */}
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-semibold">Invoice Items</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add descriptions, quantities, and unit prices.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full sm:w-auto"
            onClick={() =>
              setItems((current) => [
                ...current,
                { description: "", quantity: 1, unitPrice: 0 },
              ])
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Quantity</th>
                <th className="px-4 py-3 font-medium">
                  Unit Price ({accountingSettings.baseCurrency || "INR"})
                </th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>

            <tbody className="divide-y">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="min-w-52 px-4 py-3">
                    <Input
                      className="h-9 text-sm"
                      value={item.description}
                      onChange={(event) =>
                        updateItem(index, "description", event.target.value)
                      }
                      placeholder="Item description"
                      maxLength={300}
                      required
                    />
                  </td>

                  <td className="min-w-28 px-4 py-3">
                    <Input
                      className="h-9 text-sm"
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(index, "quantity", event.target.value)
                      }
                      required
                    />
                  </td>

                  <td className="min-w-36 px-4 py-3">
                    <Input
                      className="h-9 text-sm"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(event) =>
                        updateItem(index, "unitPrice", event.target.value)
                      }
                      required
                    />
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                    {money(
                      Math.max(0, item.quantity) *
                        Math.max(0, item.unitPrice)
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={items.length === 1}
                      onClick={() =>
                        setItems((current) =>
                          current.filter((_, i) => i !== index)
                        )
                      }
                      aria-label={`Remove item ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>

 
   {/* INVOICE SUMMARY - BELOW THE ITEMS */}
<div className="min-w-0 space-y-5">

      {/* Invoice Summary */}
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b p-4 sm:p-5">
          <h2 className="text-sm font-semibold">Invoice Summary</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Review totals before saving.
          </p>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Pricing mode:{" "}
            {taxSettings.pricingMode === "inclusive"
              ? "Tax included in item prices"
              : "Tax added to item prices"}
          </p>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="text-sm font-medium tabular-nums">
              {money(subtotal)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <label htmlFor="tax-rate" className="text-sm text-muted-foreground">
              Tax (%)
            </label>

            <Input
              id="tax-rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={taxRate}
              onChange={(event) => setTaxRate(Number(event.target.value))}
              className="h-9 w-28"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Tax Amount</span>
            <span className="text-sm font-medium tabular-nums">
              {money(tax)}
            </span>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold tabular-nums">
                {money(total)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Helpful reminder */}
      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold">Before you save</h2>
        <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
          <li>Select a customer from Contacts.</li>
          <li>Check the invoice and due dates.</li>
          <li>Review the line items and final total.</li>
        </ul>
      </section>

   </div>
  </div>

  {/* Form Actions */}
  <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-xs text-muted-foreground">
      {isEditing
        ? "Only draft invoices can be edited."
        : "Review the totals before saving this invoice."}
    </p>

    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        className="h-9 w-full sm:w-auto"
        onClick={() => router.push("/invoices")}
        disabled={saving}
      >
        Cancel
      </Button>

      <Button
        type="submit"
        className="h-9 w-full sm:w-auto"
        disabled={
          saving ||
          customersLoading ||
          taxSettingsLoading ||
          accountingSettingsLoading ||
          customers.length === 0
        }
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            {isEditing ? "Save Changes" : "Save Invoice"}
          </>
        )}
      </Button>
    </div>
  </div>
</form>
        </div>
      </main>
    </div>
  );
}
export default function NewInvoicePageWrapper() {
  return <NewInvoicePage />;
}