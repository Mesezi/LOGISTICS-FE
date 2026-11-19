'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Users, Bike, Trash2, LoaderCircle, Handshake } from 'lucide-react';
import { clientsApi, partnersApi, ridersApi, type Client, type Partner } from '@/lib/api';
import { fmtDate } from '@/lib/utils';
import { Pagination } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmModal, Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export default function DirectoryPage() {
  const [tab, setTab] = useState<'clients' | 'riders' | 'partners'>('clients');

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
      <div>
        <p className="mb-1 text-sm font-semibold uppercase tracking-[.14em] text-brand">BluSync / Network</p>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Directory</h1>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 w-fit rounded-lg border not-focus:border-border bg-card p-0.5">
        {(['clients', 'riders', 'partners'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
              tab === t
                ? 'bg-brand text-white shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t === 'clients'
              ? <Users size={15} strokeWidth={1.75} />
              : t === 'riders'
              ? <Bike size={15} strokeWidth={1.75} />
              : <Handshake size={15} strokeWidth={1.75} />}
            {t}
          </button>
        ))}
      </div>

      {tab === 'clients' ? <ClientsTab /> : tab === 'riders' ? <RidersTab /> : <PartnersTab />}
    </div>
  );
}

/* ── Clients ──────────────────────────────────────────────────────────────── */
function ClientsTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(false);
  const [editClient, setEditClient] = useState<{
    id?: number; name: string; phone: string; notes: string;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', { query, page }],
    queryFn: () => clientsApi.list({ query: query || undefined, page, limit: 20 }),
  });

  const saveMutation = useMutation({
    mutationFn: (d: { id?: number; name: string; phone: string; notes: string }) =>
      d.id
        ? clientsApi.update(d.id, { name: d.name, phone: d.phone, notes: d.notes })
        : clientsApi.create({ name: d.name, phone: d.phone, notes: d.notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setModal(false); },
  });

  function openNew()      { setEditClient({ name: '', phone: '', notes: '' }); setModal(true); }
  function openEdit(c: Client) { setEditClient({ id: c.id, name: c.name, phone: c.phone ?? '', notes: c.notes ?? '' }); setModal(true); }

  return (
    <>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-grey" />
          <input
            placeholder="Search clients…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="w-full rounded-[10px] border not-focus:border-border bg-card py-2.5 pl-9 pr-4 text-sm text-ink placeholder:text-ink-grey outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors"
          />
        </div>
        <Button size="sm" icon={<Plus size={16} strokeWidth={1.75} />} onClick={openNew}>
          Add Client
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (data?.data ?? []).length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Add your first client to get started."
          action={<Button size="sm" icon={<Plus size={16} strokeWidth={1.75} />} onClick={openNew}>Add Client</Button>}
        />
      ) : (
        <div className="rounded-xl border not-focus:border-border bg-card divide-y divide-border">
          {(data?.data ?? []).map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-card-alt text-sm font-semibold text-brand shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{c.name}</p>
                <p className="text-xs text-ink-muted">{c.phone ?? '—'}</p>
              </div>
              <span className="hidden text-xs text-ink-muted sm:block">{fmtDate(c.created_at)}</span>
              <button
                onClick={() => openEdit(c)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand hover:bg-card-alt transition-colors"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {data?.meta && (
        <Pagination
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          hasNext={data.meta.hasNextPage}
          hasPrev={data.meta.hasPreviousPage}
          onNext={() => setPage((p) => p + 1)}
          onPrev={() => setPage((p) => p - 1)}
        />
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editClient?.id ? 'Edit Client' : 'New Client'} size="sm">
        {editClient && (
          <form
            onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(editClient); }}
            className="space-y-4"
          >
            <Input label="Name" required value={editClient.name} onChange={(e) => setEditClient({ ...editClient, name: e.target.value })} />
            <Input label="Phone" value={editClient.phone} onChange={(e) => setEditClient({ ...editClient, phone: e.target.value })} />
            <Input label="Notes" value={editClient.notes} onChange={(e) => setEditClient({ ...editClient, notes: e.target.value })} />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" size="sm" type="button" onClick={() => setModal(false)}>Cancel</Button>
              <Button size="sm" loading={saveMutation.isPending} type="submit">Save</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

/* ── Riders ───────────────────────────────────────────────────────────────── */
function RidersTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(false);
  const [newRider, setNewRider] = useState({ name: '', phone: '' });
  const [deleteRider, setDeleteRider] = useState<{ id: number; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['riders', { query, page }],
    queryFn: () => ridersApi.list({ query: query || undefined, page, limit: 20 }),
  });

  const createMutation = useMutation({
    mutationFn: () => ridersApi.create({ name: newRider.name, phone: newRider.phone || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['riders'] });
      setModal(false);
      setNewRider({ name: '', phone: '' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => ridersApi.update(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['riders'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ridersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['riders'] });
      setDeleteRider(null);
    },
  });

  return (
    <>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-grey" />
          <input
            placeholder="Search riders…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="w-full rounded-[10px] border not-focus:border-border bg-card py-2.5 pl-9 pr-4 text-sm text-ink placeholder:text-ink-grey outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors"
          />
        </div>
        <Button size="sm" icon={<Plus size={16} strokeWidth={1.75} />} onClick={() => setModal(true)}>
          Add Rider
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (data?.data ?? []).length === 0 ? (
        <EmptyState
          icon={Bike}
          title="No riders yet"
          description="Add a rider to start assigning jobs."
          action={<Button size="sm" icon={<Plus size={16} strokeWidth={1.75} />} onClick={() => setModal(true)}>Add Rider</Button>}
        />
      ) : (
        <div className="rounded-xl border not-focus:border-border bg-card divide-y divide-border">
          {(data?.data ?? []).map((r) => {
            const isToggling = toggleActive.isPending && toggleActive.variables?.id === r.id;
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-card-alt text-sm font-semibold text-brand shrink-0">
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{r.name}</p>
                  <p className="text-xs text-ink-muted">{r.phone ?? '—'}</p>
                </div>
                {/* Active toggle */}
                <button
                  onClick={() => toggleActive.mutate({ id: r.id, active: !r.active })}
                  disabled={toggleActive.isPending}
                  aria-pressed={r.active}
                  aria-busy={isToggling}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-wait disabled:opacity-70 ${
                    r.active ? 'bg-brand' : 'bg-border'
                  }`}
                  aria-label={`${r.active ? 'Deactivate' : 'Activate'} ${r.name}`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      isToggling ? 'opacity-0' : ''
                    } ${
                      r.active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                  {isToggling && (
                    <LoaderCircle
                      size={15}
                      aria-hidden="true"
                      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin ${
                        r.active ? 'text-white' : 'text-ink-muted'
                      }`}
                    />
                  )}
                </button>
                <span className={`w-16 text-right text-xs font-medium ${r.active ? 'text-success-text' : 'text-ink-grey'}`}>
                  {r.active ? 'Active' : 'Inactive'}
                </span>
                <button
                  type="button"
                  onClick={() => setDeleteRider({ id: r.id, name: r.name })}
                  disabled={deleteMutation.isPending}
                  aria-label={`Delete ${r.name}`}
                  title={`Delete ${r.name}`}
                  className="rounded-lg p-2 text-ink-grey transition-colors hover:bg-loss/10 hover:text-loss disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={16} strokeWidth={1.75} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {toggleActive.isError && (
        <p role="alert" className="text-sm text-loss">Could not update rider status. Please try again.</p>
      )}

      {data?.meta && (
        <Pagination
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          hasNext={data.meta.hasNextPage}
          hasPrev={data.meta.hasPreviousPage}
          onNext={() => setPage((p) => p + 1)}
          onPrev={() => setPage((p) => p - 1)}
        />
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="New Rider" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
          <Input label="Name" required value={newRider.name} onChange={(e) => setNewRider({ ...newRider, name: e.target.value })} />
          <Input label="Phone" value={newRider.phone} onChange={(e) => setNewRider({ ...newRider, phone: e.target.value })} />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button size="sm" loading={createMutation.isPending} type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={deleteRider !== null}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteRider(null);
        }}
        onConfirm={() => {
          if (deleteRider) deleteMutation.mutate(deleteRider.id);
        }}
        title="Delete rider?"
        message={`This will permanently delete ${deleteRider?.name ?? 'this rider'}. This action cannot be undone.${deleteMutation.isError ? ' The deletion failed; please try again.' : ''}`}
        confirmLabel="Delete rider"
        danger
        loading={deleteMutation.isPending}
      />
    </>
  );
}

/* ── Partners ─────────────────────────────────────────────────────────────── */
function PartnersTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(false);
  const [partnerForm, setPartnerForm] = useState<{
    id?: number;
    name: string;
    phone: string;
    email: string;
    notes: string;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['partners', { query, page }],
    queryFn: () => partnersApi.list({ query: query || undefined, page, limit: 20 }),
  });

  const saveMutation = useMutation({
    mutationFn: (form: NonNullable<typeof partnerForm>) => {
      const name = form.name.trim();
      if (form.id) {
        return partnersApi.update(form.id, {
          name,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          notes: form.notes.trim() || null,
        });
      }
      return partnersApi.create({
        name,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partners'] });
      qc.invalidateQueries({ queryKey: ['partners', 'active'] });
      setModal(false);
      setPartnerForm(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      partnersApi.update(id, { active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partners'] });
      qc.invalidateQueries({ queryKey: ['partners', 'active'] });
    },
  });

  function openNew() {
    saveMutation.reset();
    setPartnerForm({ name: '', phone: '', email: '', notes: '' });
    setModal(true);
  }

  function openEdit(partner: Partner) {
    saveMutation.reset();
    setPartnerForm({
      id: partner.id,
      name: partner.name,
      phone: partner.phone ?? '',
      email: partner.email ?? '',
      notes: partner.notes ?? '',
    });
    setModal(true);
  }

  return (
    <>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-grey" />
          <input
            placeholder="Search partners…"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            className="w-full rounded-[10px] border not-focus:border-border bg-card py-2.5 pl-9 pr-4 text-sm text-ink placeholder:text-ink-grey outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors"
          />
        </div>
        <Button size="sm" icon={<Plus size={16} strokeWidth={1.75} />} onClick={openNew}>
          Add Partner
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}
        </div>
      ) : !data ? (
        <p role="alert" className="text-sm text-loss">Could not load partners. Please try again.</p>
      ) : (data?.data ?? []).length === 0 ? (
        <EmptyState
          icon={Handshake}
          title={query ? 'No matching partners' : 'No partners yet'}
          description={query ? 'Try another search.' : 'Add a partner to reuse them when creating jobs.'}
          action={!query ? (
            <Button size="sm" icon={<Plus size={16} strokeWidth={1.75} />} onClick={openNew}>Add Partner</Button>
          ) : undefined}
        />
      ) : (
        <div className="rounded-xl border not-focus:border-border bg-card divide-y divide-border">
          {(data?.data ?? []).map((partner) => {
            const isToggling = toggleMutation.isPending && toggleMutation.variables?.id === partner.id;
            return (
              <div key={partner.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card-alt text-sm font-semibold text-brand">
                  {partner.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{partner.name}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {[partner.phone, partner.email].filter(Boolean).join(' · ') || 'No contact details'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleMutation.mutate({ id: partner.id, active: !partner.active })}
                  disabled={toggleMutation.isPending}
                  aria-pressed={partner.active}
                  aria-busy={isToggling}
                  aria-label={`${partner.active ? 'Deactivate' : 'Activate'} ${partner.name}`}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-wait disabled:opacity-70 ${
                    partner.active ? 'bg-brand' : 'bg-border'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    isToggling ? 'opacity-0' : partner.active ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                  {isToggling && (
                    <LoaderCircle
                      size={15}
                      aria-hidden="true"
                      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin ${
                        partner.active ? 'text-white' : 'text-ink-muted'
                      }`}
                    />
                  )}
                </button>
                <span className={`hidden w-16 text-right text-xs font-medium sm:block ${
                  partner.active ? 'text-success-text' : 'text-ink-grey'
                }`}>
                  {partner.active ? 'Active' : 'Inactive'}
                </span>
                <button
                  type="button"
                  onClick={() => openEdit(partner)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-card-alt"
                >
                  Edit
                </button>
              </div>
            );
          })}
        </div>
      )}

      {toggleMutation.isError && (
        <p role="alert" className="text-sm text-loss">Could not update partner status. Please try again.</p>
      )}

      {data?.meta && (
        <Pagination
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          hasNext={data.meta.hasNextPage}
          hasPrev={data.meta.hasPreviousPage}
          onNext={() => setPage((current) => current + 1)}
          onPrev={() => setPage((current) => current - 1)}
        />
      )}

      <Modal
        open={modal}
        onClose={() => {
          if (!saveMutation.isPending) {
            setModal(false);
            setPartnerForm(null);
          }
        }}
        title={partnerForm?.id ? 'Edit Partner' : 'New Partner'}
        size="sm"
      >
        {partnerForm && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveMutation.mutate(partnerForm);
            }}
            className="space-y-4"
          >
            <Input
              label="Name"
              required
              value={partnerForm.name}
              onChange={(event) => setPartnerForm({ ...partnerForm, name: event.target.value })}
            />
            <Input
              label="Phone"
              type="tel"
              value={partnerForm.phone}
              onChange={(event) => setPartnerForm({ ...partnerForm, phone: event.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={partnerForm.email}
              onChange={(event) => setPartnerForm({ ...partnerForm, email: event.target.value })}
            />
            <Input
              label="Notes"
              value={partnerForm.notes}
              onChange={(event) => setPartnerForm({ ...partnerForm, notes: event.target.value })}
            />
            {saveMutation.isError && (
              <p role="alert" className="text-sm text-loss">
                Could not save partner. The name may already be in use.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                disabled={saveMutation.isPending}
                onClick={() => { setModal(false); setPartnerForm(null); }}
              >
                Cancel
              </Button>
              <Button size="sm" loading={saveMutation.isPending} type="submit">Save</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
