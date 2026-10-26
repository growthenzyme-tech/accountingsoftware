
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Download,
  Wallet,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useRequireAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/lib/use-permissions";
import PageLoader from "@/components/common/PageLoader";

type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense";

interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  isActive: boolean;
}

const accountTypes: AccountType[] = [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
];

const emptyForm = {
  code: "",
  name: "",
  type: "asset" as AccountType,
};

export default function AccountsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const {
  loading: permissionsLoading,
  permissions,
  isAdmin,
} = usePermissions();

const canView = isAdmin || permissions["accounts.view"];
const canCreate = isAdmin || permissions["accounts.create"];
const canEdit = isAdmin || permissions["accounts.edit"];
const canDelete = isAdmin || permissions["accounts.delete"];

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
 
const [form, setForm] = useState(emptyForm);
const [editingId, setEditingId] = useState<string | null>(null);
const [deletingId, setDeletingId] = useState<string | null>(null);
const [error, setError] = useState("");
const [message, setMessage] = useState("");


  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/accounts", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load accounts.");
      }

      setAccounts(data.accounts);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load accounts."
      );
    } finally {
      setLoading(false);
    }
  }, []);

useEffect(() => {
  if (!authLoading && !permissionsLoading && user && canView) {
    void loadAccounts();
  }
}, [
  authLoading,
  permissionsLoading,
  user,
  canView,
  loadAccounts,
]);

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      account.name.toLowerCase().includes(search.toLowerCase()) ||
      account.code.toLowerCase().includes(search.toLowerCase());

    const matchesType = filter === "all" || account.type === filter;

    return matchesSearch && matchesType;
  });

  async function handleAddAccount(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setMessage("");

    const code = form.code.trim();
    const name = form.name.trim();

    if (!code || !name) {
      setError("Account code and account name are required.");
      return;
    }

    if (accounts.some((account) => account.code === code)) {
      setError("An account with this code already exists.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          type: form.type,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to create account.");
      }

      setAccounts((previous) => [...previous, data.account]);
      setForm(emptyForm);
      setShowForm(false);
      setMessage("Account created successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create account."
      );
    } finally {
      setSaving(false);
    }
  }


function exportAccounts() {
  const headers = ["Account Code", "Account Name", "Type", "Status"];

  const rows = filteredAccounts.map((account) => [
    account.code,
    account.name,
    account.type,
    account.isActive ? "Active" : "Inactive",
  ]);

  const escapeCsv = (value: string) =>
    `"${value.replace(/"/g, '""')}"`;

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");

  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    })
  );

  const link = document.createElement("a");
  link.href = url;
  link.download = "chart-of-accounts.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function handleEditAccount(account: Account) {
  setEditingId(account.id);
  setForm({
    code: account.code,
    name: account.name,
    type: account.type,
  });
  setError("");
  setMessage("");
  setShowForm(true);
}

async function handleSaveAccount(
  event: React.FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  if (!editingId) return;

  const code = form.code.trim();
  const name = form.name.trim();

  if (!code || !name) {
    setError("Account code and account name are required.");
    return;
  }

  setSaving(true);
  setError("");
  setMessage("");

  try {
    const response = await fetch(`/api/accounts/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        name,
        type: form.type,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to update account.");
    }

    setAccounts((previous) =>
      previous.map((account) =>
        account.id === editingId ? data.account : account
      )
    );

    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setMessage("Account updated successfully.");
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Unable to update account."
    );
  } finally {
    setSaving(false);
  }
}

async function handleDeleteAccount(account: Account) {
  const confirmed = window.confirm(
    `Delete or deactivate "${account.name}" (${account.code})?`
  );

  if (!confirmed) return;

  setDeletingId(account.id);
  setError("");
  setMessage("");

  try {
    const response = await fetch(`/api/accounts/${account.id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to delete account.");
    }

    if (data.isActive === false) {
      setAccounts((previous) =>
        previous.map((item) =>
          item.id === account.id
            ? { ...item, isActive: false }
            : item
        )
      );
    } else {
      setAccounts((previous) =>
        previous.filter((item) => item.id !== account.id)
      );
    }

    setMessage(data.message || "Account updated successfully.");
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Unable to delete account."
    );
  } finally {
    setDeletingId(null);
  }
}

if (authLoading || permissionsLoading) {
  return <PageLoader />;
}

if (!canView) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <p className="text-sm text-muted-foreground">
        You do not have permission to view Chart of Accounts.
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
              <Wallet className="h-5 w-5 text-primary" />
              <div>
                {/* <h1 className="text-base font-semibold tracking-tight sm:text-lg">
                  Chart of Accounts
                </h1> */}
                <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                  Manage your general ledger accounts.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={exportAccounts}
                disabled={filteredAccounts.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>

             {canCreate && (
  <Button
    onClick={() => {
      setError("");
      setMessage("");
      setEditingId(null);
      setForm(emptyForm);
      setShowForm((value) => !value);
    }}
  >
    <Plus className="mr-2 h-4 w-4" />
    Add Account
  </Button>
)}
            </div>
          </section>

          {error && (
            <p role="alert" className="rounded-lg border border-red-500/40 bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </p>
          )}

          {message && (
            <p role="status" className="rounded-lg border border-emerald-600/30 p-3 text-sm text-emerald-700">
              {message}
            </p>
          )}

          {showForm && (editingId ? canEdit : canCreate) && (
            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <h2 className="border-b px-4 py-3.5 text-sm font-semibold sm:px-5">
  {editingId ? "Edit Account" : "Add Account"}
</h2>

              <form
                onSubmit={editingId ? handleSaveAccount : handleAddAccount}
               className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="account-code">Account code</Label>
                  <Input
                    id="account-code"
                    value={form.code}
                    onChange={(event) =>
                      setForm({ ...form, code: event.target.value })
                    }
                    placeholder="e.g. 1001"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account-name">Account name</Label>
                  <Input
                    id="account-name"
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    placeholder="e.g. Bank Account"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account-type">Account type</Label>
                  <select
                    id="account-type"
                    value={form.type}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        type: event.target.value as AccountType,
                      })
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {accountTypes.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end gap-2">
                 <Button type="submit" disabled={saving}>
  {saving
    ? "Saving..."
    : editingId
      ? "Update Account"
      : "Save Account"}
</Button>
                  <Button
                    type="button"
                    variant="outline"
onClick={() => {
  setShowForm(false);
  setEditingId(null);
  setForm(emptyForm);
}}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </section>
          )}

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-5">
            {accountTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilter(filter === type ? "all" : type)}
               className={`flex min-h-[110px] flex-col rounded-xl border p-4 text-left shadow-sm transition-colors ${
  filter === type
    ? "border-primary bg-primary/5"
    : "border-border bg-card hover:bg-accent"
}`}
              >
                <p className="text-xs capitalize text-muted-foreground">
                  {type}
                </p>
                <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
                  {accounts.filter((account) => account.type === type).length}
                </p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Accounts
                </p>
              </button>
            ))}
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div>
                <h2 className="font-semibold">All Accounts</h2>
                <p className="text-sm text-muted-foreground">
                  {filteredAccounts.length} account(s)
                </p>
              </div>

              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Search accounts"
                    placeholder="Search code or name"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-9 w-full pl-9 text-sm"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Refresh accounts"
                  onClick={() => void loadAccounts()}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
             <table className="w-full min-w-[700px] text-sm">
                
<thead className="border-b bg-muted/40">
  <tr className="text-left text-xs font-semibold text-muted-foreground">
    <th className="px-4 py-3 font-medium">Code</th>
    <th className="px-4 py-3 font-medium">Account name</th>
    <th className="px-4 py-3 font-medium">Type</th>
    <th className="px-4 py-3 font-medium">Status</th>
    <th className="px-4 py-3 font-medium text-right">Actions</th>
  </tr>
</thead>

                <tbody className="divide-y divide-border">
               {loading ? (
  <tr>
    <td colSpan={5} className="p-0">
      <PageLoader />
    </td>
  </tr>
) : filteredAccounts.length === 0 ? (
                    <tr>
                     <td
  colSpan={5}
  className="px-4 py-10 text-center text-muted-foreground"
>
  {canCreate
    ? "No accounts found. Add an account to get started."
    : "No accounts found."}
</td>
                    </tr>
                  ) : (
                    filteredAccounts.map((account) => (
                      <tr key={account.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono">{account.code}</td>
                        <td className="px-4 py-3 font-medium">{account.name}</td>
                        <td className="px-4 py-3 capitalize">{account.type}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            account.isActive
                              ? "bg-emerald-500/10 text-emerald-700"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {account.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        
<td className="px-4 py-3">
  <div className="flex justify-end gap-2">
    {canEdit && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleEditAccount(account)}
        aria-label={`Edit ${account.name}`}
      >
        <Pencil className="mr-1 h-4 w-4" />
        Edit
      </Button>
    )}

    {canDelete && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleDeleteAccount(account)}
        disabled={deletingId === account.id}
        aria-label={`Delete ${account.name}`}
      >
        <Trash2 className="mr-1 h-4 w-4" />
        {deletingId === account.id ? "Deleting..." : "Delete"}
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
    </div>
  );
}
