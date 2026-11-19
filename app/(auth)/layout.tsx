import Link from 'next/link';
import { Check, MapPin, PackageCheck, Truck } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page h-dvh overflow-hidden bg-white lg:grid lg:grid-cols-[1fr_.92fr]">
      <section className="relative hidden h-full min-h-0 flex-col justify-between overflow-hidden bg-page px-12 py-10 lg:flex xl:px-16 xl:py-12">
        <div className="absolute -right-36 -top-36 h-96 w-96 rounded-full bg-card-alt/80 blur-3xl" />
        <div className="absolute -bottom-44 -left-40 h-[28rem] w-[28rem] rounded-full bg-brand/5 blur-3xl" />

        <Link href="/" className="relative inline-flex w-fit items-center gap-3" aria-label="ShipNow home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white shadow-lg shadow-brand/20">
            <Truck size={20} strokeWidth={2} />
          </span>
          <span className="text-[17px] font-bold tracking-tight text-ink">SHIPNOW</span>
        </Link>

        <div className="relative my-12 max-w-xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Logistics operations, made clear
          </p>
          <h2 className="max-w-lg text-4xl font-semibold leading-[1.12] tracking-[-.045em] text-ink xl:text-5xl">
            Every delivery, <span className="text-brand">in motion.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-ink-muted">
            Keep jobs, dispatch, payments, and your team together in one calm workspace.
          </p>

          <div className="mt-11 max-w-[440px] rounded-2xl border border-white bg-white p-5 shadow-[0_18px_50px_rgba(27,36,51,.08)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-card-alt text-brand"><PackageCheck size={19} /></span>
                <div><p className="text-sm font-semibold text-ink">Dispatch at a glance</p><p className="mt-0.5 text-xs text-ink-muted">From booking to delivery</p></div>
              </div>
              <span className="rounded-full bg-success-bg px-2.5 py-1 text-sm font-semibold text-success-text">On track</span>
            </div>
            <div className="relative mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="absolute left-5 right-5 top-3 h-px bg-border" />
              <div className="relative"><span className="mb-2 flex h-6 w-6 items-center justify-center rounded-full border-4 border-card-alt bg-brand"><span className="sr-only">Pickup</span></span><p className="text-xs font-semibold text-ink">Pickup</p><p className="mt-1 text-[11px] text-ink-muted">Job details</p></div>
              <div className="relative -mt-7 flex h-7 w-7 items-center justify-center rounded-full bg-page text-ink-muted"><Truck size={14} /></div>
              <div className="relative justify-self-end"><span className="mb-2 ml-auto flex h-6 w-6 items-center justify-center rounded-full border-4 border-success-bg bg-success-text"><span className="sr-only">Delivery</span></span><p className="text-right text-xs font-semibold text-ink">Delivery</p><p className="mt-1 text-right text-[11px] text-ink-muted">Status updated</p></div>
            </div>
            <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-xs text-ink-muted">
              <Check size={14} className="text-success-text" /> Clear records. Faster handoffs. Better visibility.
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-ink-muted"><MapPin size={14} /> Built for busy logistics teams</div>
      </section>

      <main className="h-full min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain">
        <div className="flex min-h-full w-full items-center justify-center px-5 py-8 sm:px-10 sm:py-12">
          <div className="w-full max-w-[430px] shrink-0">
            <Link href="/" className="mb-8 inline-flex items-center gap-2.5 lg:hidden" aria-label="ShipNow home">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand text-white"><Truck size={18} /></span>
              <span className="text-base font-bold tracking-tight text-ink">SHIPNOW</span>
            </Link>
            <div className="auth-card rounded-2xl border border-border/80 bg-white p-6 shadow-[0_20px_70px_rgba(27,36,51,.08)] sm:p-9">
              {children}
            </div>
            <p className="mt-6 text-center text-[11px] text-ink-grey">Secure access to your ShipNow workspace</p>
          </div>
        </div>
      </main>
    </div>
  );
}
