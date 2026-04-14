import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { getOrCreatePendingCharge } from '../services/sellerService';
import { createPixCharge, SellerCustomer } from '../services/abacatePayService';

export async function checkAndGenerateCharges(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Sellers que precisam de cobrança:
  // 1. credit_used >= credit_limit (estourou o limite)
  // 2. cycle_end <= hoje E credit_used > 0 (ciclo encerrou)
  const { data: sellers, error } = await supabase
    .from('seller_credits')
    .select('seller_id, credit_used, credit_limit, cycle_end')
    .gt('credit_used', 0)
    .or(`cycle_end.lte.${today},credit_used.gte.credit_limit`);

  if (error) {
    logger.error({ error }, 'Erro ao buscar sellers para cobrança automática');
    return;
  }

  if (!sellers?.length) return;

  logger.info({ count: sellers.length }, 'Sellers elegíveis para cobrança automática');

  for (const seller of sellers) {
    try {
      // Busca dados do seller para o customer AbacatePay
      const { data: invite } = await supabase
        .from('onboarding_invites')
        .select('seller_name, seller_phone')
        .eq('seller_id', seller.seller_id)
        .eq('status', 'connected')
        .order('connected_at', { ascending: false })
        .limit(1)
        .single();

      const customer: SellerCustomer = {
        name:      invite?.seller_name ?? `Seller ${seller.seller_id}`,
        cellphone: invite?.seller_phone ?? null,
      };

      const reason = seller.credit_used >= seller.credit_limit ? 'limite_estourado' : 'fim_de_ciclo';

      await getOrCreatePendingCharge(
        seller.seller_id,
        (amountCents, cust) => createPixCharge(amountCents, cust ?? customer),
      );

      logger.info({ sellerId: seller.seller_id, reason }, 'Cobrança automática gerada');
    } catch (err: unknown) {
      // Não interrompe os outros sellers se um falhar
      logger.warn({ sellerId: seller.seller_id, err }, 'Erro ao gerar cobrança automática para seller');
    }
  }
}
