import crypto from 'crypto';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { ShopeeTokenResponse, SellerToken } from '../types';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../lib/logger';

const SHOPEE_BASE_URL = 'https://partner.shopeemobile.com';

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new AppError(500, `Missing env var: ${key}`);
  return value;
}

export function generateShopeeSign(
  partnerId: string,
  path: string,
  timestamp: number,
  accessToken: string,
  shopId: string,
  partnerKey: string,
): string {
  const base = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  return crypto.createHmac('sha256', partnerKey).update(base).digest('hex');
}

export function buildShopeeAuthUrl(): string {
  const partnerId = getEnv('SHOPEE_PARTNER_ID');
  const partnerKey = getEnv('SHOPEE_PARTNER_KEY');
  const redirectUri = getEnv('SHOPEE_REDIRECT_URI');

  const path = '/api/v2/shop/auth_partner';
  const timestamp = Math.floor(Date.now() / 1000);
  const base = `${partnerId}${path}${timestamp}`;
  const sign = crypto.createHmac('sha256', partnerKey).update(base).digest('hex');

  const url = new URL(`${SHOPEE_BASE_URL}${path}`);
  url.searchParams.set('partner_id', partnerId);
  url.searchParams.set('timestamp', String(timestamp));
  url.searchParams.set('sign', sign);
  url.searchParams.set('redirect', redirectUri);
  return url.toString();
}

export async function exchangeShopeeCode(
  code: string,
  shopId: string,
): Promise<SellerToken> {
  const partnerId = getEnv('SHOPEE_PARTNER_ID');
  const partnerKey = getEnv('SHOPEE_PARTNER_KEY');

  const path = '/api/v2/auth/token/get';
  const timestamp = Math.floor(Date.now() / 1000);
  const base = `${partnerId}${path}${timestamp}`;
  const sign = crypto.createHmac('sha256', partnerKey).update(base).digest('hex');

  const { data } = await axios.post<ShopeeTokenResponse>(
    `${SHOPEE_BASE_URL}${path}`,
    { code, shop_id: Number(shopId), partner_id: Number(partnerId) },
    {
      params: { partner_id: partnerId, timestamp, sign },
      headers: { 'Content-Type': 'application/json' },
    },
  );

  if (data.error) throw new AppError(400, `Shopee error: ${data.message}`);

  const expiresAt = new Date(Date.now() + data.expire_in * 1000).toISOString();

  const { data: upserted, error } = await supabase
    .from('seller_tokens')
    .upsert(
      {
        seller_id: shopId,
        platform: 'shopee',
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt,
      },
      { onConflict: 'seller_id,platform' },
    )
    .select()
    .single();

  if (error) throw new AppError(500, `Supabase upsert error: ${error.message}`);
  logger.info({ sellerId: shopId, platform: 'shopee' }, 'Shopee token saved');
  return upserted as SellerToken;
}

export async function refreshShopeeToken(sellerId: string): Promise<SellerToken> {
  const { data: row, error: fetchError } = await supabase
    .from('seller_tokens')
    .select('*')
    .eq('seller_id', sellerId)
    .eq('platform', 'shopee')
    .single();

  if (fetchError || !row) throw new AppError(404, 'Seller token not found');

  const token = row as SellerToken;
  if (!token.refresh_token) throw new AppError(400, 'No refresh token available');

  const partnerId = getEnv('SHOPEE_PARTNER_ID');
  const partnerKey = getEnv('SHOPEE_PARTNER_KEY');

  const path = '/api/v2/auth/access_token/get';
  const timestamp = Math.floor(Date.now() / 1000);
  const base = `${partnerId}${path}${timestamp}`;
  const sign = crypto.createHmac('sha256', partnerKey).update(base).digest('hex');

  const { data } = await axios.post<ShopeeTokenResponse>(
    `${SHOPEE_BASE_URL}${path}`,
    {
      refresh_token: token.refresh_token,
      shop_id: Number(sellerId),
      partner_id: Number(partnerId),
    },
    {
      params: { partner_id: partnerId, timestamp, sign },
      headers: { 'Content-Type': 'application/json' },
    },
  );

  if (data.error) throw new AppError(400, `Shopee error: ${data.message}`);

  const expiresAt = new Date(Date.now() + data.expire_in * 1000).toISOString();

  const { data: updated, error } = await supabase
    .from('seller_tokens')
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt,
    })
    .eq('seller_id', sellerId)
    .eq('platform', 'shopee')
    .select()
    .single();

  if (error) throw new AppError(500, `Supabase update error: ${error.message}`);
  logger.info({ sellerId, platform: 'shopee' }, 'Shopee token refreshed');
  return updated as SellerToken;
}
