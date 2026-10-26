"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Loader2,
  Receipt,
  Pencil,
  Trash2,
  Download,
  X,
  Send,
  Wallet,
   Eye,
  ChevronRight,
} from "lucide-react";
import { generateInvoicePDF } from "@/lib/generate-invoice-pdf";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useRequireAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/lib/use-permissions";

type Invoice = {
  id: string;
  invoiceNumber?: string;
  customerName?: string;
  issueDate?: string;
  dueDate?: string;
  items?: {
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal?: number;
  taxRate?: number;
  tax?: number;
  total?: number;
  status?: string;
  amountPaid: number;
  balanceDue: number;
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

const formatINR = (value: number | undefined) => inr.format(value ?? 0);

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getEffectiveStatus(invoice: Invoice, today: Date) {
  const status = (invoice.status ?? "draft").toLowerCase();
  const dueDate = invoice.dueDate
    ? new Date(`${invoice.dueDate}T00:00:00`)
    : null;

  if (
    status !== "draft" &&
    status !== "paid" &&
    dueDate &&
    !Number.isNaN(dueDate.getTime()) &&
    dueDate < today
  ) {
    return "overdue";
  }
  return status;
}

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Unpaid" },
  { value: "partially_paid", label: "Partial" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
];

type Row = { invoice: Invoice; status: string };

export default function InvoicesPage() {
  const { loading: authLoading } = useRequireAuth();
   const { permissions, isAdmin } = usePermissions();
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [paymentReference, setPaymentReference] = useState("");

  useEffect(() => {
    if (authLoading) return;

    async function loadInvoices() {
      try {
        const response = await fetch("/api/invoices");
        const contentType = response.headers.get("content-type");

        if (!contentType?.includes("application/json")) {
          throw new Error("Invoices API is not available yet.");
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load invoices.");
        }

        setInvoices(data.invoices ?? []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load invoices."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadInvoices();
  }, [authLoading]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows: Row[] = invoices.map((invoice) => ({
    invoice,
    status: getEffectiveStatus(invoice, today),
  }));

  const filtered = rows.filter(({ invoice, status }) => {
    const query = search.toLowerCase();
    const matchesSearch =
      (invoice.invoiceNumber ?? "").toLowerCase().includes(query) ||
      (invoice.customerName ?? "").toLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const countFor = (value: string) =>
    value === "all"
      ? rows.length
      : rows.filter((item) => item.status === value).length;

  // Desktop panel always shows something: the picked invoice, or the first one.
  const selectedRow =
    filtered.find((row) => row.invoice.id === selectedId) ?? filtered[0];
  const sheetRow = sheetOpen
    ? rows.find((row) => row.invoice.id === selectedId)
    : undefined;

  const issuedRows = rows.filter((item) => item.status !== "draft");
  const totalInvoiced = issuedRows.reduce(
    (s, i) => s + (i.invoice.total ?? 0),
    0
  );
  const totalCollected = issuedRows.reduce(
    (s, i) => s + (i.invoice.amountPaid ?? 0),
    0
  );
  const totalOutstanding = issuedRows
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + (i.invoice.balanceDue ?? 0), 0);
  const overdueCount = rows.filter((i) => i.status === "overdue").length;
  const collectionRate =
    totalInvoiced > 0
      ? Math.min(100, Math.round((totalCollected / totalInvoiced) * 100))
      : 0;

  const handleDownloadPDF = (invoice: Invoice) => {
    if (!invoice.invoiceNumber || !invoice.customerName || !invoice.items) {
      setError("Invoice details are incomplete. Please reload the invoices.");
      return;
    }

    try {
      generateInvoicePDF({
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        issueDate: invoice.issueDate ?? "",
        dueDate: invoice.dueDate ?? "",
        items: invoice.items,
        subtotal: invoice.subtotal ?? 0,
        taxRate: invoice.taxRate ?? 0,
        tax: invoice.tax ?? 0,
        total: invoice.total ?? 0,
        status: invoice.status ?? "draft",
        amountPaid: invoice.amountPaid ?? 0,
        balanceDue:
          invoice.balanceDue ??
          (invoice.total ?? 0) - (invoice.amountPaid ?? 0),
      });
    } catch {
      setError("Unable to generate the invoice PDF.");
    }
  };

  const handleIssueInvoice = async (invoice: Invoice) => {
    const confirmed = window.confirm(`Issue invoice ${invoice.invoiceNumber}?`);
    if (!confirmed) return;

    setActionLoading(invoice.id);
    setError("");

    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sent" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to issue invoice.");
      }

      setInvoices((current) =>
        current.map((item) =>
          item.id === invoice.id ? { ...item, status: "sent" } : item
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to issue invoice."
      );
    } finally {
      setActionLoading("");
    }
  };

  const openPayment = (invoice: Invoice) => {
    setPaymentInvoice(invoice);
    setPaymentAmount(String(invoice.balanceDue ?? invoice.total ?? 0));
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod("upi");
    setPaymentReference("");
    setError("");
  };

  const handleRecordPayment = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!paymentInvoice) return;

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    setActionLoading(paymentInvoice.id);
    setError("");

    try {
      const response = await fetch(
        `/api/invoices/${paymentInvoice.id}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            paymentDate,
            method: paymentMethod,
            reference: paymentReference,
          }),
        }
      );

      const contentType = response.headers.get("content-type");

      if (!contentType?.includes("application/json")) {
        throw new Error(
          `Payment API returned HTML instead of JSON (HTTP ${response.status}). Check the API route path.`
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to record payment.");
      }

      setInvoices((current) =>
        current.map((invoice) =>
          invoice.id === paymentInvoice.id
            ? {
                ...invoice,
                amountPaid: data.amountPaid,
                balanceDue: data.balanceDue,
                status: data.status,
              }
            : invoice
        )
      );

      setPaymentInvoice(null);
      setPaymentAmount("");
      setPaymentReference("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to record payment."
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    const confirmed = window.confirm(
      `Delete draft invoice ${invoice.invoiceNumber ?? invoice.id}? This cannot be undone.`
    );
    if (!confirmed) return;

    setActionLoading(invoice.id);
    setError("");

    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete invoice.");
      }

      setInvoices((current) => current.filter((item) => item.id !== invoice.id));
      setSheetOpen(false);
      setSelectedId("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete invoice."
      );
    } finally {
      setActionLoading("");
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

const detailProps = {
  busyId: actionLoading,
  onPdf: handleDownloadPDF,
  onIssue: handleIssueInvoice,
  onPay: openPayment,
  onEdit: (invoice: Invoice) =>
    router.push(`/invoices/new?edit=${invoice.id}`),
  onDelete: handleDeleteInvoice,
  canEdit: isAdmin || permissions["invoices.edit"],
  canDelete: isAdmin || permissions["invoices.delete"],
};

  return (
    <div className="min-h-screen bg-background text-foreground">
  <div className="hidden md:block">
    <Sidebar />
  </div>

  <main className="min-w-0 flex-1 md:ml-64">
        <Header />

        <div className="mx-auto w-full max-w-none space-y-4 p-3 sm:p-4 lg:p-5">
          {/* Title */}
          <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              {/* <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Invoices
              </h1> */}
              <p className="mt-1 text-sm text-muted-foreground">
                Create and manage customer invoices.
              </p>
            </div>

           <Button
  size="sm"
  className="h-9 w-full shrink-0 sm:w-auto"
  onClick={() => router.push("/invoices/new")}
>
              <Plus className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Create Invoice</span>
              <span className="sr-only sm:hidden">Create Invoice</span>
            </Button>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start justify-between gap-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Overview strip */}
          
{/* Invoice Table */}
<section className="overflow-hidden rounded-xl border bg-card shadow-sm">

  {/* Search and Filters */}
  <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">

    {/* Search */}
    <div className="relative w-full sm:max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by invoice number or customer..."
        className="h-9 pl-9 text-sm"
        aria-label="Search invoices"
      />
    </div>

    {/* Filters */}
    <div className="flex flex-wrap items-center gap-2">

      {/* Status Filter */}
      <select
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value)}
        aria-label="Filter invoices by status"
        className="h-9 rounded-md border border-border bg-background px-3 text-sm"
      >
        <option value="all">All Statuses</option>
        <option value="draft">Draft</option>
        <option value="sent">Unpaid</option>
        <option value="partially_paid">Partially Paid</option>
        <option value="overdue">Overdue</option>
        <option value="paid">Paid</option>
      </select>

      {/* Create Invoice */}
      {/* <Button
        size="sm"
        className="h-9"
        onClick={() => router.push("/invoices/new")}
      >
        <Plus className="mr-2 h-4 w-4" />
        Create Invoice
      </Button> */}

    </div>
  </div>

  {/* Table */}
  <div className="w-full overflow-x-auto">

    <table className="w-full min-w-[900px] text-sm">

      {/* Table Header */}
      <thead className="border-b bg-muted/40">

        <tr className="text-left text-xs font-semibold text-muted-foreground">

          <th className="px-4 py-3">
            Invoice #
          </th>

          <th className="px-4 py-3">
            Customer Name
          </th>

          <th className="px-4 py-3">
            Invoice Date
          </th>

          <th className="px-4 py-3 text-right">
            Total Amount
          </th>

          <th className="px-4 py-3 text-right">
            GST Amount
          </th>

          <th className="px-4 py-3">
            Payment Status
          </th>

          <th className="px-4 py-3 text-right">
            Actions
          </th>

        </tr>

      </thead>

      {/* Table Body */}
      <tbody className="divide-y">

        {loading ? (

          <tr>
            <td
              colSpan={7}
              className="py-12 text-center text-muted-foreground"
            >
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
              Loading invoices...
            </td>
          </tr>

        ) : filtered.length === 0 ? (

          <tr>
            <td
              colSpan={7}
              className="py-12 text-center text-muted-foreground"
            >
              No invoices found.
            </td>
          </tr>

        ) : (

          filtered.map(({ invoice, status }) => (

            <tr
              key={invoice.id}
              className="transition-colors hover:bg-muted/30"
            >

              {/* Invoice Number */}
              <td className="whitespace-nowrap px-4 py-3">

                <span className="font-medium text-primary">
                  {invoice.invoiceNumber || invoice.id}
                </span>

              </td>

              {/* Customer */}
              <td className="px-4 py-3">

                <span className="font-medium">
                  {invoice.customerName || "Unknown customer"}
                </span>

              </td>

              {/* Invoice Date */}
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">

                {formatDate(invoice.issueDate)}

              </td>

              {/* Total */}
              <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">

                {formatINR(invoice.total)}

              </td>

              {/* GST */}
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">

                {formatINR(invoice.tax)}

              </td>

              {/* Status */}
              <td className="px-4 py-3">

                <InvoiceStatus status={status} />

              </td>

              {/* Actions */}
              <td className="px-4 py-3">

                <div className="flex items-center justify-end gap-1">

                  {/* View */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="View invoice"
                    onClick={() => {
                      setSelectedId(invoice.id);
                      setSheetOpen(true);
                    }}
                  >
<Eye className="h-4 w-4" />
                  </Button>

                  {/* Edit */}
                  {status === "draft" && detailProps.canEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Edit invoice"
                      onClick={() => detailProps.onEdit(invoice)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}

                  {/* PDF */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Download PDF"
                    onClick={() => handleDownloadPDF(invoice)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  {/* Delete */}
                  {status === "draft" && detailProps.canDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                      title="Delete invoice"
                      disabled={actionLoading === invoice.id}
                      onClick={() => handleDeleteInvoice(invoice)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}

                </div>

              </td>

            </tr>

          ))

        )}

      </tbody>

    </table>

  </div>

</section>

        </div>
      </main>

      {/* Mobile / tablet detail sheet */}
      {sheetRow && (
        <div
         className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => setSheetOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Invoice details"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border bg-card shadow-xl sm:max-w-xl sm:rounded-2xl"
          >
            <InvoiceDetail
              invoice={sheetRow.invoice}
              status={sheetRow.status}
              onClose={() => setSheetOpen(false)}
              {...detailProps}
            />
          </div>
        </div>
      )}

      {/* Record payment dialog */}
      {paymentInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => setPaymentInvoice(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Record payment"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border bg-card p-4 shadow-xl sm:max-w-lg sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Record Payment</h2>
                <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                  {paymentInvoice.invoiceNumber} · {paymentInvoice.customerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentInvoice(null)}
                aria-label="Close"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/50 p-3 text-sm">
              <span className="text-muted-foreground">Remaining balance</span>
              <span className="font-semibold tabular-nums">
                {formatINR(paymentInvoice.balanceDue)}
              </span>
            </div>

            <form onSubmit={handleRecordPayment} className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="pay-amount" className="text-sm font-medium">
                    Payment Amount (₹)
                  </label>
                  <Input
                    id="pay-amount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max={paymentInvoice.balanceDue}
                    step="0.01"
                    required
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                    placeholder="Enter amount"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="pay-date" className="text-sm font-medium">
                    Payment Date
                  </label>
                  <Input
                    id="pay-date"
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(event) => setPaymentDate(event.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="pay-method" className="text-sm font-medium">
                    Payment Method
                  </label>
                  <select
                    id="pay-method"
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs sm:text-sm"
                  >
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="pay-ref" className="text-sm font-medium">
                    Reference (Optional)
                  </label>
                  <Input
                    id="pay-ref"
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    placeholder="Transaction ID or reference"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentInvoice(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading === paymentInvoice.id}
                >
                  {actionLoading === paymentInvoice.id && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`border-border p-2.5 sm:p-3.5 ${className}`}>
      <p className="text-[10px] sm:text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-base font-semibold tracking-tight tabular-nums sm:text-lg">
        {value}
      </p>
    </div>
  );
}

type DetailProps = {
  invoice: Invoice;
  status: string;
  busyId: string;
  onClose?: () => void;
  onPdf: (invoice: Invoice) => void;
  onIssue: (invoice: Invoice) => void;
  onPay: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  canEdit: boolean;
 canDelete: boolean;
};

function InvoiceDetail({
  invoice,
  status,
  busyId,
  onClose,
  onPdf,
  onIssue,
  onPay,
  onEdit,
  onDelete,
  canEdit,
  canDelete
}: DetailProps) {
  const busy = busyId === invoice.id;
  const isDraft = status === "draft";
  const canPay = ["sent", "partially_paid", "overdue"].includes(status);
  const total = invoice.total ?? 0;
  const paid = invoice.amountPaid ?? 0;
  const balance = invoice.balanceDue ?? total - paid;
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5 border-b p-3 sm:p-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-base font-semibold uppercase text-background">
            {(invoice.customerName || "?").charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">
              {invoice.customerName || "Unknown customer"}
            </p>
            <p
              className="mt-0.5 truncate text-[11px] text-muted-foreground"
              title={invoice.invoiceNumber || invoice.id}
            >
              {invoice.invoiceNumber || invoice.id}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <InvoiceStatus status={status} />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Balance hero */}
      <div className="p-3 sm:p-3.5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {status === "paid" ? "Settled" : "Balance due"}
        </p>
        <p className="mt-1 text-xl font-bold tracking-tight tabular-nums sm:text-2xl">
          {formatINR(balance)}
        </p>

        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-foreground transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground tabular-nums">
          <span>Paid {formatINR(paid)}</span>
          <span>of {formatINR(total)}</span>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 border-y">
        <div className="border-r p-3 sm:p-3.5">
          <p className="text-[11px] text-muted-foreground">Issued</p>
          <p className="mt-1 text-sm font-medium">
            {formatDate(invoice.issueDate)}
          </p>
        </div>
        <div className="p-3 sm:p-3.5">
          <p className="text-[11px] text-muted-foreground">Due</p>
          <p
            className={`mt-1 text-sm font-medium ${
              status === "overdue" ? "text-red-600 dark:text-red-400" : ""
            }`}
          >
            {formatDate(invoice.dueDate)}
          </p>
        </div>
      </div>

      {/* Line items */}
      <div className="p-3 sm:p-3.5">
        <h3 className="text-[13px] font-semibold">Items</h3>

        {invoice.items && invoice.items.length > 0 ? (
          <ul className="mt-2.5 divide-y">
            {invoice.items.map((item, index) => (
              <li
                key={`${item.description}-${index}`}
                className="flex items-start justify-between gap-4 py-2 text-xs sm:text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.description}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {item.quantity} × {formatINR(item.unitPrice)}
                  </p>
                </div>
                <p className="shrink-0 font-medium tabular-nums">
                  {formatINR(item.lineTotal)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No line items on this invoice.
          </p>
        )}

        <dl className="mt-2 space-y-1 rounded-lg bg-muted/50 p-2.5 text-xs sm:text-sm tabular-nums">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatINR(invoice.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Tax{invoice.taxRate ? ` (${invoice.taxRate}%)` : ""}
            </dt>
            <dd>{formatINR(invoice.tax)}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 font-semibold">
            <dt>Total</dt>
            <dd>{formatINR(total)}</dd>
          </div>
        </dl>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5 border-t bg-muted/30 p-3">
        {isDraft && (
          <Button
            type="button"
            className="min-w-[120px] flex-1"
            disabled={busy}
            onClick={() => onIssue(invoice)}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Issue Invoice
          </Button>
        )}

        {canPay && (
          <Button
            type="button"
            className="min-w-[120px] flex-1"
            onClick={() => onPay(invoice)}
          >
            <Wallet className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        )}

        <Button type="button" variant="outline" onClick={() => onPdf(invoice)}>
          <Download className="mr-2 h-4 w-4" />
          PDF
        </Button>

        {isDraft && canEdit && (
  <Button
    type="button"
    variant="outline"
    onClick={() => onEdit(invoice)}
  >
    <Pencil className="mr-2 h-4 w-4" />
    Edit
  </Button>
)}

{isDraft && canDelete && (
  <Button
    type="button"
    variant="outline"
    className="text-red-600 hover:text-red-700 dark:text-red-400"
    disabled={busy}
    onClick={() => onDelete(invoice)}
  >
    <Trash2 className="mr-2 h-4 w-4" />
    Delete
  </Button>
)}
      </div>
    </div>
  );
}

function InvoiceStatus({
  status,
  small,
}: {
  status?: string;
  small?: boolean;
}) {
  const value = (status || "draft").toLowerCase();

  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    sent: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    paid: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    overdue: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    partially_paid:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  };

  const label =
    value === "sent"
      ? "Unpaid"
      : value === "partially_paid"
        ? "Partially Paid"
        : value.charAt(0).toUpperCase() + value.slice(1);

  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap rounded-full font-medium ${
        small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      } ${styles[value] ?? "bg-muted text-muted-foreground"}`}
    >
      {label}
    </span>
  );
}