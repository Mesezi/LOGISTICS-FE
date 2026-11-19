'use client';

import { useEffect } from 'react';
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

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: () => clientsApi.list({ limit: 100 }),
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
    } else {
      reset({
        mode: 'cash',
        owner: 'office',
        expense_date: format(new Date(), 'yyyy-MM-dd'),
      });
    }
  }, [existing, reset, expenseDrawerOpen]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
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
      if (data.owner === 'client' && data.client_id) body.client_id = Number(data.client_id);
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
            <Select
              placeholder="Select client…"
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
              {...register('client_id')}
            />
          )}
        </div>

        <Input
          label="Description"
          placeholder="What was this for?"
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="grid grid-cols-2 gap-3">
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

        <Input
          label="Note (optional)"
          placeholder="Additional context…"
          {...register('note')}
        />
      </form>
    </Drawer>
  );
}
