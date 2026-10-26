"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Users,
  UserRound,
  Building2,
  Mail,
  Phone,
  Loader2,
  X,
  Pencil,
  Trash2,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import PageLoader from "@/components/common/PageLoader";
import Header from "@/components/layout/Header";
import { useRequireAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/lib/use-permissions";

type ContactType = "customer" | "vendor" | "both";

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
};

export default function ContactsPage() {
  const { loading: authLoading } = useRequireAuth();
const {loading: permissionsLoading,permissions,isAdmin,} = usePermissions();

const canView = isAdmin || permissions["contacts.view"];
const canCreate = isAdmin || permissions["contacts.create"];
const canEdit = isAdmin || permissions["contacts.edit"];
const canDelete = isAdmin || permissions["contacts.delete"];
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
const [deletingId, setDeletingId] = useState<string | null>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<ContactType>("customer");
function handleEdit(contact: Contact) {
  setEditingContact(contact);
  setName(contact.name);
  setEmail(contact.email);
  setPhone(contact.phone);
  setType(contact.type as ContactType);
  setError("");
  setSuccess("");
  setShowForm(true);
}
  const loadContacts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/contacts");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load contacts.");
      }

      setContacts(data.contacts ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load contacts."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      void loadContacts();
    }
  }, [authLoading, loadContacts]);

  const filteredContacts = contacts.filter((contact) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      contact.name.toLowerCase().includes(searchText) ||
      contact.email.toLowerCase().includes(searchText) ||
      contact.phone.toLowerCase().includes(searchText);

    const matchesFilter =
      filter === "all" ||
      contact.type.toLowerCase() === filter ||
      (filter !== "all" && contact.type.toLowerCase() === "both");

    return matchesSearch && matchesFilter;
  });

 
async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (phone && !/^[6-9]\d{9}$/.test(phone)) {
    setError("Enter a valid 10-digit Indian mobile number.");
    return;
  }

  setSaving(true);
  setError("");
  setSuccess("");

  try {
    const response = await fetch(
      editingContact
        ? `/api/contacts/${editingContact.id}`
        : "/api/contacts",
      {
        method: editingContact ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, type }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to save contact.");
    }

    if (editingContact) {
      const updatedContact = data.contact;

      setContacts((current) =>
        current
          .map((contact) =>
            contact.id === editingContact.id
              ? updatedContact
              : contact
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );

      setSuccess("Contact updated successfully.");
    } else {
      setContacts((current) =>
        [...current, data.contact].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );

      setSuccess("Contact added successfully.");
    }

    setName("");
    setEmail("");
    setPhone("");
    setType("customer");
    setEditingContact(null);
    setShowForm(false);
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Unable to save contact."
    );
  } finally {
    setSaving(false);
  }
}



async function handleDelete(contact: Contact) {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${contact.name}"?`
  );

  if (!confirmed) return;

  setDeletingId(contact.id);
  setError("");
  setSuccess("");

  try {
    const response = await fetch(
      `/api/contacts/${encodeURIComponent(contact.id)}`,
      { method: "DELETE" }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to delete contact.");
    }

    setContacts((current) =>
      current.filter((item) => item.id !== contact.id)
    );

    setSuccess("Contact deleted successfully.");
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Unable to delete contact."
    );
  } finally {
    setDeletingId(null);
  }
}



  const customerCount = contacts.filter(
    (contact) =>
      contact.type === "customer" || contact.type === "both"
  ).length;

  const vendorCount = contacts.filter(
    (contact) =>
      contact.type === "vendor" || contact.type === "both"
  ).length;

 if (authLoading || permissionsLoading) {
  return <PageLoader />;
}

  if (!canView) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <p className="text-sm text-muted-foreground">
        You do not have permission to view Contacts.
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
          <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {/* <h1 className="text-2xl font-semibold tracking-tight">
                Contacts
              </h1> */}
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your customers and vendors.
              </p>
            </div>

            {canCreate && (
  <Button
   onClick={() => {
  setEditingContact(null);
  setName("");
  setEmail("");
  setPhone("");
  setType("customer");
  setError("");
  setSuccess("");
  setShowForm(true);
}}
  >
    <Plus className="mr-2 h-4 w-4" />
    Add Contact
  </Button>
)}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-300"
            >
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              title="Total Contacts"
              value={contacts.length}
              icon={<Users className="h-5 w-5" />}
              // highlight
            />
            <SummaryCard
              title="Customers"
              value={customerCount}
              icon={<UserRound className="h-5 w-5" />}
            />
            <SummaryCard
              title="Vendors"
              value={vendorCount}
              icon={<Building2 className="h-5 w-5" />}
            />
          </div>

         {showForm && (editingContact ? canEdit : canCreate) && (
            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
  <div className="flex min-w-0 items-center gap-3">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
      <Users className="h-4 w-4" />
    </span>

    <div className="min-w-0">
      <h2 className="text-sm font-semibold">
        {editingContact ? "Edit Contact" : "Add Contact"}
      </h2>

      <p className="mt-0.5 text-xs text-muted-foreground">
        Enter the contact details below.
      </p>
    </div>
  </div>

  <Button
    type="button"
    variant="ghost"
    size="icon"
    className="h-8 w-8 shrink-0"
    onClick={() => setShowForm(false)}
    aria-label="Close form"
  >
    <X className="h-4 w-4" />
  </Button>
</div>

              <form onSubmit={handleSubmit} className="space-y-3 p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="contact-name" className="text-sm font-medium">
                      Contact Name *
                    </label>
                    <Input
                    className="h-9 text-sm"
                      id="contact-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Enter full name or business name"
                      maxLength={150}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="contact-type" className="text-sm font-medium">
                      Contact Type *
                    </label>
                    <select
                      id="contact-type"
                      value={type}
                      onChange={(event) =>
                        setType(event.target.value as ContactType)
                      }
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      required
                    >
                      <option value="customer">Customer</option>
                      <option value="vendor">Vendor</option>
                      <option value="both">Customer and Vendor</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="contact-email" className="text-sm font-medium">
                      Email
                    </label>
                    <Input
                    className="h-9 text-sm"
                      id="contact-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="contact@example.com"
                      maxLength={254}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="contact-phone" className="text-sm font-medium">
                      Phone
                    </label>
                    
<Input
className="h-9 text-sm"
  id="contact-phone"
  type="tel"
  inputMode="numeric"
  value={phone}
  onChange={(event) => {
    const digits = event.target.value
      .replace(/\D/g, "")
      .slice(0, 10);

    setPhone(digits);
  }}
  placeholder="10-digit mobile number"
  maxLength={10}
  pattern="[6-9][0-9]{9}"
  title="Enter a valid 10-digit Indian mobile number."
/>
<p className="text-xs text-muted-foreground">
  {phone.length}/10 digits
</p>

                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="submit" size="sm" className="h-9" disabled={saving}>
  {saving ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Saving...
    </>
  ) : editingContact ? (
    <>
      <Pencil className="mr-2 h-4 w-4" />
      Update Contact
    </>
  ) : (
    <>
      <Plus className="mr-2 h-4 w-4" />
      Save Contact
    </>
  )}
</Button>
                </div>
              </form>
            </section>
          )}

          <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Contact Directory</h2>
                <p className="text-sm text-muted-foreground">
                  {filteredContacts.length} contact
                  {filteredContacts.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[minmax(240px,1fr)_170px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search contacts by name ..."
                    className="h-10 w-full pl-9 sm:w-64"
                    aria-label="Search contacts"
                  />
                </div>

                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-[170px]"
                  aria-label="Filter contacts by type"
                >
                  <option value="all">All contacts</option>
                  <option value="customer">Customers</option>
                  <option value="vendor">Vendors</option>
                </select>
              </div>
            </div>

            {loading ? (
  <PageLoader />
) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-14 text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <Users className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="font-semibold">
                  {search || filter !== "all"
                    ? "No matching contacts"
                    : "No contacts yet"}
                </h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  {search || filter !== "all"
                    ? "Try changing your search or filter."
                    : "Add your first customer or vendor to get started."}
                </p>

                {!search && filter === "all" && canCreate && (
                  <Button
                    className="mt-4"
                    onClick={() => {
  setEditingContact(null);
  setName("");
  setEmail("");
  setPhone("");
  setType("customer");
  setError("");
  setSuccess("");
  setShowForm(true);
}}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contact
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Contact</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {filteredContacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">
                          {contact.name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {contact.email ? (
                            <span className="flex items-center gap-2">
                              <Mail className="h-4 w-4 shrink-0" />
                              {contact.email}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {contact.phone ? (
                            <span className="flex items-center gap-2">
                              <Phone className="h-4 w-4 shrink-0" />
                              {contact.phone}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <ContactBadge type={contact.type} />
                        </td>
<td className="px-4 py-3">
  <div className="flex justify-end gap-2">
    {canEdit && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleEdit(contact)}
      >
        <Pencil className="mr-1 h-4 w-4" />
        Edit
      </Button>
    )}

    {canDelete && (
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={deletingId === contact.id}
        onClick={() => handleDelete(contact)}
      >
        {deletingId === contact.id ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="mr-1 h-4 w-4" />
        )}
        Delete
      </Button>
    )}
  </div>
</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[125px] flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {title}
          </p>

          <p className="mt-3 break-words text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
            {value}
          </p>
        </div>

        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </span>
      </div>
    </div>
  );
}

function ContactBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    customer: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    vendor: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    both: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  };

  const label: Record<string, string> = {
    customer: "Customer",
    vendor: "Vendor",
    both: "Customer & Vendor",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[type] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {label[type] ?? type}
    </span>
  );
}