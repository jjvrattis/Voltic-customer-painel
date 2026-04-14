import axios, { AxiosError } from 'axios';
import { supabase } from '../lib/supabase';
import { MLTokenResponse, SellerToken } from '../types';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../lib/logger';

const ML_BASE_URL = 'https://api.mercadolibre.com';
const ML_AUTH_URL = 'https://auth.mercadolivre.com.br';

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new AppError(500, `Missing env var: ${key}`);
  return value;
}

export function buildMLAuthUrl(state?: string): string {
  const appId = getEnv('ML_APP_ID');
  const redirectUri = getEnv('ML_REDIRECT_URI');
  const url = new URL(`${ML_AUTH_URL}/authorization`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('redirect_uri', redirectUri);
  if (state) url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeMLCode(code: string): Promise<SellerToken> {
  const appId = getEnv('ML_APP_ID');
  const clientSecret = getEnv('ML_CLIENT_SECRET');
  const redirectUri = getEnv('ML_REDIRECT_URI');

  const { data } = await axios.post<MLTokenResponse>(
    `${ML_BASE_URL}/oauth/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: appId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  const sellerId = String(data.user_id);

  const { data: upserted, error } = await supabase
    .from('seller_tokens')
    .upsert(
      {
        seller_id: sellerId,
        platform: 'mercadolivre',
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt,
      },
      { onConflict: 'seller_id,platform' },
    )
    .select()
    .single();

  if (error) throw new AppError(500, `Supabase upsert error: ${error.message}`);
  logger.info({ sellerId, platform: 'mercadolivre' }, 'ML token saved');
  return upserted as SellerToken;
}

export async function refreshMLToken(sellerId: string): Promise<SellerToken> {
  const { data: row, error: fetchError } = await supabase
    .from('seller_tokens')
    .select('*')
    .eq('seller_id', sellerId)
    .eq('platform', 'mercadolivre')
    .single();

  if (fetchError || !row) throw new AppError(404, 'Seller token not found');

  const token = row as SellerToken;
  if (!token.refresh_token) throw new AppError(400, 'No refresh token available');

  const appId = getEnv('ML_APP_ID');
  const clientSecret = getEnv('ML_CLIENT_SECRET');

  let tokenData: MLTokenResponse;
  try {
    const { data } = await axios.post<MLTokenResponse>(
      `${ML_BASE_URL}/oauth/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: appId,
        client_secret: clientSecret,
        refresh_token: token.refresh_token,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    tokenData = data;
  } catch (err) {
    const axiosErr = err as AxiosError<{ message?: string; error?: string }>;
    const mlMsg = axiosErr.response?.data?.message ?? axiosErr.response?.data?.error ?? axiosErr.message;
    throw new AppError(axiosErr.response?.status ?? 502, `ML token refresh failed: ${mlMsg}`);
  }

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  const { data: updated, error } = await supabase
    .from('seller_tokens')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
    })
    .eq('seller_id', sellerId)
    .eq('platform', 'mercadolivre')
    .select()
    .single();

  if (error) throw new AppError(500, `Supabase update error: ${error.message}`);
  logger.info({ sellerId, platform: 'mercadolivre' }, 'ML token refreshed');
  return updated as SellerToken;
}
