import { OrderStatus } from '@/lib/api';

const statusConfig: Record<
  OrderStatus,
  { label: string; classes: string }
> = {
  ready_to_ship: {
    label: 'Pronto p/ coletar',
    classes: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  },
  collected: {
    label: 'Coletado',
    classes: 'bg-brand/10 text-brand border-brand/20',
  },
  pending: {
    label: 'Pendente',
    classes: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  },
  shipped: {
    label: 'Enviado',
    classes: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  },
  delivered: {
    label: 'Entregue',
    classes: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/20',
  },
  cancelled: {
    label: 'Cancelado',
    classes: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, classes } = statusConfig[status] ?? {
    label: status,
    classes: 'bg-zinc-700/20 text-zinc-400 border-zinc-600/20',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${classes}`}
    >
      {label}
    </span>
  );
}
