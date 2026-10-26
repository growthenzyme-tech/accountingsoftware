"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { usePermissions } from "@/lib/use-permissions";
import { useAuth } from "@/lib/auth-context";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import CashFlowChart from "@/components/dashboard/CashFlowChart";
import {
  getReportingDateRange,
  type ReportingPeriod,
} from "@/lib/reporting-period";


type DashboardStats = {
  revenue: number;
  expenses: number;
  netProfit: number;
  outstandingInvoices: number;
};

const initialStats: DashboardStats = {
  revenue: 0,
  expenses: 0,
  netProfit: 0,
  outstandingInvoices: 0,
};

const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

type RecentItem = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  status: string;
};


type DashboardInvoice = {
  id: string;
  invoiceNumber?: string;
  customerName?: string;
  issueDate?: string;
  total?: number;
  status?: string;
};

type DashboardEntry = {
  id: string;
  description?: string;
  date?: string;
  createdAt?: string;
  status?: string;
  lines?: {
    accountId: string;
    debit: number;
    credit: number;
  }[];
};

type DashboardAccount = {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
};

type CashFlowPoint = {
  month: string;
  received: number;
  paid: number;
};



export default function DashboardPage() {
  const {
  can,
  isAdmin,
  loading: permissionsLoading,
} = usePermissions();
const { signOut, error: authError } = useAuth();
const [signingOut, setSigningOut] = useState(false);

const canViewDashboard =
  isAdmin || can("dashboard.view");
  const [reportingPeriod, setReportingPeriod] =
    useState<ReportingPeriod>("this-month");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const dateRange = getReportingDateRange(
    reportingPeriod,
    startDate,
    endDate
  );

  
const [financialStats, setFinancialStats] =
  useState<DashboardStats>(initialStats);
const [recentActivity, setRecentActivity] =
  useState<RecentItem[]>([]);
const [dataLoading, setDataLoading] = useState(true);
const [dataError, setDataError] = useState("");

const [cashFlowData, setCashFlowData] =
  useState<
    { month: string; received: number; paid: number }[]
  >([]);


  const invalidDateRange =
    reportingPeriod === "custom" &&
    startDate !== "" &&
    endDate !== "" &&
    startDate > endDate;

    

useEffect(() => {
  if (permissionsLoading) return;

  if (!canViewDashboard) {
    setDataLoading(false);
    setDataError("");
    return;
  }

  if (!dateRange || invalidDateRange) {
  setDataLoading(false);
  return;
}

let cancelled = false;

async function loadDashboard() {
    setDataLoading(true);
    setDataError("");

    try {
      const params = new URLSearchParams({
        startDate: dateRange!.startDate,
        endDate: dateRange!.endDate,
      });

      const [reportResponse, invoiceResponse, ledgerResponse] =
        await Promise.all([
          fetch(`/api/reports/profit-loss?${params}`),
          fetch("/api/invoices"),
          fetch("/api/ledger"),
        ]);

      const [report, invoiceData, ledgerData] = await Promise.all([
        reportResponse.json(),
        invoiceResponse.json(),
        ledgerResponse.json(),
      ]);

      if (!reportResponse.ok) {
        throw new Error(
          report.error || "Unable to load financial reports."
        );
      }

      if (!invoiceResponse.ok) {
        throw new Error(
          invoiceData.error || "Unable to load invoices."
        );
      }

      if (!ledgerResponse.ok) {
        throw new Error(
          ledgerData.error || "Unable to load journal entries."
        );
      }

     
const invoices: DashboardInvoice[] = Array.isArray(
  invoiceData.invoices
)
  ? (invoiceData.invoices as DashboardInvoice[])
  : [];

const entries: DashboardEntry[] = Array.isArray(
  ledgerData.entries
)
  ? (ledgerData.entries as DashboardEntry[])
  : [];


  console.log("Ledger data:", ledgerData);

//   console.log(
//   "Dashboard journal entries:",
//   JSON.stringify(entries, null, 2)
// );

const accountsResponse = await fetch("/api/accounts", {
  cache: "no-store",
});

const accountsData = await accountsResponse.json();

if (!accountsResponse.ok) {
  throw new Error(
    accountsData.error || "Unable to load accounts."
  );
}

const accounts: DashboardAccount[] = Array.isArray(
  accountsData.accounts
)
  ? accountsData.accounts
  : [];

  

const cashAccounts = accounts.filter(
  (account) =>
    account.isActive &&
    account.type.toLowerCase() === "asset"
);


console.log("Cash accounts:", cashAccounts);

const monthlyCashFlow = new Map<
  string,
  { month: string; received: number; paid: number }
>();

const start = new Date(`${dateRange!.startDate}T00:00:00`);
const end = new Date(`${dateRange!.endDate}T00:00:00`);

const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);

while (cursor <= lastMonth) {
  const key = `${cursor.getFullYear()}-${String(
    cursor.getMonth() + 1
  ).padStart(2, "0")}`;

  monthlyCashFlow.set(key, {
    month: cursor.toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    }),
    received: 0,
    paid: 0,
  });

  cursor.setMonth(cursor.getMonth() + 1);
}


for (const entry of entries) {

  console.log("Checking entry:", {
  description: entry.description,
  status: entry.status,
  date: entry.date,
  lines: entry.lines,
});
  if (entry.status !== "posted" || !entry.date) continue;

  if (
    entry.date < dateRange!.startDate ||
    entry.date > dateRange!.endDate
  ) {
    continue;
  }

  const monthKey = entry.date.slice(0, 7);
  const point = monthlyCashFlow.get(monthKey);
  if (!point) continue;

  for (const line of entry.lines ?? []) {
    if (!cashAccounts.some((account) => account.id === line.accountId)) {
      continue;
    }

    point.received += Math.max(0, Number(line.debit) || 0);
    point.paid += Math.max(0, Number(line.credit) || 0);
  }
}

const calculatedCashFlow = Array.from(monthlyCashFlow.values());



      const outstandingInvoices = invoices
        .filter((invoice) => {
          const status = String(invoice.status ?? "draft").toLowerCase();
          return status !== "draft" && status !== "paid";
        })
        .reduce(
          (sum, invoice) => sum + Math.max(0, Number(invoice.total) || 0),
          0
        );

      const recentInvoices: RecentItem[] = invoices.map((invoice) => ({
        id: `invoice-${invoice.id}`,
        title: invoice.invoiceNumber || "Invoice",
        subtitle: invoice.customerName || "Customer",
        date: invoice.issueDate || "",
        status: String(invoice.status || "draft"),
      }));

      const recentEntries: RecentItem[] = entries
        .filter((entry) => entry.status === "posted")
        .map((entry) => ({
          id: `entry-${entry.id}`,
          title: entry.description || "Journal entry",
          subtitle: "Journal entry",
          date: entry.date || entry.createdAt || "",
          status: String(entry.status || "posted"),
        }));

      const activity = [...recentInvoices, ...recentEntries]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);

      if (!cancelled) {
        setFinancialStats({
          revenue: Number(report.revenue) || 0,
          expenses: Number(report.expenses) || 0,
          netProfit: Number(report.netProfit) || 0,
          outstandingInvoices,
        });

        
setRecentActivity(activity);
setCashFlowData(calculatedCashFlow);

      }
    } catch (error) {
      if (!cancelled) {
        setDataError(
          error instanceof Error
            ? error.message
            : "Unable to load dashboard data."
        );
      }
    } finally {
      if (!cancelled) {
        setDataLoading(false);
      }
    }
  }

  void loadDashboard();

  return () => {
    cancelled = true;
  };
}, [
  dateRange?.startDate,
  dateRange?.endDate,
  invalidDateRange,
  permissionsLoading,
  canViewDashboard,
]);

if (permissionsLoading) {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}


if (!canViewDashboard) {
  
const handleBackToLogin = async () => {
  setSigningOut(true);

  try {
    await signOut();
  } finally {
    setSigningOut(false);
  }
};


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">
          Access Denied
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to view the Dashboard.
        </p>

        {authError && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {authError}
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleBackToLogin()}
          disabled={signingOut}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
        >
          {signingOut ? "Signing out…" : "Back to Login"}
        </button>
      </div>
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

        <div className="space-y-8 p-5 sm:p-8">
          {/* Financial Overview */}
          <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Financial Overview
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Monitor your business finances in one place.
              </p>
            </div>

            <div className="flex flex-wrap items-end justify-start gap-3 sm:justify-end">
              {/* Reporting Period */}
              <div className="space-y-1">
                <label
                  htmlFor="reporting-period"
                  className="text-sm text-muted-foreground"
                >
                  Reporting period
                </label>

                <div className="relative">
                  <select
                    id="reporting-period"
                    value={reportingPeriod}
                    onChange={(event) =>
                      setReportingPeriod(
                        event.target.value as ReportingPeriod
                      )
                    }
                    className="h-10 w-full appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-9 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="this-month">This Month</option>
                    <option value="last-month">Last Month</option>
                    <option value="this-year">This Year</option>
                    <option value="custom">Custom Range</option>
                  </select>

                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  />
                </div>
              </div>

              {/* Custom Date Range */}
              {reportingPeriod === "custom" && (
                <>
                  <div className="space-y-1">
                    <label
                      htmlFor="start-date"
                      className="text-sm text-muted-foreground"
                    >
                      Start date
                    </label>

                    <input
                      id="start-date"
                      type="date"
                      value={startDate}
                      max={endDate || undefined}
                      onChange={(event) =>
                        setStartDate(event.target.value)
                      }
                      aria-invalid={invalidDateRange}
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="end-date"
                      className="text-sm text-muted-foreground"
                    >
                      End date
                    </label>

                    <input
                      id="end-date"
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(event) =>
                        setEndDate(event.target.value)
                      }
                      aria-invalid={invalidDateRange}
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />

                    {invalidDateRange && (
                      <p
                        className="text-sm text-destructive text-red-600"
                        role="alert"
                      >
                        End date must be on or after the start date.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Selected Date Range */}
           
            <p
              className="w-full text-right text-xs text-muted-foreground"
              aria-live="polite"
            >
              {invalidDateRange
                ? "End date must be on or after the start date."
                : !dateRange
                  ? reportingPeriod === "custom"
                    ? "Select both dates to continue."
                    : "Select a valid reporting period."
                  : `Showing ${dateRange.startDate} to ${dateRange.endDate}`}
            </p>

            </div>
          </section>

          {/* Financial Statistics */}
          
<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
  {[
    {
      title: "Total Revenue",
      value: financialStats.revenue,
      note: "Selected reporting period",
      icon: TrendingUp,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Total Expenses",
      value: financialStats.expenses,
      note: "Selected reporting period",
      icon: TrendingDown,
      color: "text-rose-600 dark:text-rose-400",
    },
    {
      title: "Net Profit",
      value: financialStats.netProfit,
      note: "Based on posted transactions",
      icon: Wallet,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Outstanding Invoices",
      value: financialStats.outstandingInvoices,
      note: "Non-draft, unpaid invoices",
      icon: FileText,
      color: "text-amber-600 dark:text-amber-400",
    },
  ].map((stat) => {
    const Icon = stat.icon;

    return (
      <article
        key={stat.title}
        className="rounded-xl border border-border bg-card p-5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {stat.title}
          </p>
          <Icon className={`h-5 w-5 ${stat.color}`} />
        </div>

        <p className="mt-4 text-2xl font-bold tracking-tight">
          {dataLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            money(stat.value)
          )}
        </p>

        <p className="mt-2 text-xs text-muted-foreground">
          {stat.note}
        </p>
      </article>
    );
  })}
</section>


          {/* Cash Flow and Recent Activity */}
          <section className="grid gap-6 xl:grid-cols-3">
            <article className="rounded-xl border border-border bg-card p-5 sm:p-6 xl:col-span-2">
              <div>
                <h2 className="text-lg font-semibold">
                  Cash Flow
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Cash received versus cash paid
                </p>

                <div className="mt-6">
                  <CashFlowChart data={cashFlowData} />

                  <p className="mt-3 text-xs text-muted-foreground">
                    Illustrative sample data — not actual business cash flow.
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <h2 className="text-lg font-semibold">
                Recent Activity
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Your latest financial records
              </p>

              
<div className="mt-6 space-y-4">
  {dataError && (
    <p role="alert" className="text-sm text-red-600">
      {dataError}
    </p>
  )}

  {dataLoading ? (
    <div className="flex justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  ) : recentActivity.length === 0 ? (
    <div className="flex min-h-40 flex-col items-center justify-center text-center">
      <FileText className="mb-3 h-8 w-8 text-muted-foreground" />
      <p className="font-medium">No activity to display</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Recent invoices and posted transactions will appear here.
      </p>
    </div>
  ) : (
    recentActivity.map((item) => (
      <div
        key={item.id}
        className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {item.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.subtitle}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.date || "Date unavailable"}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs capitalize">
          {item.status}
        </span>
      </div>
    ))
  )}
</div>

            </article>
          </section>

          {/* Quick Actions */}
          <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-lg font-semibold">
              Quick Actions
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Common accounting tasks
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="/invoices"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Create Invoice
                <ArrowUpRight className="h-4 w-4" />
              </a>

              <a
                href="/contacts"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent"
              >
                Add Contact
                <ArrowDownRight className="h-4 w-4" />
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}