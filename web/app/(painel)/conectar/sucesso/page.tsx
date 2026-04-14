import Link from 'next/link';

export default function SucessoPage({
  searchParams,
}: {
  searchParams: { platform?: string };
}) {
  const platform = searchParams.platform ?? 'plataforma';
  const label = platform === 'ml' ? 'Mercado Livre' : platform === 'shopee' ? 'Shopee' : platform;

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-brand/10 border border-brand/30 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg
            className="w-8 h-8 text-brand"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">
          Conectado com sucesso!
        </h1>
        <p className="text-sm text-zinc-400 mb-6">
          O lojista foi autorizado no {label}. Os pedidos serão sincronizados
          automaticamente.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/conectar"
            className="px-4 py-2 text-sm font-medium border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          >
            Ver lojistas
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm font-semibold bg-brand text-zinc-950 rounded-lg hover:bg-brand/90 transition-colors"
          >
            Ir ao dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
