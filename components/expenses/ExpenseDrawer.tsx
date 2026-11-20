'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bike, Users, Building2 } from 'lucide-react';
import { expensesApi, ridersApi, clientsApi, searchApi } from '@/lib/api';
import { useUIStore } from '@/store/ui';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Autocomplete } from '@/components/ui/Autocomplete';
import { format } from 'date-fns';

const schema = z.object({
  description:  z.string().min(1, 'Required'),
  amount:       z.coerce.number().min(1, 'Must be > 0'),
  mode:         z.enum(['cash', 'transfer']),
  bank_name:    z.string().optional(),
  note:         z.string().optional(),
  owner:        z.enum(['rider', 'client', 'office']),
  rider_id:     z.string().optional(),
  client_id:    z.string().optional(),
  expense_date: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function ExpenseDrawer() {
  const { expenseDrawerOpen, editingExpenseId, editingExpense, closeExpenseDrawer } = useUIStore();
  const qc = useQueryClient();
  const [clientQuery, setClientQuery] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  const { data: existing } = useQuery({
    queryKey: ['expense', editingExpenseId],
    queryFn: () => expensesApi.get(editingExpenseId!),
    enabled: !!editingExpenseId,
    initialData: editingExpense?.id === editingExpenseId ? editingExpense : undefined,
  });

  const { data: ridersData } = useQuery({
    queryKey: ['riders', 'active'],
    queryFn: () => ridersApi.list({ active: true, limit: 100 }),
  });

  const { data: clientsData, isLoading: clientsLoading, isError: clientsError } = useQuery({
    queryKey: ['clients', 'expense-search', clientQuery],
    queryFn: () => clientsApi.list({ query: clientQuery, limit: 10 }),
    enabled: clientQuery.trim().length > 0,
    staleTime: 30_000,
  });

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      mode: 'cash',
      owner: 'office',
      expense_date: '',
    },
  });

  const owner = watch('owner');
  const mode  = watch('mode');

  useEffect(() => {
    if (existing) {
      reset({
        description:  existing.description,
        amount:       existing.amount,
        mode:         existing.mode,
        bank_name:    existing.bank_name  ?? '',
        note:         existing.note       ?? '',
        owner:        existing.owner,
        rider_id:     existing.rider_id  ? String(existing.rider_id)  : '',
        client_id:    existing.client_id ? String(existing.client_id) : '',
        expense_date: existing.expense_date ?? format(new Date(), 'yyyy-MM-dd'),
      });
      setClientQuery(existing.client?.name ?? '');
      setClientPhone('');
    } else {
      reset({
        mode: 'cash',
        owner: 'office',
        expense_date: format(new Date(), 'yyyy-MM-dd'),
      });
      setClientQuery('');
      setClientPhone('');
    }
  }, [existing, reset, expenseDrawerOpen]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      let clientId = data.client_id ? Number(data.client_id) : undefined;
      if (data.owner === 'client' && !clientId) {
        const name = clientQuery.trim();
        if (!name) throw new Error('Enter a client name.');

        const matches = await clientsApi.list({ query: name, limit: 20 });
        const existingClient = matches.data.find(
          (client) => client.name.trim().toLowerCase() === name.toLowerCase(),
        );
        const client = existingClient ?? await clientsApi.create({
          name,
          ...(clientPhone.trim() ? { phone: clientPhone.trim() } : {}),
        });
        clientId = client.id;
        qc.invalidateQueries({ queryKey: ['clients'] });
      }

      const body: Record<string, unknown> = {
        description:  data.description,
        amount:       data.amount,
        mode:         data.mode,
        owner:        data.owner,
        expense_date: data.expense_date,
      };
      if (data.mode === 'transfer')              body.bank_name = data.bank_name;
      if (data.note)                             body.note      = data.note;
      if (data.owner === 'rider'  && data.rider_id)  body.rider_id  = Number(data.rider_id);
      if (data.owner === 'client' && clientId) body.client_id = clientId;
      return editingExpenseId
        ? expensesApi.update(editingExpenseId, body)
        : expensesApi.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      closeExpenseDrawer();
    },
  });

  const riders  = ridersData?.data  ?? [];
  const clients = clientsData?.data ?? [];

  const ownerOptions: { value: 'rider' | 'office' | 'client'; label: string; icon: React.ReactNode }[] = [
    { value: 'rider',  label: 'Rider',  icon: <Bike      size={14} strokeWidth={1.75} /> },
    { value: 'office', label: 'Office', icon: <Building2 size={14} strokeWidth={1.75} /> },
    { value: 'client', label: 'Client', icon: <Users     size={14} strokeWidth={1.75} /> },
  ];

  return (
    <Drawer
      open={expenseDrawerOpen}
      onClose={closeExpenseDrawer}
      title={editingExpenseId ? 'Edit Expense' : 'Log Expense'}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={closeExpenseDrawer}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            loading={mutation.isPending}
            onClick={handleSubmit((d) => mutation.mutate(d))}
          >
            {editingExpenseId ? 'Save Changes' : 'Log Expense'}
          </Button>
        </div>
      }
    >
      {mutation.isError && (
        <div className="mb-4 rounded-lg border border-loss-bg bg-loss-bg px-4 py-3 text-sm text-loss">
          {(mutation.error as any)?.response?.data?.message ?? 'Something went wrong.'}
        </div>
      )}

      <form className="space-y-4">
        {/* Owner toggle */}
        <div className="space-y-2">
          <span className="block text-[13px] font-medium text-ink-muted">Owner</span>
          <div className="flex overflow-hidden rounded-lg border border-border">
            {ownerOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setValue('owner', o.value)}
                className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-colors ${
                  owner === o.value
                    ? 'bg-brand text-white'
                    : 'text-ink-muted hover:bg-page'
                }`}
              >
                {o.icon}
                {o.label}
              </button>
            ))}
          </div>

          {owner === 'rider' && (
            <Select
              placeholder="Select rider…"
              options={riders.map((r) => ({ value: r.id, label: r.name }))}
              {...register('rider_id')}
            />
          )}
          {owner === 'client' && (
            <div className="space-y-2">
              <div className="relative">
                <Input
                  label="Client"
                  placeholder="Search or enter client name"
                  autoComplete="off"
                  value={clientQuery}
                  onChange={(event) => {
                    const value = event.target.value;
                    setClientQuery(value);
                    setClientPhone('');
                    setValue('client_id', '');
                  }}
                  aria-expanded={clients.length > 0}
                  aria-autocomplete="list"
                  role="combobox"
                />
                {clientQuery.trim() && clients.length > 0 && (
                  <ul role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-auto rounded-xl border border-border bg-card p-1 shadow-[var(--shadow-dialog)]">
                    {clients.map((client) => (
                      <li key={client.id} role="option" aria-selected={watch('client_id') === String(client.id)}>
                        <button
                          type="button"
                          onClick={() => {
                            setClientQuery(client.name);
                            setClientPhone(client.phone ?? '');
                            setValue('client_id', String(client.id), { shouldDirty: true });
                          }}
                          className="flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-sm text-ink hover:bg-page"
                        >
                          <span className="truncate">{client.name}</span>
                          <span className="shrink-0 text-xs text-ink-muted">{client.phone ?? ''}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {clientsLoading && <p className="text-xs text-ink-muted">Searching clients…</p>}
              {clientQuery.trim() && clients.length === 0 && !clientsLoading && (
                <p className="text-xs text-ink-muted">
                  {clientsError ? 'Client search unavailable; a new client will be created when you save.' : 'No matching client. A new client will be created when you save.'}
                </p>
              )}
              {!watch('client_id') && clientQuery.trim() && (
                <Input
                  label="Client phone (optional)"
                  type="tel"
                  placeholder="e.g. 08012345678"
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
                />
              )}
            </div>
          )}
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-muted">Description</span>
          <textarea
            placeholder="What was this for?"
            rows={3}
            aria-invalid={!!errors.description}
            className={`w-full min-w-0 resize-y rounded-[10px] border bg-card px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-grey focus:border-brand focus:ring-2 focus:ring-brand/20 ${
              errors.description ? 'border-loss' : 'border-border hover:border-ink-grey'
            }`}
            {...register('description')}
          />
          {errors.description && <p className="mt-1.5 text-xs font-medium text-loss">{errors.description.message}</p>}
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Amount (₦)"
            type="number"
            min={1}
            error={errors.amount?.message}
            {...register('amount')}
          />
          <Input
            label="Date"
            type="date"
            {...register('expense_date')}
          />
        </div>

        <Select
          label="Payment Mode"
          options={[
            { value: 'cash',     label: 'Cash'     },
            { value: 'transfer', label: 'Transfer' },
          ]}
          {...register('mode')}
        />

        {mode === 'transfer' && (
          <Autocomplete
            label="Bank Name"
            placeholder="e.g. GTBank"
            value={watch('bank_name') ?? ''}
            onChange={(v) => setValue('bank_name', v)}
            onSearch={(q) => searchApi.banks(q)}
            error={errors.bank_name?.message}
          />
        )}


         <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Note (optional)</span>
              <textarea
                rows={4}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                 placeholder="Additional context…"
               {...register('note')}
              />
            </label>
      </form>
    </Drawer>
  );
}
