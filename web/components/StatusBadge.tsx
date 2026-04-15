import { OrderStatus } from '@/lib/api';

interface BadgeStyle {
  label: string;
  bg:     string;
  color:  string;
  border: string;
  dot:    string;
}

const statusConfig: Record<OrderStatus, BadgeStyle> = {
  ready_to_ship: {
    label:  'Pronto p/ coletar',
    bg:     'rgba(255,215,0,0.08)',
    color:  '#FFD700',
    border: 'rgba(255,215,0,0.22)',
    dot:    '#FFD700',
  },
  collected: {
    label:  'Coletado',
    bg:     'rgba(147,51,234,0.1)',
    color:  '#C084FC',
    border: 'rgba(147,51,234,0.25)',
    dot:    '#9333EA',
  },
  pending: {
    label:  'Pendente',
    bg:     'rgba(249,115,22,0.1)',
    color:  '#FB923C',
    border: 'rgba(249,115,22,0.2)',
    dot:    '#F97316',
  },
  shipped: {
    label:  'Enviado',
    bg:     'rgba(59,130,246,0.1)',
    color:  '#93C5FD',
    border: 'rgba(59,130,246,0.2)',
    dot:    '#3B82F6',
  },
  delivered: {
    label:  'Entregue',
    bg:     'rgba(34,197,94,0.08)',
    color:  '#86EFAC',
    border: 'rgba(34,197,94,0.18)',
    dot:    '#22C55E',
  },
  cancelled: {
    label:  'Cancelado',
    bg:     'rgba(239,68,68,0.08)',
    color:  '#FCA5A5',
    border: 'rgba(239,68,68,0.18)',
    dot:    '#EF4444',
  },
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = statusConfig[status] ?? {
    label: status,
    bg: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.4)',
    border: 'rgba(255,255,255,0.1)',
    dot: 'rgba(255,255,255,0.3)',
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-body whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: cfg.dot }}
      />
      {cfg.label}
    </span>
  );
}
