import { fmt } from '@/lib/utils';

interface MoneyBarProps {
  officeFee:    number;
  subletAmount: number;
  parkWaybill:  number;
  partnerAmount:number;
  total:        number;
  /** If true, renders the "Your income / Passed on" labels row */
  showLabels?: boolean;
}

/**
 * Segmented bar that visually splits a job total into:
 *   green  = office fee (your income)
 *   violet = sublet amount (passed on — sublet)
 *   amber  = park / waybill
 *   sky    = partner amount
 *
 * Usage: <MoneyBar officeFee={3000} subletAmount={5000} … />
 */
export function MoneyBar({
  officeFee,
  subletAmount,
  parkWaybill,
  partnerAmount,
  total,
  showLabels = true,
}: MoneyBarProps) {
  if (total <= 0) return null;

  const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`;

  const yourIncome  = officeFee;
  const passedOn    = subletAmount + parkWaybill + partnerAmount;

  const segments = [
    { pct: pct(officeFee),    color: '#16A34A', label: 'Office fee'  },
    { pct: pct(subletAmount), color: '#7C3AED', label: 'Sublet'       },
    { pct: pct(parkWaybill),  color: '#D97706', label: 'Park/Waybill' },
    { pct: pct(partnerAmount),color: '#0284C7', label: 'Partner'      },
  ].filter((s) => parseFloat(s.pct) > 0);

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-border">
        {segments.map((s) => (
          <div
            key={s.label}
            style={{ width: s.pct, backgroundColor: s.color }}
            className="transition-all duration-300"
            title={`${s.label}: ${s.pct}`}
          />
        ))}
      </div>

      {showLabels && (
        <div className="flex items-center justify-between text-xs tabular">
          <span className="font-medium text-[#16A34A]">
            Your income <span className="font-semibold">{fmt(yourIncome)}</span>
          </span>
          {passedOn > 0 && (
            <span className="text-ink-muted">
              Passed on <span className="font-semibold">{fmt(passedOn)}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
