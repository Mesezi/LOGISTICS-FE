'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Handshake, MapPin, User, Banknote, ParkingCircle } from 'lucide-react';
import { jobsApi, clientsApi, partnersApi, ridersApi, searchApi } from '@/lib/api';
import { useUIStore } from '@/store/ui';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Autocomplete } from '@/components/ui/Autocomplete';
import { MoneyBar } from '@/components/ui/MoneyBar';
import { fmt } from '@/lib/utils';
import { format } from 'date-fns';

const createJobSchema = (isEditing: boolean) => z.object({
  client_id:      z.string().optional(),
  client_name:    z.string().optional(),
  client_phone:   z.string().optional(),
  pickup:         z.string().min(1, 'Required'),
  dropoff:        z.string().min(1, 'Required'),
  job_date:       z.string().min(1, 'Required'),
  description:    z.string().optional(),
  office_fee:     z.coerce.number().min(1, 'Required'),
  park_waybill:   z.coerce.number().min(0).default(0),
  execution:      z.enum(['rider', 'sublet']).default('rider'),
  rider_id:       z.string().optional(),
  sublet_name:    z.string().optional(),
  sublet_amount:  z.coerce.number().min(0).default(0),
  sublet_receiving_payment: z.boolean().default(false),
  has_partner:    z.boolean().default(false),
  partner_id:     z.string().optional(),
  partner_name:   z.string().optional(),
  partner_phone:  z.string().optional(),
  partner_amount: z.coerce.number().int('Must be a whole amount').min(0).default(0),
  client_mode:    z.enum(['existing', 'new']).default('existing'),
}).superRefine((data, ctx) => {
  if (data.client_mode === 'new' && !data.client_name?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['client_name'], message: 'Enter a client name' });
  }
  if (data.client_mode === 'existing' && !data.client_id) {
    ctx.addIssue({ code: 'custom', path: ['client_id'], message: 'Select a client' });
  }
  if (isEditing && data.client_mode === 'new') {
    ctx.addIssue({ code: 'custom', path: ['client_name'], message: 'Select an existing client when editing' });
  }
  if (data.has_partner && !data.partner_name?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['partner_name'], message: 'Enter or select a partner' });
  }
  if (isEditing && data.has_partner && !data.partner_id) {
    ctx.addIssue({ code: 'custom', path: ['partner_id'], message: 'Select an existing partner when editing' });
  }
  if (data.has_partner && data.partner_amount <= 0) {
    ctx.addIssue({ code: 'custom', path: ['partner_amount'], message: 'Must be greater than 0' });
  }
});

type FormInput = z.input<ReturnType<typeof createJobSchema>>;
type FormData = z.output<ReturnType<typeof createJobSchema>>;

export function JobDrawer() {
  const { jobDrawerOpen, editingJobId, closeJobDrawer } = useUIStore();
  const qc = useQueryClient();
  const [clientSuggestionsOpen, setClientSuggestionsOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [partnerSuggestionsOpen, setPartnerSuggestionsOpen] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState('');

  const { data: existingJob } = useQuery({
    queryKey: ['job', editingJobId],
    queryFn: () => jobsApi.get(editingJobId!),
    enabled: !!editingJobId,
  });

  const {
    data: clientsData,
    isLoading: clientsLoading,
    isError: clientsError,
  } = useQuery({
    queryKey: ['clients', 'search', clientSearch],
    queryFn: () => clientsApi.list({ query: clientSearch, limit: 10 }),
    enabled: clientSearch.trim().length > 0,
    staleTime: 30_000,
  });

  const { data: ridersData } = useQuery({
    queryKey: ['riders', 'active'],
    queryFn: () => ridersApi.list({ active: true, limit: 100 }),
  });

  const {
    data: partnersData,
    isLoading: partnersLoading,
    isError: partnersError,
  } = useQuery({
    queryKey: ['partners', 'search', partnerSearch],
    queryFn: () => partnersApi.list({
      query: partnerSearch || undefined,
      active: true,
      limit: 20,
    }),
    enabled: partnerSuggestionsOpen,
  });

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(createJobSchema(!!editingJobId)),
    defaultValues: {
      job_date: '',
      execution: 'rider',
      client_mode: 'existing',
      park_waybill: 0,
      sublet_amount: 0,
      sublet_receiving_payment: false,
      partner_amount: 0,
      partner_id: '',
      partner_name: '',
      partner_phone: '',
      client_phone: '',
    },
  });

  const execution    = watch('execution');
  const subletReceivingPayment = watch('sublet_receiving_payment');
  const hasPartner   = watch('has_partner');
  const officeFee    = Number(watch('office_fee'))    || 0;
  const parkWaybill  = Number(watch('park_waybill'))  || 0;
  const subletAmount = Number(watch('sublet_amount')) || 0;
  const partnerAmount= Number(watch('partner_amount'))|| 0;

  const liveTotal =
    officeFee +
    parkWaybill +
    (execution === 'sublet' ? subletAmount : 0) +
    (hasPartner ? partnerAmount : 0);

  useEffect(() => {
    if (existingJob) {
      reset({
        client_id:      String(existingJob.client_id),
        client_name:    existingJob.client?.name ?? '',
        client_phone:   existingJob.client?.phone ?? '',
        pickup:         existingJob.pickup,
        dropoff:        existingJob.dropoff,
        job_date:       existingJob.job_date,
        description:    existingJob.description ?? '',
        office_fee:     existingJob.office_fee,
        park_waybill:   existingJob.park_waybill,
        execution:      existingJob.sublet_name ? 'sublet' : 'rider',
        rider_id:       existingJob.rider_id ? String(existingJob.rider_id) : '',
        sublet_name:    existingJob.sublet_name ?? '',
        sublet_amount:  existingJob.sublet_amount,
        sublet_receiving_payment: existingJob.sublet_amount === 0,
        has_partner:    !!(existingJob.partner_id || existingJob.partner_name_snapshot || existingJob.partner_name),
        partner_id:     existingJob.partner_id ? String(existingJob.partner_id) : '',
        partner_name:   existingJob.partner?.name ?? existingJob.partner_name_snapshot ?? existingJob.partner_name ?? '',
        partner_phone:  '',
        partner_amount: existingJob.partner_amount,
        client_mode:    'existing',
      });
      setClientSearch(existingJob.client?.name ?? '');
      setPartnerSearch(existingJob.partner?.name ?? existingJob.partner_name_snapshot ?? existingJob.partner_name ?? '');
    } else {
      reset({
        job_date: format(new Date(), 'yyyy-MM-dd'),
        execution: 'rider',
        client_mode: 'existing',
        park_waybill: 0,
        sublet_amount: 0,
        sublet_receiving_payment: false,
        partner_amount: 0,
        partner_id: '',
        partner_name: '',
        partner_phone: '',
        client_phone: '',
      });
      setClientSearch('');
      setPartnerSearch('');
    }
  }, [existingJob, reset, jobDrawerOpen]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const body: Record<string, unknown> = {
        pickup:       data.pickup,
        dropoff:      data.dropoff,
        job_date:     data.job_date,
        description:  data.description,
        office_fee:   data.office_fee,
        park_waybill: data.park_waybill,
      };
      if (editingJobId) {
        body.client_id = Number(data.client_id);
      } else if (data.client_mode === 'existing' && data.client_id) {
        body.client_id = Number(data.client_id);
      } else if (data.client_name?.trim()) {
        body.client = {
          name: data.client_name.trim(),
          ...(data.client_phone?.trim() ? { phone: data.client_phone.trim() } : {}),
        };
      }
      if (data.execution === 'rider' && data.rider_id)
        body.rider_id = Number(data.rider_id);
      if (data.execution === 'sublet') {
        body.sublet_name   = data.sublet_name;
        body.sublet_amount = data.sublet_receiving_payment ? 0 : data.sublet_amount;
      }
      if (data.has_partner && data.partner_id) {
        body.partner_id = Number(data.partner_id);
        body.partner_amount = data.partner_amount;
      } else if (data.has_partner && !editingJobId) {
        body.partner = {
          name: data.partner_name!.trim(),
          ...(data.partner_phone?.trim() ? { phone: data.partner_phone.trim() } : {}),
        };
        body.partner_amount = data.partner_amount;
      } else if (data.has_partner && editingJobId) {
        body.partner_id = Number(data.partner_id);
        body.partner_amount = data.partner_amount;
      } else if (editingJobId && (existingJob?.partner_id || existingJob?.partner_name_snapshot || existingJob?.partner_name)) {
        body.partner_id = null;
        body.partner_amount = 0;
      }
      return editingJobId
        ? jobsApi.update(editingJobId, body)
        : jobsApi.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
      closeJobDrawer();
    },
  });

  const clients = clientsData?.data ?? [];
  const riders  = ridersData?.data  ?? [];
  const selectedPartnerId = watch('partner_id');
  const clientName = watch('client_name') ?? '';
  const clientPhone = watch('client_phone') ?? '';
  const partnerName = watch('partner_name') ?? '';
  const partnerPhone = watch('partner_phone') ?? '';
  const selectedClientId = watch('client_id');
  const matchingClients = clientName.trim() ? clients : [];
  const selectedClient = Boolean(selectedClientId);
  const selectedPartner = Boolean(selectedPartnerId);
  const partners = partnersData?.data ?? [];
  const matchingPartners = partnerName.trim() ? partners : [];
  const mutationErrorMessage = isAxiosError(mutation.error)
    ? (() => {
        const responseData: unknown = mutation.error.response?.data;
        if (
          typeof responseData === 'object' &&
          responseData !== null &&
          'message' in responseData &&
          typeof responseData.message === 'string'
        ) {
          return responseData.message;
        }
        return 'Something went wrong.';
      })()
    : 'Something went wrong.';

  return (
    <Drawer
      open={jobDrawerOpen}
      onClose={closeJobDrawer}
      title={editingJobId ? 'Edit Job' : 'New Job'}
      subtitle={editingJobId ? 'Update job details' : 'Create a new delivery job'}
      footer={
        <div className="space-y-3">
          {/* Live total + MoneyBar */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink-muted">Total</span>
              <span className="tabular text-xl font-semibold text-ink">{fmt(liveTotal)}</span>
            </div>
            <MoneyBar
              officeFee={officeFee}
              subletAmount={execution === 'sublet' ? subletAmount : 0}
              parkWaybill={parkWaybill}
              partnerAmount={hasPartner ? partnerAmount : 0}
              total={liveTotal}
            />
          </div>
          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={closeJobDrawer}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              loading={mutation.isPending}
              onClick={handleSubmit((d) => mutation.mutate(d))}
            >
              {editingJobId ? 'Save Changes' : 'Create Job'}
            </Button>
          </div>
        </div>
      }
    >
      {mutation.isError && (
        <div className="mb-4 rounded-lg border border-loss-bg bg-loss-bg px-4 py-3 text-sm text-loss">
          {mutationErrorMessage}
        </div>
      )}

      <form className="space-y-3">

        {/* ── Section: Client ─────────────────────────────────────── */}
        <SectionCard
          icon={<User size={13} strokeWidth={1.75} className="text-ink-muted" />}
          label="Client"
        >
          <div className="relative">
            <div className="flex items-end gap-2">
              <div className="flex-1 min-w-0">
                <Input
                  label="Client name"
                  placeholder="Search or enter client name"
                  autoComplete="off"
                  value={clientName}
                  disabled={selectedClient}
                  error={errors.client_name?.message ?? errors.client_id?.message}
                  onFocus={() => setClientSuggestionsOpen(true)}
                  onBlur={() => setTimeout(() => setClientSuggestionsOpen(false), 120)}
                  onChange={(event) => {
                    setValue('client_name', event.target.value, { shouldDirty: true, shouldValidate: true });
                    setValue('client_phone', '', { shouldDirty: true });
                    setValue('client_id', '', { shouldDirty: true, shouldValidate: true });
                    setValue('client_mode', 'new', { shouldDirty: true });
                    setClientSearch(event.target.value);
                  }}
                  role="combobox"
                  aria-expanded={clientSuggestionsOpen && matchingClients.length > 0}
                  aria-autocomplete="list"
                />
              </div>
              {selectedClient && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mb-0.5"
                  onClick={() => {
                    setValue('client_id', '', { shouldDirty: true });
                    setValue('client_name', '', { shouldDirty: true });
                    setValue('client_phone', '', { shouldDirty: true });
                    setValue('client_mode', 'new', { shouldDirty: true });
                    setClientSearch('');
                    setClientSuggestionsOpen(true);
                  }}
                >
                  Change
                </Button>
              )}
              {clientSuggestionsOpen && !selectedClient && matchingClients.length > 0 && (
                <ul role="listbox" className="absolute left-0 top-full z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-border bg-white p-1 shadow-[0_8px_24px_rgba(22,34,51,.12)]">
                  {matchingClients.map((client) => (
                    <li key={client.id} role="option" aria-selected={String(selectedClientId) === String(client.id)}>
                      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => {
                        setValue('client_id', String(client.id), { shouldDirty: true });
                        setValue('client_name', client.name, { shouldDirty: true });
                        setValue('client_phone', client.phone ?? '', { shouldDirty: true });
                        setValue('client_mode', 'existing', { shouldDirty: true });
                        setClientSearch(client.name);
                        setClientSuggestionsOpen(false);
                      }} className="flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-sm text-ink hover:bg-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                        <span className="truncate">{client.name}</span>
                        <span className="shrink-0 text-xs text-ink-muted">{client.phone ?? 'No phone'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {clientSuggestionsOpen && !selectedClient && clientName.trim() && clientsLoading && (
              <p className="mt-1 text-xs text-ink-muted">Searching clients…</p>
            )}
            {clientSuggestionsOpen && !selectedClient && clientName.trim() && clientsError && (
              <p role="alert" className="mt-1 text-xs text-loss">Could not search clients. You can still enter a new client.</p>
            )}
          </div>
          <Input
            label="Phone (optional)"
            type="tel"
            placeholder="e.g. 08012345678"
            value={clientPhone}
            disabled={selectedClient}
            onChange={(event) => setValue('client_phone', event.target.value, { shouldDirty: true })}
          />
        </SectionCard>

        {/* ── Section: Route ──────────────────────────────────────── */}
        <SectionCard
          icon={<MapPin size={13} strokeWidth={1.75} className="text-ink-muted" />}
          label="Route"
        >
          <div className="grid grid-cols-2 gap-3">
            <Autocomplete
              label="Pickup"
              placeholder="e.g. Ikeja"
              value={watch('pickup') ?? ''}
              onChange={(v) => setValue('pickup', v)}
              onSearch={(q) => searchApi.locations(q)}
              error={errors.pickup?.message}
            />
            <Autocomplete
              label="Drop-off"
              placeholder="e.g. Lekki"
              value={watch('dropoff') ?? ''}
              onChange={(v) => setValue('dropoff', v)}
              onSearch={(q) => searchApi.locations(q)}
              error={errors.dropoff?.message}
            />
          </div>
          <div className="grid gap-3">
            <Input
              label="Date"
              type="date"
              error={errors.job_date?.message}
              className="w-full min-w-0 max-w-full"
              {...register('job_date')}
            />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Note (optional)</span>
              <textarea
                placeholder="e.g. fragile"
                rows={4}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                {...register('description')}
              />
            </label>
          </div>
        </SectionCard>

        {/* ── Section: Fees ──────────────────────────────────────── */}
        <SectionCard
          icon={<Banknote size={13} strokeWidth={1.75} className="text-ink-muted" />}
          label="Fees"
        >
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Office Fee (₦)"
              type="number"
              min={0}
              error={errors.office_fee?.message}
              {...register('office_fee')}
            />
            <div>
              <Input
                label="Park / Waybill (₦)"
                type="number"
                min={0}
                {...register('park_waybill')}
              />
              <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-muted">
                <ParkingCircle size={10} strokeWidth={1.75} />
                Optional park &amp; transport fee
              </p>
            </div>
          </div>
        </SectionCard>

        {/* ── Section: Execution ─────────────────────────────────── */}
        <SectionCard
          icon={<ArrowRightLeft size={13} strokeWidth={1.75} className="text-ink-muted" />}
          label="Dispatch"
        >
          {/* Toggle */}
          <div className="flex overflow-hidden rounded-lg border border-border">
            {(['rider', 'sublet'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setValue('execution', mode)}
                className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-colors ${
                  execution === mode
                    ? 'bg-brand text-white'
                    : 'text-ink-muted hover:bg-page'
                }`}
              >
                {mode === 'sublet' && <ArrowRightLeft size={14} strokeWidth={1.75} />}
                {mode === 'rider' ? 'In-House Rider' : 'Sublet'}
              </button>
            ))}
          </div>

          {execution === 'rider' && (
            <Select
              placeholder="Select rider…"
              options={riders.map((r) => ({ value: r.id, label: r.name }))}
              {...register('rider_id')}
            />
          )}

          {execution === 'sublet' && (
            <div className="space-y-3">
              <Input
                label="Sublet Name"
                placeholder="Courier name"
                {...register('sublet_name')}
              />
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-brand"
                  {...register('sublet_receiving_payment', {
                    onChange: (event) => {
                      if (event.target.checked) {
                        setValue('sublet_amount', 0, { shouldDirty: true, shouldValidate: true });
                      }
                    },
                  })}
                />
                Sublet is receiving payment
              </label>
              {!subletReceivingPayment && (
                <Input
                  label="Sublet Amount (₦)"
                  type="number"
                  min={0}
                  {...register('sublet_amount')}
                />
              )}
            </div>
          )}
        </SectionCard>

        {/* ── Section: Partner ───────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Toggle header */}
          <label className="flex cursor-pointer items-center gap-3 px-4 py-3.5">
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-brand"
              {...register('has_partner', {
                onChange: (event) => {
                  if (!event.target.checked) {
                    setValue('partner_id', '', { shouldDirty: true });
                    setValue('partner_name', '', { shouldDirty: true });
                    setValue('partner_phone', '', { shouldDirty: true });
                    setValue('partner_amount', 0, { shouldDirty: true });
                    setPartnerSearch('');
                    setPartnerSuggestionsOpen(false);
                  }
                },
              })}
            />
            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Handshake size={15} strokeWidth={1.75} className="text-ink-grey" />
              Add partner
              <span className="text-xs font-normal text-ink-muted">(optional)</span>
            </span>
          </label>

          {hasPartner && (
            <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
              <div className="relative">
                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <Input
                      label="Partner name"
                      placeholder={editingJobId ? 'Search existing partners' : 'Search or enter partner name'}
                      autoComplete="off"
                      value={partnerName}
                      disabled={selectedPartner}
                      error={errors.partner_name?.message ?? errors.partner_id?.message}
                      onFocus={() => setPartnerSuggestionsOpen(true)}
                      onBlur={() => setTimeout(() => setPartnerSuggestionsOpen(false), 120)}
                      onChange={(event) => {
                        setValue('partner_name', event.target.value, { shouldDirty: true, shouldValidate: true });
                        setValue('partner_id', '', { shouldDirty: true, shouldValidate: true });
                        setValue('partner_phone', '', { shouldDirty: true });
                        setPartnerSearch(event.target.value);
                      }}
                      role="combobox"
                      aria-expanded={partnerSuggestionsOpen && matchingPartners.length > 0}
                      aria-autocomplete="list"
                    />
                  </div>
                  {selectedPartner && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mb-0.5"
                      onClick={() => {
                        setValue('partner_id', '', { shouldDirty: true, shouldValidate: true });
                        setValue('partner_name', '', { shouldDirty: true });
                        setValue('partner_phone', '', { shouldDirty: true });
                        setPartnerSearch('');
                        setPartnerSuggestionsOpen(true);
                      }}
                    >
                      Change
                    </Button>
                  )}
                  {partnerSuggestionsOpen && !selectedPartner && matchingPartners.length > 0 && (
                    <ul role="listbox" className="absolute left-0 top-full z-20 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-border bg-white p-1 shadow-[0_8px_24px_rgba(22,34,51,.12)]">
                      {matchingPartners.map((partner) => (
                        <li key={partner.id} role="option" aria-selected={String(selectedPartnerId) === String(partner.id)}>
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setValue('partner_id', String(partner.id), { shouldDirty: true, shouldValidate: true });
                              setValue('partner_name', partner.name, { shouldDirty: true });
                              setValue('partner_phone', partner.phone ?? '', { shouldDirty: true });
                              setPartnerSearch(partner.name);
                              setPartnerSuggestionsOpen(false);
                            }}
                            className="flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-sm text-ink hover:bg-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                          >
                            <span className="truncate">{partner.name}</span>
                            <span className="shrink-0 text-xs text-ink-muted">{partner.phone ?? 'No phone'}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {partnerSuggestionsOpen && !selectedPartner && partnerName.trim() && partnersLoading && (
                  <p className="mt-1 text-xs text-ink-muted">Searching partners…</p>
                )}
                {partnerSuggestionsOpen && !selectedPartner && partnerName.trim() && partnersError && (
                  <p role="alert" className="mt-1 text-xs text-loss">Partner search failed. You can still enter a new partner.</p>
                )}
              </div>

              {!selectedPartner && !editingJobId && (
                <Input
                  label="Partner phone (optional)"
                  type="tel"
                  placeholder="Enter partner phone"
                  value={partnerPhone}
                  onChange={(event) => setValue('partner_phone', event.target.value, { shouldDirty: true })}
                />
              )}
              {selectedPartner && !editingJobId && (
                <Input
                  label="Partner phone"
                  type="tel"
                  value={partnerPhone}
                  disabled
                />
              )}
              {editingJobId && !selectedPartner && (
                <p className="text-xs text-ink-muted">Select an existing partner when editing a job.</p>
              )}
              {partnersData?.data.length === 0 && !editingJobId && (
                <p className="text-xs text-ink-muted">No existing partners found. Enter a name to create one with this job.</p>
              )}
              <div className="max-w-56">
                <Input
                  label="Partner Amount (₦)"
                  type="number"
                  min={1}
                  error={errors.partner_amount?.message}
                  {...register('partner_amount')}
                />
              </div>
            </div>
          )}
        </div>

      </form>
    </Drawer>
  );
}

/* ── Section card wrapper ──────────────────────────────────────────────────── */
function SectionCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-page px-4 py-2.5">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {label}
        </span>
      </div>
      <div className="min-w-0 space-y-3 px-4 py-3.5">
        {children}
      </div>
    </div>
  );
}
