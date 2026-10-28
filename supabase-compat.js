/* Beray Eğitim — Supabase-only compatibility layer.
 * Provides the small Firestore/Auth-shaped API used by app.js while storing all data in Supabase.
 * There are no Firebase SDK imports or Firebase project dependencies in the runtime.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = 'https://rzdvezdccgkfzfpizwmj.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_yVs-2YKiVpZ2_wOmPZvdag_AzkxdABU';
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
if (typeof window !== 'undefined') window.supabaseClient = supabaseClient;

const clone = (v) => v == null ? v : JSON.parse(JSON.stringify(v));
const isObject = (v) => Boolean(v && typeof v === 'object' && !Array.isArray(v));

export class SupabaseTimestamp {
  constructor(seconds = Math.floor(Date.now() / 1000), nanoseconds = 0) {
    this.seconds = Number(seconds) || 0;
    this.nanoseconds = Number(nanoseconds) || 0;
  }
  toDate() { return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6)); }
  toJSON() { return { seconds: this.seconds, nanoseconds: this.nanoseconds }; }
}
function hydrate(value) {
  if (Array.isArray(value)) return value.map(hydrate);
  if (isObject(value)) {
    if (Number.isFinite(value.seconds) && Number.isFinite(value.nanoseconds)) {
      return new SupabaseTimestamp(value.seconds, value.nanoseconds);
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = hydrate(v);
    return out;
  }
  return value;
}
function getPath(obj, path) {
  return String(path || '').split('.').reduce((cur, key) => cur == null ? undefined : cur[key], obj);
}
function setPath(obj, path, value) {
  const keys = String(path || '').split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!isObject(cur[k]) && !Array.isArray(cur[k])) cur[k] = {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
}
function patchData(source, patch, replace = false) {
  const out = replace ? {} : { ...(source || {}) };
  for (const [k, v] of Object.entries(patch || {})) {
    if (k.includes('.')) setPath(out, k, clone(v));
    else out[k] = clone(v);
  }
  return out;
}
function errorFrom(error, fallback = 'Supabase işlemi başarısız.') {
  const e = new Error(error?.message || fallback);
  e.code = error?.code || error?.status || 'supabase_error';
  e.details = error?.details;
  e.hint = error?.hint;
  e.status = error?.status;
  return e;
}
function emitWrite(collectionName) {
  try { window.dispatchEvent(new CustomEvent('beray:supabase-write', { detail: { collection: collectionName } })); } catch (_) {}
}

let rawCurrentUser = null;
const normalizeUser = (user) => user ? ({
  ...user,
  uid: user.id,
  displayName: user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || '',
  photoURL: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
  emailVerified: Boolean(user.email_confirmed_at || user.confirmed_at),
}) : null;
export const auth = {};
Object.defineProperty(auth, 'currentUser', { enumerable: true, get: () => normalizeUser(rawCurrentUser) });
export const db = { provider: 'supabase' };
export const functions = { provider: 'supabase-edge-functions' };

supabaseClient.auth.onAuthStateChange((_event, session) => { rawCurrentUser = session?.user || null; });
supabaseClient.auth.getSession().then(({ data }) => { rawCurrentUser = data?.session?.user || rawCurrentUser; }).catch(() => {});

export function onAuthStateChanged(_auth, callback) {
  let active = true;
  const { data: listener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
    rawCurrentUser = session?.user || null;
    if (active) queueMicrotask(() => { if (active) callback(normalizeUser(rawCurrentUser)); });
  });
  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) console.warn('Supabase oturumu okunamadı:', error);
    rawCurrentUser = data?.session?.user || rawCurrentUser;
    if (active) callback(normalizeUser(rawCurrentUser));
  }).catch((e) => { if (active) console.warn('Supabase oturumu okunamadı:', e); });
  return () => { active = false; listener?.subscription?.unsubscribe(); };
}

export async function signInWithEmailAndPassword(_auth, email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw errorFrom(error, 'E-posta veya şifre hatalı.');
  rawCurrentUser = data?.user || data?.session?.user || null;
  return { user: normalizeUser(rawCurrentUser) };
}
export async function createUserWithEmailAndPassword(_auth, email, password, profile = {}) {
  const metadata = {};
  if (profile?.displayName) metadata.display_name = String(profile.displayName).trim().slice(0, 80);
  if (profile?.username) metadata.username = String(profile.username).trim().slice(0, 40);
  if (profile?.usernameLower) metadata.username_lower = String(profile.usernameLower).trim().toLowerCase().slice(0, 40);
  const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { data: metadata } });
  if (error) throw errorFrom(error, 'Hesap oluşturulamadı.');
  if (!data?.session) {
    // With email confirmation enabled, the SQL auth trigger has already prepared the safe starter profile.
    // The UI must not try authenticated writes before the user verifies their e-mail.
    return { user: data?.user ? normalizeUser(data.user) : null, needsEmailConfirmation: true };
  }
  rawCurrentUser = data.user || data.session.user;
  return { user: normalizeUser(rawCurrentUser), needsEmailConfirmation: false };
}
export async function updateProfile(user, profile) {
  const metadata = {};
  if (profile?.displayName != null) metadata.display_name = String(profile.displayName).slice(0, 80);
  if (profile?.photoURL != null) metadata.avatar_url = profile.photoURL;
  const { data, error } = await supabaseClient.auth.updateUser({ data: metadata });
  if (error) throw errorFrom(error, 'Profil bilgisi güncellenemedi.');
  rawCurrentUser = data?.user || rawCurrentUser;
  return { user: normalizeUser(rawCurrentUser) };
}
export async function sendPasswordResetEmail(_auth, email) {
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname.replace(/[^/]*$/, '')}index.html` });
  if (error) throw errorFrom(error, 'Şifre sıfırlama e-postası gönderilemedi.');
}
export async function signOut(_auth) {
  const { error } = await supabaseClient.auth.signOut();
  rawCurrentUser = null;
  if (error) throw errorFrom(error, 'Oturum kapatılamadı.');
}
export async function deleteUser(user) {
  const { data, error } = await supabaseClient.functions.invoke('education-actions', { body: { action: 'deleteSelf' } });
  if (error || data?.error) throw errorFrom(error || data, 'Hesap temizlenemedi.');
  if (user?.uid === rawCurrentUser?.id) rawCurrentUser = null;
}

export const serverTimestamp = () => new SupabaseTimestamp();

function docRef(collectionName, id) {
  const name = String(collectionName || '');
  const key = String(id || '');
  return {
    __kind: 'doc', collectionName: name, id: key,
    async get() {
      const { data, error } = await supabaseClient.from('education_records').select('id,data,updated_at').eq('collection_name', name).eq('id', key).maybeSingle();
      if (error) throw errorFrom(error);
      return new DocumentSnapshot(key, data?.data || {}, Boolean(data), data?.updated_at || null, this);
    },
    async set(value, options = {}) { await setDoc(this, value, options); return this; },
    async update(value) { await updateDoc(this, value); return this; },
    async delete() { await deleteDoc(this); return this; }
  };
}
export function collection(_db, name) { return { __kind: 'collection', collectionName: String(name || '') }; }
export function doc(_dbOrRef, nameOrId, maybeId) {
  if (_dbOrRef?.__kind === 'doc') return docRef(_dbOrRef.collectionName, `${_dbOrRef.id}/${nameOrId}`);
  if (maybeId !== undefined) return docRef(nameOrId, maybeId);
  throw new Error('Belge yolu geçersiz.');
}
export function where(field, op, value) { return { type: 'where', field: String(field), op, value }; }
export function orderBy(field, direction = 'asc') { return { type: 'orderBy', field: String(field), direction: direction === 'desc' ? 'desc' : 'asc' }; }
export function limit(count) { return { type: 'limit', count: Math.max(0, Number(count) || 0) }; }
export function query(ref, ...constraints) {
  const base = ref?.__kind === 'query' ? ref : { __kind: 'query', collectionName: ref?.collectionName, constraints: [] };
  return { ...base, constraints: [...(base.constraints || []), ...constraints] };
}

class DocumentSnapshot {
  constructor(id, data, exists, updatedAt, ref) { this.id = id; this._data = hydrate(data || {}); this._exists = Boolean(exists); this._updatedAt = updatedAt; this.ref = ref; }
  exists() { return this._exists; }
  data() { return clone(this._data); }
}
class QuerySnapshot {
  constructor(rows, collectionName) {
    this.docs = rows.map(r => new DocumentSnapshot(r.id, r.data, true, r.updated_at, docRef(collectionName, r.id)));
    this.empty = this.docs.length === 0;
    this.size = this.docs.length;
  }
  forEach(fn) { this.docs.forEach(fn); }
}
function valueForSort(v) {
  if (v instanceof SupabaseTimestamp) return v.seconds * 1000 + v.nanoseconds / 1e6;
  if (v && typeof v === 'object' && Number.isFinite(v.seconds)) return v.seconds * 1000;
  if (v == null) return '';
  const d = new Date(v);
  return !Number.isNaN(d.getTime()) && typeof v !== 'number' ? d.getTime() : v;
}
export async function getDoc(ref) { return ref.get(); }
export async function getDocs(ref) {
  const collectionName = ref?.collectionName;
  if (!collectionName) throw new Error('Koleksiyon yolu geçersiz.');
  const constraints = ref.__kind === 'query' ? ref.constraints || [] : [];
  let request = supabaseClient.from('education_records').select('id,data,updated_at').eq('collection_name', collectionName).order('updated_at', { ascending: false }).limit(1000);
  const serverSafe = /^[A-Za-z0-9_]+$/;
  for (const c of constraints) {
    if (c.type === 'where' && c.op === '==' && serverSafe.test(c.field) && (typeof c.value === 'string' || typeof c.value === 'number' || typeof c.value === 'boolean')) {
      request = request.eq(`data->>${c.field}`, String(c.value));
    }
  }
  const { data, error } = await request;
  if (error) throw errorFrom(error);
  let rows = (data || []).map(r => ({ ...r, data: hydrate(r.data || {}) }));
  for (const c of constraints) {
    if (c.type === 'where') {
      rows = rows.filter(row => {
        const current = getPath(row.data, c.field);
        if (c.op === '==') return current === c.value || String(current ?? '') === String(c.value ?? '');
        if (c.op === '!=') return current !== c.value;
        if (c.op === 'in' && Array.isArray(c.value)) return c.value.includes(current);
        if (c.op === 'array-contains' && Array.isArray(current)) return current.some(v => JSON.stringify(v) === JSON.stringify(c.value));
        return false;
      });
    }
  }
  const sort = constraints.filter(c => c.type === 'orderBy').slice(-1)[0];
  if (sort) rows.sort((a, b) => {
    const av = valueForSort(getPath(a.data, sort.field));
    const bv = valueForSort(getPath(b.data, sort.field));
    if (av === bv) return 0;
    return (av < bv ? -1 : 1) * (sort.direction === 'desc' ? -1 : 1);
  });
  const lim = constraints.filter(c => c.type === 'limit').slice(-1)[0];
  if (lim) rows = rows.slice(0, lim.count);
  return new QuerySnapshot(rows, collectionName);
}
export async function setDoc(ref, value, options = {}) {
  let payload = clone(value || {});
  if (options.merge) {
    const old = await ref.get();
    payload = { ...(old.exists() ? old.data() : {}), ...payload };
  }
  const row = { collection_name: ref.collectionName, id: ref.id, data: payload };
  const { error } = await supabaseClient.from('education_records').upsert(row, { onConflict: 'collection_name,id' });
  if (error) throw errorFrom(error, 'Kayıt kaydedilemedi. Supabase izinlerini kontrol et.');
  emitWrite(ref.collectionName);
}
export async function updateDoc(ref, patch) {
  const old = await ref.get();
  if (!old.exists()) { const e = new Error('Kayıt bulunamadı.'); e.code = 'not-found'; throw e; }
  const next = patchData(old.data(), patch);
  const { error } = await supabaseClient.from('education_records').update({ data: next }).eq('collection_name', ref.collectionName).eq('id', ref.id);
  if (error) throw errorFrom(error, 'Kayıt güncellenemedi.');
  emitWrite(ref.collectionName);
}
export async function addDoc(ref, value) {
  const id = crypto.randomUUID();
  const target = docRef(ref.collectionName, id);
  await setDoc(target, value);
  return target;
}
export async function deleteDoc(ref) {
  const { error } = await supabaseClient.from('education_records').delete().eq('collection_name', ref.collectionName).eq('id', ref.id);
  if (error) throw errorFrom(error, 'Kayıt silinemedi.');
  emitWrite(ref.collectionName);
}
export async function runTransaction(_db, callback) {
  // Supabase PostgREST does not offer client-side multi-statement transactions.
  // SQL uniqueness constraints and RLS remain the authority; queued writes run after reads.
  const operations = [];
  const tx = {
    get: async (ref) => ref.get(),
    set: (ref, value, options = {}) => operations.push(() => setDoc(ref, value, options)),
    update: (ref, value) => operations.push(() => updateDoc(ref, value)),
    delete: (ref) => operations.push(() => deleteDoc(ref)),
  };
  const result = await callback(tx);
  for (const operation of operations) await operation();
  return result;
}

export function httpsCallable(_functions, name) {
  return async (payload = {}) => {
    const { data, error } = await supabaseClient.functions.invoke('education-actions', { body: { action: String(name), ...payload } });
    let result = data;
    if (error) {
      // Supabase's FunctionsHttpError carries the JSON response in context; preserve the real server error.
      try {
        const context = error.context;
        if (context && typeof context.clone === 'function') {
          const body = await context.clone().json();
          if (body?.error) result = body;
        }
      } catch (_) { /* Fall back to the SDK's error. */ }
      if (result?.error) {
        const e = new Error(result.error.message || String(result.error));
        e.code = result.error.code || 'education_action_failed';
        e.status = error.status || error.context?.status;
        throw e;
      }
      throw errorFrom(error, 'Supabase Eğitim işlemi tamamlanamadı.');
    }
    if (result?.error) {
      const e = new Error(result.error.message || String(result.error));
      e.code = result.error.code || 'education_action_failed';
      throw e;
    }
    return { data: result?.data !== undefined ? result.data : result };
  };
}
