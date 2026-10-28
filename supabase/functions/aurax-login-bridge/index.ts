import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const AURAX_URL = 'https://zblbsjmtituericpmazj.supabase.co';
const AURAX_PUBLISHABLE_KEY = 'sb_publishable_0XUjb6u_goYIjSB6m7vYsQ_hpyI0Az7';
const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
});
class BridgeError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}
const clean = (v: unknown, max = 500) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const timestamp = () => ({ seconds: Math.floor(Date.now() / 1000), nanoseconds: (Date.now() % 1000) * 1_000_000 });
const recordRow = (collection_name: string, id: string, data: Record<string, unknown>) => ({ collection_name, id, data });

if (!SUPABASE_URL || !SERVICE_KEY) console.error('aurax-login-bridge: Beray Supabase ortam değişkenleri eksik.');
const admin = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function getRecord(service: ReturnType<typeof createClient>, collection: string, id: string) {
  const { data, error } = await service.from('education_records').select('id,data,updated_at')
    .eq('collection_name', collection).eq('id', id).maybeSingle();
  if (error) throw new BridgeError(500, 'database-read-failed', error.message || 'Beray profili okunamadı.');
  return data ? { id: String(data.id), data: (data.data || {}) as Record<string, any> } : null;
}
async function writeRecord(service: ReturnType<typeof createClient>, collection: string, id: string, data: Record<string, any>) {
  const { error } = await service.from('education_records').upsert(recordRow(collection, id, data), { onConflict: 'collection_name,id' });
  if (error) throw new BridgeError(500, 'database-write-failed', error.message || 'Beray profili kaydedilemedi.');
}
async function findAuthUserByEmail(service: ReturnType<typeof createClient>, email: string) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new BridgeError(500, 'account-lookup-failed', error.message || 'Beray hesabı aranamadı.');
    const found = (data.users || []).find((user: any) => String(user.email || '').toLowerCase() === email.toLowerCase());
    if (found) return found as Record<string, any>;
    if ((data.users || []).length < 1000) return null;
  }
  return null;
}

async function createBridgeSession(body: Record<string, any>) {
  const service = admin();
  const auraAccessToken = clean(body.auraAccessToken, 6000);
  const requestedUsername = clean(body.username, 40);
  if (!auraAccessToken || auraAccessToken.length < 40 || !requestedUsername) {
    throw new BridgeError(401, 'aura-token-missing', 'Aura X oturumu doğrulanamadı. Tekrar giriş yap.');
  }

  // Verify the token against Aura X; never trust a username sent by the browser alone.
  const authResponse = await fetch(`${AURAX_URL}/auth/v1/user`, {
    headers: { apikey: AURAX_PUBLISHABLE_KEY, Authorization: `Bearer ${auraAccessToken}` }
  });
  const auraUser = await authResponse.json().catch(() => ({}));
  if (!authResponse.ok || !auraUser?.id) {
    throw new BridgeError(401, 'aura-session-invalid', 'Aura X oturumu geçersiz veya süresi dolmuş. Yeniden giriş yap.');
  }

  // Resolve the actual username from Aura X's authenticated profile.
  const profileResponse = await fetch(`${AURAX_URL}/rest/v1/rpc/aurax_get_linked_profile`, {
    method: 'POST',
    headers: {
      apikey: AURAX_PUBLISHABLE_KEY,
      Authorization: `Bearer ${auraAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: '{}'
  });
  const auraProfile = await profileResponse.json().catch(() => null);
  if (!profileResponse.ok || !auraProfile || typeof auraProfile.username !== 'string' || !auraProfile.username.trim()) {
    throw new BridgeError(503, 'aura-profile-unavailable', 'Aura X profili doğrulanamadı. Aura X bağlantı SQL kurulumunu kontrol et.');
  }
  const username = clean(auraProfile.username, 40);
  if (username.toLowerCase() !== requestedUsername.toLowerCase()) {
    throw new BridgeError(401, 'aura-user-mismatch', 'Giriş yapılan Aura X kullanıcı adı doğrulanamadı.');
  }

  const auraUid = String(auraUser.id);
  const email = `aurax-${auraUid.replace(/-/g, '')}@bridge.beray.invalid`;
  const mapping = await getRecord(service, 'auraxAuthLinks', auraUid);
  let berayUser: Record<string, any> | null = null;

  if (mapping?.data?.berayUid) {
    const existing = await service.auth.admin.getUserById(String(mapping.data.berayUid));
    if (!existing.error && existing.data?.user) berayUser = existing.data.user as Record<string, any>;
  }

  if (!berayUser) {
    const bridgePassword = `${crypto.randomUUID()}-${crypto.randomUUID()}-Aa9!`;
    const created = await service.auth.admin.createUser({
      email,
      password: bridgePassword,
      email_confirm: true,
      user_metadata: {
        provider: 'aurax',
        aurax_uid: auraUid,
        username,
        display_name: clean(auraProfile.displayName || auraProfile.name || username, 80)
      }
    });
    if (!created.error && created.data?.user) {
      berayUser = created.data.user as Record<string, any>;
    } else {
      // Repair a prior partial run if the Auth user exists but its mapping row was not written.
      berayUser = await findAuthUserByEmail(service, email);
      if (!berayUser) throw new BridgeError(500, 'beray-account-create-failed', created.error?.message || 'Beray giriş hesabı oluşturulamadı.');
    }
  }

  const berayUid = String(berayUser.id);
  const name = clean(auraProfile.displayName || auraProfile.name || username, 80) || username;
  const previousProfile = await getRecord(service, 'users', berayUid);
  const old = previousProfile?.data || {};

  // Keep existing educational progress and role. A brand-new linked account is a student.
  await writeRecord(service, 'users', berayUid, {
    ...old,
    uid: berayUid,
    name: clean(old.name || name, 80),
    username,
    usernameLower: username.toLowerCase(),
    auraxUsername: username,
    auraxUid: auraUid,
    provider: 'aurax',
    role: ['student', 'teacher', 'admin'].includes(String(old.role || '')) ? old.role : 'student',
    points: Number.isFinite(Number(old.points)) ? Number(old.points) : 0,
    completedLessons: Array.isArray(old.completedLessons) ? old.completedLessons : [],
    completedTests: Array.isArray(old.completedTests) ? old.completedTests : [],
    avatarId: clean(old.avatarId || 'owl-blue', 40),
    createdAt: old.createdAt || timestamp()
  });
  await writeRecord(service, 'auraxAuthLinks', auraUid, {
    auraxUid: auraUid,
    berayUid,
    username,
    email,
    createdAt: mapping?.data?.createdAt || timestamp(),
    updatedAt: timestamp()
  });

  const generated = await service.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = generated.data?.properties?.hashed_token;
  if (generated.error || !tokenHash) {
    throw new BridgeError(500, 'beray-session-create-failed', generated.error?.message || 'Beray oturumu oluşturulamadı.');
  }
  return { email, tokenHash };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: { code: 'method_not_allowed', message: 'Yalnızca POST kabul edilir.' } }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: { code: 'server_configuration', message: 'Beray Supabase ortam değişkenleri eksik.' } }, 500);
  try {
    const body = await req.json().catch(() => ({}));
    const data = await createBridgeSession(body || {});
    return json({ data });
  } catch (error) {
    const e = error instanceof BridgeError ? error : new BridgeError(500, 'internal', (error as any)?.message || 'Beklenmeyen bağlantı hatası.');
    console.error('aurax-login-bridge:', e.code, e.message);
    return json({ error: { code: e.code, message: e.message } }, e.status);
  }
});
