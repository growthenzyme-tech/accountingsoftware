
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Plus,
  Trash2,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useRequireAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/lib/use-permissions";

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
};

type JournalLine = {
  id: number;
  accountId: string;
  debit: string;
  credit: string;
};

type JournalEntry = {
  id: string;
  date: string;
  description: string;
  totalDebits: number;
  totalCredits: number;
  status: string;
};

const newLine = (id: number): JournalLine => ({
  id,
  accountId: "",
  debit: "",
  credit: "",
});

export default function LedgerPage() {
  const { user, loading: authLoading } = useRequireAuth();

  const {
    can,
    isAdmin,
    loading: permissionsLoading,
  } = usePermissions();

  const canViewLedger = isAdmin || can("ledger.view");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [date, setDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([
    newLine(1),
    
  ]);
  const [nextId, setNextId] = useState(2);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const totalDebits = lines.reduce(
    (sum, line) => sum + Math.round((Number(line.debit) || 0) * 100),
    0
  );

  const totalCredits = lines.reduce(
    (sum, line) => sum + Math.round((Number(line.credit) || 0) * 100),
    0
  );

  const balanced =
    totalDebits > 0 && totalDebits === totalCredits;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [accountsResponse, entriesResponse] = await Promise.all([
        fetch("/api/accounts", { cache: "no-store" }),
        fetch("/api/ledger", { cache: "no-store" }),
      ]);

      const accountsData = await accountsResponse.json();
      const entriesData = await entriesResponse.json();

      if (!accountsResponse.ok) {
        throw new Error(
          accountsData.error || "Unable to load accounts."
        );
      }

      if (!entriesResponse.ok) {
        throw new Error(
          entriesData.error || "Unable to load journal entries."
        );
      }

      setAccounts(
        (accountsData.accounts as Account[]).filter(
          (account) => account.isActive
        )
      );
      setEntries(entriesData.entries as JournalEntry[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load Ledger data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

useEffect(() => {
  if (
    !authLoading &&
    !permissionsLoading &&
    user &&
    canViewLedger
  ) {
    void loadData();
  }
}, [
  authLoading,
  permissionsLoading,
  user,
  canViewLedger,
  loadData,
]);


function updateLine(
  id: number,
  field: "accountId" | "debit" | "credit",
  value: string
) {
  setLines((previous) =>
    previous.map((line) => {
      if (line.id !== id) return line;

      if (field === "debit") {
        return {
          ...line,
          debit: value,
          credit: "",
        };
      }

      if (field === "credit") {
        return {
          ...line,
          credit: value,
          debit: "",
        };
      }

      return {
        ...line,
        accountId: value,
      };
    })
  );

  setError("");
  setMessage("");
}

  function addLine() {
    setLines((previous) => [...previous, newLine(nextId)]);
    setNextId((previous) => previous + 1);
  }

  function removeLine(id: number) {
    setLines((previous) => previous.filter((line) => line.id !== id));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!description.trim()) {
      setError("Enter a journal entry description.");
      return;
    }

    if (!date || lines.length < 2) {
      setError("Enter a date and at least two journal lines.");
      return;
    }

    const invalidLine = lines.some((line) => {
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;

      return (
        !line.accountId ||
        debit < 0 ||
        credit < 0 ||
        (debit > 0 && credit > 0) ||
        (debit === 0 && credit === 0)
      );
    });

    if (invalidLine) {
      setError(
        "Select an account and enter either a debit or a credit for each line."
      );
      return;
    }

    if (!balanced) {
      setError("Total debits must equal total credits.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          description: description.trim(),
          lines: lines.map((line) => ({
            accountId: line.accountId,
            debit: Number(line.debit) || 0,
            credit: Number(line.credit) || 0,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save journal entry.");
      }

      setMessage("Journal entry saved successfully.");
      setDescription("");
      setLines([newLine(nextId)]);
setNextId((previous) => previous + 1);

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save journal entry."
      );
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || permissionsLoading) {
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

if (!canViewLedger) {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold">Access Denied</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You do not have permission to view the General Ledger.
      </p>
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

        <div className="mx-auto w-full max-w-[1500px] space-y-4 p-3 sm:p-4 lg:p-4">
          <section className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {/* <BookOpen className="h-5 w-5 shrink-0 text-primary" /> */}
              <div className="min-w-0">
                {/* <h1 className="text-base font-semibold tracking-tight sm:text-lg">
                  General Ledger
                </h1> */}
               <p className="text-sm font-medium text-foreground sm:text-base">
                  Create and review double-entry journal entries.
                </p>
              </div>
            </div>

           <Button
  variant="outline"
  size="sm"
  className="h-8 w-full text-xs sm:w-auto"
  onClick={() => void loadData()}
  disabled={loading}
>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </section>

          {error && (
  <p
    role="alert"
    className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
  >
    {error}
  </p>
)}

          {message && (
            <p
              role="status"
              className="rounded-lg border border-emerald-600/30 p-3 text-sm text-emerald-700"
            >
              {message}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <h2 className="text-sm font-semibold">Journal Entry Details</h2>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
  <Label htmlFor="entry-date">Entry date</Label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="entry-date"
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      className="h-9 pl-9 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="entry-description">Description</Label>
                  <Input
                    id="entry-description"
                    className="h-9 text-sm"
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    placeholder="Describe the transaction"
                    maxLength={500}
                    required
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
               <h2 className="text-sm font-semibold">Journal Entry Lines</h2>
               <Button
  type="button"
  variant="outline"
  size="sm"
  className="h-8 text-xs"
  onClick={addLine}
>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Line
                </Button>
              </div>

              {accounts.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground">
                  No active accounts found. Add accounts in Chart of Accounts
                  before creating a journal entry.
                </p>
              )}

              <div className="space-y-4">
                {lines.map((line, index) => (
                  <div
                    key={line.id}
                  className="grid gap-3 rounded-lg border border-border bg-background p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor={`account-${line.id}`}>
                        Account {index + 1}
                      </Label>
                      <select
                        id={`account-${line.id}`}
                        value={line.accountId}
                        onChange={(event) =>
                          updateLine(line.id, "accountId", event.target.value)
                        }
                        required
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="">Select account</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} — {account.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`debit-${line.id}`}>Debit (₹)</Label>
                      <Input
                      className="h-9 text-sm"
                        id={`debit-${line.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.debit}
                        onChange={(event) =>
                          updateLine(line.id, "debit", event.target.value)
                        }
                        placeholder="0.00"
                      />
                    </div>

                   <div className="space-y-1.5">
                      <Label htmlFor={`credit-${line.id}`}>Credit (₹)</Label>
                      <Input
                        className="h-9 text-sm"
                        id={`credit-${line.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.credit}
                        onChange={(event) =>
                          updateLine(line.id, "credit", event.target.value)
                        }
                        placeholder="0.00"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove line ${index + 1}`}
                        disabled={lines.length <= 1}
                        onClick={() => removeLine(line.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-2 sm:p-4">
                <div>
                 <p className="text-xs text-muted-foreground">Total Debits</p>
                 <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums sm:text-xl">
                    ₹{(totalDebits / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Credits</p>
                 <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums sm:text-xl">
                    ₹{(totalCredits / 100).toFixed(2)}
                  </p>
                </div>
              </div>

              <p
                aria-live="polite"
                className={`text-sm font-medium ${
                  balanced ? "text-emerald-600" : "text-muted-foreground"
                }`}
              >
                {balanced
                  ? "Debits and credits are balanced."
                  : "Total debits must equal total credits."}
              </p>

            
<div className="flex justify-end">
  <Button
    size="sm"
  className="h-9 w-full text-xs sm:w-auto"
    type="submit"
    disabled={
      saving ||
      loading ||
      accounts.length === 0 ||
      lines.length < 2 ||
      !balanced
    }
  >
    {saving ? "Saving..." : "Save Journal Entry"}
  </Button>
</div>

            </section>
          </form>

          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border p-3 sm:p-4">
              <h2 className="text-sm font-semibold">Recent Journal Entries</h2>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                Saved entries from your accounting records.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Debits</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Credits</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        Loading journal entries...
                      </td>
                    </tr>
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No journal entries yet.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-muted/30">
                        <td className="whitespace-nowrap px-4 py-3">
                          {entry.date}
                        </td>
                        <td className="min-w-48 px-4 py-3">
                          {entry.description}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          ₹{Number(entry.totalDebits).toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          ₹{Number(entry.totalCredits).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 capitalize">
                          {entry.status}
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
    </div>
  );
}
