const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');

test('config uses public defaults, supports env overrides, and rejects privileged or incomplete settings', () => {
  const source = fs.readFileSync(path.join(root, 'api/config.js'), 'utf8');
  function request(env, method = 'GET') {
    const context = { module: { exports: {} }, process: { env }, Buffer, URL };
    vm.runInNewContext(source, context);
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    context.module.exports({ method }, res);
    return res;
  }
  const defaults = request({});
  assert.equal(defaults.code, 200);
  assert.equal(defaults.body.supabaseUrl, 'https://mdchapdbwekbeocgzeob.supabase.co');
  assert.ok(defaults.body.supabaseKey.startsWith('sb_publishable_'));
  assert.equal(request({ SUPABASE_URL: 'https://other.supabase.co' }).code, 503);
  assert.equal(request({ SUPABASE_ANON_KEY: 'sb_publishable_other' }).code, 503);
  assert.equal(request({}, 'POST').code, 405);
  const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'sb_publishable_test', SUPABASE_SERVICE_ROLE_KEY: 'private-value' };
  const result = request(env);
  assert.equal(result.code, 200);
  assert.equal(result.body.supabaseUrl, env.SUPABASE_URL);
  assert.equal(result.body.supabaseKey, env.SUPABASE_ANON_KEY);
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(JSON.stringify(result.body).includes('private-value'), false);
  env.SUPABASE_ANON_KEY = 'sb_secret_private';
  assert.equal(request(env).code, 503);
  const jwt = role => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
  env.SUPABASE_ANON_KEY = jwt('service_role');
  assert.equal(request(env).code, 503);
  env.SUPABASE_ANON_KEY = jwt('anon');
  assert.equal(request(env).code, 200);
});

function authHarness({ configured = true, confirmed = true } = {}) {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { value: '', hidden: false, handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; }, setAttribute() {}, removeAttribute() {}, showModal() { this.open = true; }, close() { this.open = false; this.handlers.close?.(); } });
    return nodes.get(id);
  };
  const calls = [];
  const session = { user: { email: 'member@example.com' } };
  let authListener;
  let failLogin = false;
  const auth = {
    onAuthStateChange(fn) { authListener = fn; },
    async getSession() { return { data: { session: null }, error: null }; },
    async signInWithPassword(credentials) { calls.push(['login', credentials]); return failLogin ? { error: { code: 'invalid_credentials' } } : { data: { session }, error: null }; },
    async signUp(credentials) { calls.push(['signup', credentials]); return { data: { session: confirmed ? session : null }, error: null }; },
    async signOut() { calls.push(['logout']); return { error: null }; }
  };
  const scripts = [...fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const context = vm.createContext({ document: { querySelector: node }, location: { protocol: 'https:', origin: 'https://todo.example' }, window: { supabase: { createClient: () => ({ auth }) } }, fetch: async () => ({ ok: configured, json: async () => ({ supabaseUrl: 'https://example.supabase.co', supabaseKey: 'sb_publishable_test' }) }), alert() {} });
  vm.runInContext(scripts.at(-1)[1], context);
  const ready = () => vm.runInContext('authReady', context);
  const click = id => node(id).handlers.click();
  const submit = () => node('#auth-form').handlers.submit({ preventDefault() {} });
  return { node, calls, ready, click, submit, session, emit: s => authListener('SIGNED_IN', s), fail: () => { failLogin = true; } };
}

test('login, session updates, sign out, and invalid credentials', async () => {
  const h = authHarness();
  await h.ready();
  h.click('#login-button');
  h.node('#auth-email').value = 'member@example.com';
  h.node('#auth-password').value = 'password123';
  await h.submit();
  assert.equal(h.calls[0][0], 'login');
  assert.equal(h.node('#account-email').textContent, 'member@example.com');
  assert.equal(h.node('#login-button').hidden, true);
  assert.equal(h.node('#auth-dialog').open, false);
  assert.equal(h.node('#auth-password').value, '');
  await h.click('#logout-button');
  assert.equal(h.node('#login-button').hidden, false);
  h.emit(h.session);
  assert.equal(h.node('#logout-button').hidden, false);
  h.fail();
  await h.submit();
  assert.match(h.node('#auth-message').textContent, /이메일 또는 비밀번호/);
  assert.equal(h.node('#auth-submit').disabled, false);
});

test('signup confirmation keeps user signed out and returns to login mode', async () => {
  const h = authHarness({ confirmed: false });
  await h.ready();
  h.click('#login-button');
  h.click('#auth-switch');
  assert.equal(h.node('#auth-password').autocomplete, 'new-password');
  h.node('#auth-password').value = 'password123';
  await h.submit();
  assert.equal(h.calls[0][0], 'signup');
  assert.equal(h.calls[0][1].options.emailRedirectTo, 'https://todo.example/');
  assert.match(h.node('#auth-message').textContent, /인증 메일/);
  assert.equal(h.node('#login-button').hidden, false);
  assert.equal(h.node('#auth-title').textContent, '로그인');
});

test('missing configuration shows a recoverable message', async () => {
  const h = authHarness({ configured: false });
  await h.ready();
  await h.submit();
  assert.match(h.node('#auth-message').textContent, /설정을 불러오지 못했습니다/);
  assert.equal(h.calls.length, 0);
  assert.equal(h.node('#auth-submit').disabled, false);
});
