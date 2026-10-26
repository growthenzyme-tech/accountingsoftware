
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  BookOpen,
  ChartNoAxesCombined,
  Settings,
  Wallet,
  LogOut,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { usePermissions } from "@/lib/use-permissions";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Accounts", href: "/accounts", icon: Wallet },
  { label: "Ledger", href: "/ledger", icon: BookOpen },
  { label: "Reports", href: "/reports", icon: ChartNoAxesCombined },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const { isAdmin } = usePermissions();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card">
      {/* Brand */}
      <Link
        href="/dashboard"
        className="flex h-[76px] shrink-0 items-center gap-3 border-b border-border px-5"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Wallet className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight">
            LedgerFlow
          </h1>
          <p className="text-xs text-muted-foreground">
            Accounting Suite
          </p>
        </div>
      </Link>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-6">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>

        <nav className="flex flex-col gap-1">
          {navigation.map((item) => {
            const Icon = item.icon;

            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Signed-in user */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="mb-2 rounded-lg bg-muted/50 p-3">
          <p className="truncate text-sm font-semibold">
            {user?.email ?? "Signed-in user"}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {isAdmin ? "Business administrator" : "Team member"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
        >
          <LogOut className="h-[18px] w-[18px]" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
