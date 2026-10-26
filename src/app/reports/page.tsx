
"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Wallet,
  RefreshCw,
  FileText,
  ChevronDown,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import {
  getReportingDateRange,
  type ReportingPeriod,
} from "@/lib/reporting-period";



type ReportLine = {
  accountId: string;
  accountName: string;
  amount: number;
};

type ProfitLossData = {
  revenue: number;
  expenses: number;
  netProfit: number;
  incomeAccounts: ReportLine[];
  expenseAccounts: ReportLine[];
};



const money = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

export default function ReportsPage() {
  const [period, setPeriod] =
    useState<ReportingPeriod>("this-month");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [report, setReport] =
    useState<ProfitLossData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const dateRange = getReportingDateRange(
    period,
    startDate,
    endDate
  );
  
const invalidDateRange =
  period === "custom" &&
  startDate !== "" &&
  endDate !== "" &&
  startDate > endDate;


useEffect(() => {
  if (!dateRange) {
    setReport(null);
    setLoading(false);
    return;
  }

  const controller = new AbortController();

  async function loadReport() {
    setLoading(true);
    setError("");

    try {
    
if (!dateRange) return;

const response = await fetch(
  `/api/reports/profit-loss?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
  { signal: controller.signal }
);


      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load report.");
      }

      setReport(data);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;

      setReport(null);
      setError(
        err instanceof Error ? err.message : "Failed to load report."
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  loadReport();
  return () => controller.abort();
}, [dateRange?.startDate, dateRange?.endDate]);

  return (
   <div className="min-h-screen bg-background text-foreground">
  <div className="hidden md:block">
    <Sidebar />
  </div>

  <main className="min-w-0 flex-1 md:ml-64">
        <Header />

        <div className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-6">
          <section className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              {/* <h1 className="text-xl font-semibold tracking-tight sm:text-[22px]">
                Financial Reports
              </h1> */}
             <p className="mt-6 text-sm font-medium text-foreground sm:text-base">
                Review your business performance and profitability.
              </p>
            </div>

            


<div className="grid w-full grid-cols-1 gap-2 xl:w-[220px] xl:shrink-0">
  <div className="space-y-0.5">
    <label
      htmlFor="report-period"
      className="text-xs leading-tight text-muted-foreground"
    >
      Reporting period
    </label>

    <div className="relative">
      <select
        id="report-period"
        value={period}
        onChange={(event) =>
          setPeriod(event.target.value as ReportingPeriod)
        }
        className="h-9 w-full min-w-[150px] appearance-none rounded-md border border-border bg-background py-1.5 pl-3 pr-8 text-xs text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring"
      >
        <option value="this-month">This Month</option>
        <option value="last-month">Last Month</option>
        <option value="this-year">This Year</option>
        <option value="custom">Custom Range</option>
      </select>

      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  </div>

  {period === "custom" && (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
      <div className="space-y-0.5">
        <label
          htmlFor="start-date"
          className="text-[12px] text-muted-foreground leading-tight"
        >
          Start date
        </label>

        <input
          id="start-date"
          type="date"
          value={startDate}
          max={endDate || undefined}
          onChange={(event) => setStartDate(event.target.value)}
          aria-invalid={invalidDateRange}
          className="h-9 w-full min-w-0 rounded-md border border-border bg-background px-2.5 text-xs outline-none transition-shadow focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-0.5">
        <label
          htmlFor="end-date"
          className="text-[12px] text-muted-foreground leading-tight"
        >
          End date
        </label>

        <input
          id="end-date"
          type="date"
          value={endDate}
          min={startDate || undefined}
          onChange={(event) => setEndDate(event.target.value)}
          aria-invalid={invalidDateRange}
          className="h-9 w-full min-w-0 rounded-md border border-border bg-background px-2.5 text-xs outline-none transition-shadow focus:ring-2 focus:ring-ring"
        />

        {invalidDateRange && (
          <p
            className="text-[12px] text-destructive leading-tight"
            role="alert"
          >
            End date must be on or after the start date.
          </p>
        )}
      </div>
    </div>
  )}

  <p
    className="text-left text-[11px] text-muted-foreground leading-tight xl:text-right"
    aria-live="polite"
  >
    {invalidDateRange
      ? "End date must be on or after the start date."
      : !dateRange
        ? period === "custom"
          ? "Select both dates to continue."
          : "Select a valid reporting period."
        : `Showing ${dateRange.startDate} to ${dateRange.endDate}`}
  </p>
</div>



          </section>

         <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              title="Total Revenue"
              amount={report?.revenue ?? 0}
              icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
              description="Income recorded in the selected period"
              loading={loading}
            />

            <SummaryCard
              title="Total Expenses"
              amount={report?.expenses ?? 0}
              icon={<TrendingDown className="h-4 w-4 text-rose-600" />}
              description="Expenses recorded in the selected period"
              loading={loading}
            />

            <SummaryCard
              title="Net Profit"
              amount={report?.netProfit ?? 0}
              icon={<Wallet className="h-4 w-4 text-blue-600" />}
              description="Revenue minus expenses"
              loading={loading}
            />
          </section>

{error && (
  <div
    role="alert"
    className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
  >
    <p className="font-semibold text-red-700 dark:text-red-400">
      Unable to load the report
    </p>

    <p className="mt-1 text-red-700 dark:text-red-400">
      {error}
    </p>

    <button
      onClick={() => setPeriod((current) => current)}
      className="mt-3 inline-flex items-center gap-2 font-medium text-red-700 underline hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
    >
      <RefreshCw className="h-4 w-4" />
      Try again
    </button>
  </div>
)}

          <section className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
               <h2 className="text-base font-semibold">
                  Profit &amp; Loss Statement
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
               Income and expenses for{" "}
{dateRange
  ? `${dateRange.startDate} to ${dateRange.endDate}`
  : "the selected period"}
              </p>
            </div>

            {loading ? (
              <p className="p-6 text-sm text-muted-foreground">
                Loading financial report...
              </p>
            ) : error ? (
              <p className="p-6 text-sm text-muted-foreground">
                The statement will appear when the report data loads.
              </p>
            ) : (
              <div className="p-4 sm:p-5">
                <ReportSection
                  title="Revenue"
                  lines={report?.incomeAccounts ?? []}
                  total={report?.revenue ?? 0}
                />

                <div className="my-5 border-t border-border" />

                <ReportSection
                  title="Expenses"
                  lines={report?.expenseAccounts ?? []}
                  total={report?.expenses ?? 0}
                />

                <div className="mt-5 flex items-center justify-between rounded-lg bg-muted/50 p-3 sm:p-4">
                  <span className="text-sm font-semibold">Net Profit</span>
                  <span
                    className={`text-base font-semibold tabular-nums sm:text-lg ${
                      (report?.netProfit ?? 0) < 0
                        ? "text-rose-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {money(report?.netProfit ?? 0)}
                  </span>
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                  Based on posted accounting transactions for the selected period.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  title,
  amount,
  icon,
  description,
  loading,
}: {
  title: string;
  amount: number;
  icon: React.ReactNode;
  description: string;
  loading: boolean;
}) {
  return (
    <article className="flex min-h-[125px] flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{title}</p>
        {icon}
      </div>

     <p className="mt-3 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
        {loading ? "Loading..." : money(amount)}
      </p>

      <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>
    </article>
  );
}

function ReportSection({
  title,
  lines,
  total,
}: {
  title: string;
  lines: ReportLine[];
  total: number;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="font-semibold">{money(total)}</span>
      </div>

      {lines.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">
          No accounts with activity in this period.
        </p>
      ) : (
        <div className="space-y-3">
          {lines.map((line) => (
            <div
              key={line.accountId}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <span className="text-muted-foreground">
                {line.accountName}
              </span>
              <span className="font-medium">{money(line.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
