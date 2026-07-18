/* WeBot manual activation core
 * Device-local entitlement helper for WeBot.
 * Important: this runs entirely in the browser. The signature prevents accidental
 * edits but is not a substitute for server-side verification against determined users.
 */
(function(global){
  'use strict';

  const VERSION = 1;
  const PLAN_STORAGE_PREFIX = 'wp_webot_plan_state_v1';
  const ACTIVATION_META_KEY = 'wp_webot_manual_activation_v1';
  const USAGE_KEY = 'wp_webot_normal_ai_usage_v1';
  const PRODUCT_IDS = Object.freeze({
    supporter: 'prod_Uu9ZRH6bGs5MI3',
    pro: 'prod_Uu9ZVdDCLdxmos'
  });

  // Public browser-side integrity salt. This is intentionally not represented as
  // strong security because any frontend-only entitlement can be inspected.
  const INTEGRITY_SALT = [
    'WeatherPower', 'WeBot', 'StormCore', 'ManualActivation', '2026', 'V1'
  ].join('::');

  function normalizeEmail(value){
    return String(value || '').trim().toLowerCase();
  }

  function bytesToBase64Url(bytes){
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function base64UrlToBytes(value){
    const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }

  function textToBase64Url(value){
    return bytesToBase64Url(new TextEncoder().encode(String(value || '')));
  }

  function base64UrlToText(value){
    return new TextDecoder().decode(base64UrlToBytes(value));
  }

  async function sha256(value){
    if(!global.crypto?.subtle) throw new Error('This browser does not support secure hashing.');
    const bytes = new TextEncoder().encode(String(value || ''));
    return new Uint8Array(await global.crypto.subtle.digest('SHA-256', bytes));
  }

  async function shortHash(value, length=24){
    return bytesToBase64Url(await sha256(value)).slice(0, length);
  }

  async function emailHash(email){
    return shortHash(`email|${normalizeEmail(email)}`, 24);
  }

  async function signPayload(payloadText){
    return shortHash(`${INTEGRITY_SALT}|${payloadText}`, 24);
  }

  function randomNonce(){
    const bytes = new Uint8Array(9);
    global.crypto.getRandomValues(bytes);
    return bytesToBase64Url(bytes);
  }

  function planName(plan){
    return plan === 'pro' ? 'Fable Unlimited' : 'Supporter';
  }

  function planBadge(plan){
    return plan === 'pro' ? 'Fable 5' : 'Supporter';
  }

  function isValidPlan(plan){
    return plan === 'supporter' || plan === 'pro';
  }

  async function generateCode({email, plan, expiresAt, paymentReference=''}){
    const cleanEmail = normalizeEmail(email);
    if(!cleanEmail || !cleanEmail.includes('@')) throw new Error('Enter the customer email used at Stripe checkout.');
    if(!isValidPlan(plan)) throw new Error('Choose a paid WeBot plan.');

    const expiry = Number(expiresAt);
    if(!Number.isFinite(expiry) || expiry <= Date.now()) throw new Error('Choose an expiration date in the future.');

    const payload = {
      v: VERSION,
      e: await emailHash(cleanEmail),
      p: plan === 'pro' ? 'p' : 's',
      i: Math.floor(Date.now() / 1000),
      x: Math.floor(expiry / 1000),
      n: randomNonce(),
      r: String(paymentReference || '').trim().slice(-24)
    };
    const payloadText = textToBase64Url(JSON.stringify(payload));
    const signature = await signPayload(payloadText);
    return `WB${VERSION}-${payloadText}-${signature}`;
  }

  async function verifyCode(code, email){
    const cleanCode = String(code || '').trim().replace(/\s+/g, '');
    const cleanEmail = normalizeEmail(email);
    if(!cleanEmail || !cleanEmail.includes('@')) throw new Error('Enter the same email used during Stripe checkout.');

    const match = cleanCode.match(/^WB(\d+)-([A-Za-z0-9_-]+)-([A-Za-z0-9_-]+)$/);
    if(!match) throw new Error('That activation code format is not valid.');
    if(Number(match[1]) !== VERSION) throw new Error('This activation code uses an unsupported version.');

    const payloadText = match[2];
    const suppliedSignature = match[3];
    const expectedSignature = await signPayload(payloadText);
    if(suppliedSignature !== expectedSignature) throw new Error('The activation code is damaged or invalid.');

    let payload;
    try{
      payload = JSON.parse(base64UrlToText(payloadText));
    }catch(_){
      throw new Error('The activation code payload could not be read.');
    }

    const plan = payload.p === 'p' ? 'pro' : (payload.p === 's' ? 'supporter' : '');
    if(!isValidPlan(plan)) throw new Error('The activation code does not contain a valid plan.');

    const expectedEmailHash = await emailHash(cleanEmail);
    if(payload.e !== expectedEmailHash) throw new Error('This code was issued for a different email address.');

    const expiresAt = Number(payload.x) * 1000;
    const issuedAt = Number(payload.i) * 1000;
    if(!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new Error('This activation code has expired.');
    if(Number.isFinite(issuedAt) && issuedAt > Date.now() + 10 * 60 * 1000) throw new Error('This activation code has an invalid issue date.');

    return {
      code: cleanCode,
      email: cleanEmail,
      plan,
      planName: planName(plan),
      badge: planBadge(plan),
      issuedAt,
      expiresAt,
      paymentReference: String(payload.r || '')
    };
  }

  function findPlanStorageKeys(){
    const keys = new Set([PLAN_STORAGE_PREFIX]);
    try{
      for(let index = 0; index < localStorage.length; index += 1){
        const key = localStorage.key(index);
        if(key && key.startsWith(`${PLAN_STORAGE_PREFIX}_`)) keys.add(key);
      }
    }catch(_){ }
    return [...keys];
  }

  function installActivation(verified){
    if(!verified || !isValidPlan(verified.plan)) throw new Error('A verified activation is required.');
    const now = Date.now();
    const state = {
      plan: verified.plan,
      source: 'manual-code',
      productId: PRODUCT_IDS[verified.plan],
      purchaseToken: verified.code,
      expiresAt: verified.expiresAt,
      updatedAt: now
    };

    const keys = findPlanStorageKeys();
    let stored = 0;
    for(const key of keys){
      try{
        localStorage.setItem(key, JSON.stringify(state));
        stored += 1;
      }catch(_){ }
    }

    try{
      localStorage.setItem(ACTIVATION_META_KEY, JSON.stringify({
        email: verified.email,
        plan: verified.plan,
        planName: verified.planName,
        expiresAt: verified.expiresAt,
        activatedAt: now,
        paymentReference: verified.paymentReference,
        codeFingerprint: verified.code.slice(-12)
      }));
      localStorage.removeItem(USAGE_KEY);
    }catch(_){ }

    return { state, storageKeysUpdated: stored };
  }

  function readInstalledActivation(){
    try{
      return JSON.parse(localStorage.getItem(ACTIVATION_META_KEY) || 'null');
    }catch(_){
      return null;
    }
  }

  function clearManualActivation(){
    let cleared = 0;
    for(const key of findPlanStorageKeys()){
      try{
        const value = JSON.parse(localStorage.getItem(key) || 'null');
        if(value?.source === 'manual-code'){
          localStorage.removeItem(key);
          cleared += 1;
        }
      }catch(_){ }
    }
    try{ localStorage.removeItem(ACTIVATION_META_KEY); }catch(_){ }
    return cleared;
  }

  global.WebotActivation = Object.freeze({
    VERSION,
    PRODUCT_IDS,
    normalizeEmail,
    generateCode,
    verifyCode,
    installActivation,
    readInstalledActivation,
    clearManualActivation,
    planName,
    planBadge
  });
})(window);
