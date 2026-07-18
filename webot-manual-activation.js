/* Drop-in manual subscription activation UI for WeBot.
 * Load after webot-activation-core.js and after the main WeBot markup.
 */
(function(){
  'use strict';

  const STYLE_ID = 'webot-manual-activation-styles';
  const MODAL_ID = 'webotManualActivationBack';
  const PENDING_KEY = 'wp_webot_pending_activation_v1';

  function escapeHtml(value){
    return String(value || '').replace(/[&<>'"]/g, char => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
    })[char]);
  }

  function formatDate(timestamp){
    if(!timestamp) return 'Unknown';
    try{
      return new Intl.DateTimeFormat(undefined, {
        month:'short', day:'numeric', year:'numeric'
      }).format(new Date(timestamp));
    }catch(_){
      return new Date(timestamp).toLocaleDateString();
    }
  }

  function addStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .manualActivationNotice{margin-top:10px;padding:11px 12px;border-radius:12px;border:1px solid rgba(245,158,11,.34);background:rgba(245,158,11,.09);color:#fde68a;font-size:12px;line-height:1.5}
      .manualActivationNotice strong{color:#fff}
      .manualActivationAction{width:100%;min-height:42px;margin-top:9px;border-radius:10px;border:1px solid rgba(232,168,124,.34);background:rgba(232,168,124,.10);color:#f5f4ee;font:700 13px Inter,system-ui,sans-serif;cursor:pointer}
      .manualActivationAction:hover{background:rgba(232,168,124,.16)}
      .manualActivationBack{position:fixed;inset:0;z-index:500;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.72);backdrop-filter:blur(16px)}
      .manualActivationBack.open{display:flex}
      .manualActivationModal{width:min(100%,470px);max-height:min(86vh,760px);overflow:auto;border:1px solid rgba(255,255,255,.14);border-radius:22px;background:linear-gradient(180deg,#292825,#1d1c1a);color:#f5f4ee;box-shadow:0 30px 100px rgba(0,0,0,.72);padding:19px}
      .manualActivationTop{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      .manualActivationEyebrow{font:800 11px 'Barlow Condensed',Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#e8a87c}
      .manualActivationTitle{margin-top:4px;font:900 25px 'Barlow Condensed',Inter,sans-serif;letter-spacing:.02em}
      .manualActivationClose{width:34px;height:34px;border-radius:9px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);color:#aaa;cursor:pointer}
      .manualActivationText{margin-top:9px;color:#aaa7a0;font-size:13px;line-height:1.55}
      .manualActivationWarning{margin-top:13px;padding:11px;border:1px solid rgba(245,158,11,.30);border-radius:12px;background:rgba(245,158,11,.08);color:#fde68a;font-size:12px;line-height:1.5}
      .manualActivationField{display:grid;gap:6px;margin-top:13px}
      .manualActivationField label{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#aaa7a0}
      .manualActivationInput{width:100%;min-height:43px;border-radius:11px;border:1px solid rgba(255,255,255,.14);background:#30302e;color:#f5f4ee;padding:10px 12px;font:500 13px Inter,system-ui,sans-serif;outline:none}
      textarea.manualActivationInput{min-height:90px;resize:vertical;line-height:1.5;word-break:break-all}
      .manualActivationInput:focus{border-color:rgba(232,168,124,.55);box-shadow:0 0 0 3px rgba(232,168,124,.10)}
      .manualActivationButtons{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:14px}
      .manualActivationBtn{min-height:43px;border-radius:11px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#f5f4ee;padding:0 14px;font:800 13px Inter,system-ui,sans-serif;cursor:pointer}
      .manualActivationBtn.primary{border-color:transparent;background:linear-gradient(135deg,#d97757,#e8a87c);color:#fff5eb}
      .manualActivationBtn:disabled{opacity:.5;cursor:not-allowed}
      .manualActivationStatus{display:none;margin-top:13px;padding:11px 12px;border-radius:12px;font-size:12px;line-height:1.5}
      .manualActivationStatus.show{display:block}
      .manualActivationStatus.ok{border:1px solid rgba(34,197,94,.34);background:rgba(34,197,94,.09);color:#86efac}
      .manualActivationStatus.bad{border:1px solid rgba(239,68,68,.34);background:rgba(239,68,68,.09);color:#fca5a5}
      .manualActivationCurrent{margin-top:13px;padding:11px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.035);font-size:12px;color:#aaa7a0;line-height:1.5}
      @media(max-width:560px){.manualActivationBack{align-items:flex-end;padding:0}.manualActivationModal{width:100%;max-height:92vh;border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px))}.manualActivationButtons{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function createModal(){
    if(document.getElementById(MODAL_ID)) return document.getElementById(MODAL_ID);
    const back = document.createElement('div');
    back.className = 'manualActivationBack';
    back.id = MODAL_ID;
    back.setAttribute('role','dialog');
    back.setAttribute('aria-modal','true');
    back.innerHTML = `
      <div class="manualActivationModal">
        <div class="manualActivationTop">
          <div>
            <div class="manualActivationEyebrow">WeBot subscription</div>
            <div class="manualActivationTitle">Enter activation code</div>
          </div>
          <button class="manualActivationClose" type="button" aria-label="Close">✕</button>
        </div>
        <div class="manualActivationText">After you subscribe through Stripe, WeatherPower manually checks the payment and sends an activation code. Enter it below on the device where you use WeBot.</div>
        <div class="manualActivationWarning"><strong>Activation can take up to 2 days.</strong> Use the exact email address entered during Stripe checkout. Opening WeBot and signing in on this device before redeeming helps attach the plan to the correct local account.</div>
        <div class="manualActivationField">
          <label for="manualActivationEmail">Stripe checkout email</label>
          <input class="manualActivationInput" id="manualActivationEmail" type="email" autocomplete="email" placeholder="name@example.com">
        </div>
        <div class="manualActivationField">
          <label for="manualActivationCode">Activation code</label>
          <textarea class="manualActivationInput" id="manualActivationCode" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="WB1-..."></textarea>
        </div>
        <div class="manualActivationButtons">
          <button class="manualActivationBtn primary" id="manualActivationRedeem" type="button">Activate subscription</button>
          <button class="manualActivationBtn" id="manualActivationCancel" type="button">Cancel</button>
        </div>
        <div class="manualActivationStatus" id="manualActivationStatus"></div>
        <div class="manualActivationCurrent" id="manualActivationCurrent"></div>
      </div>
    `;
    document.body.appendChild(back);

    const close = () => back.classList.remove('open');
    back.querySelector('.manualActivationClose')?.addEventListener('click', close);
    back.querySelector('#manualActivationCancel')?.addEventListener('click', close);
    back.addEventListener('click', event => { if(event.target === back) close(); });
    document.addEventListener('keydown', event => { if(event.key === 'Escape') close(); });
    back.querySelector('#manualActivationRedeem')?.addEventListener('click', redeem);
    return back;
  }

  function setStatus(message, ok){
    const status = document.getElementById('manualActivationStatus');
    if(!status) return;
    status.className = `manualActivationStatus show ${ok ? 'ok' : 'bad'}`;
    status.innerHTML = message;
  }

  function updateCurrent(){
    const current = document.getElementById('manualActivationCurrent');
    if(!current || !window.WebotActivation) return;
    const activation = window.WebotActivation.readInstalledActivation();
    if(!activation){
      current.innerHTML = '<strong>Current device:</strong> no manually activated plan found.';
      return;
    }
    current.innerHTML = `<strong>Current device:</strong> ${escapeHtml(window.WebotActivation.planName(activation.plan))} is stored locally until <strong>${escapeHtml(formatDate(activation.expiresAt))}</strong>. Clearing browser data or switching devices removes this activation.`;
  }

  async function redeem(){
    const button = document.getElementById('manualActivationRedeem');
    const email = document.getElementById('manualActivationEmail')?.value || '';
    const code = document.getElementById('manualActivationCode')?.value || '';
    if(!window.WebotActivation){
      setStatus('The activation helper did not load. Refresh WeBot and try again.', false);
      return;
    }
    button.disabled = true;
    button.textContent = 'Checking code…';
    try{
      const verified = await window.WebotActivation.verifyCode(code, email);
      const result = window.WebotActivation.installActivation(verified);
      try{ localStorage.removeItem(PENDING_KEY); }catch(_){ }
      setStatus(`<strong>${escapeHtml(verified.planName)} activated.</strong> Access is stored on this browser until ${escapeHtml(formatDate(verified.expiresAt))}. Updated ${result.storageKeysUpdated} local WeBot account slot${result.storageKeysUpdated === 1 ? '' : 's'}. WeBot will reload now.`, true);
      updateCurrent();
      setTimeout(() => window.location.reload(), 1700);
    }catch(error){
      setStatus(escapeHtml(error?.message || 'The activation code could not be verified.'), false);
    }finally{
      button.disabled = false;
      button.textContent = 'Activate subscription';
    }
  }

  function openActivation(){
    const back = createModal();
    const accountEmail = document.getElementById('accountEmail')?.value || '';
    const input = document.getElementById('manualActivationEmail');
    if(input && !input.value) input.value = accountEmail;
    updateCurrent();
    const status = document.getElementById('manualActivationStatus');
    if(status) status.className = 'manualActivationStatus';
    back.classList.add('open');
    setTimeout(() => input?.focus(), 60);
  }

  function installBillingNotice(){
    const actions = document.querySelector('.billingActions');
    if(actions && !document.getElementById('manualActivationBillingNotice')){
      const wrapper = document.createElement('div');
      wrapper.id = 'manualActivationBillingNotice';
      wrapper.style.gridColumn = '1 / -1';
      wrapper.innerHTML = `
        <div class="manualActivationNotice"><strong>Manual activation:</strong> after Stripe payment, your plan is reviewed by WeatherPower. Activation can take up to 2 days.</div>
        <button class="manualActivationAction" type="button">I have an activation code</button>
      `;
      wrapper.querySelector('button')?.addEventListener('click', openActivation);
      actions.appendChild(wrapper);
    }

    const restore = document.getElementById('billingRestoreBtn');
    if(restore && !restore.dataset.manualActivationBound){
      restore.dataset.manualActivationBound = 'true';
      restore.textContent = 'Enter activation code';
      restore.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        openActivation();
      }, true);
    }

    const settingsRestore = document.getElementById('restorePurchasesBtn');
    if(settingsRestore && !settingsRestore.dataset.manualActivationBound){
      settingsRestore.dataset.manualActivationBound = 'true';
      settingsRestore.textContent = '🔑 Enter activation code';
      settingsRestore.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        openActivation();
      }, true);
    }
  }

  function rememberPendingPurchase(){
    const primary = document.getElementById('billingPrimaryBtn');
    if(!primary || primary.dataset.manualPendingBound) return;
    primary.dataset.manualPendingBound = 'true';
    primary.addEventListener('click', () => {
      const selected = document.querySelector('#planGrid [data-plan].active')?.getAttribute('data-plan');
      if(selected !== 'supporter' && selected !== 'pro') return;
      const email = document.getElementById('accountEmail')?.value || '';
      try{
        localStorage.setItem(PENDING_KEY, JSON.stringify({
          plan: selected,
          email: String(email || '').trim().toLowerCase(),
          startedAt: Date.now(),
          notice: 'Activation can take up to 2 days.'
        }));
      }catch(_){ }
    }, true);
  }

  function updatePlanWording(){
    const hint = document.getElementById('planManageHint');
    const activation = window.WebotActivation?.readInstalledActivation?.();
    if(hint){
      if(activation && activation.expiresAt > Date.now()){
        hint.textContent = `${window.WebotActivation.planName(activation.plan)} was activated by code on this device through ${formatDate(activation.expiresAt)}.`;
      }else{
        hint.textContent = 'Stripe purchases are manually reviewed. Activation codes can take up to 2 days and are stored on this device.';
      }
    }
    const badge = document.getElementById('billingSourceBadge');
    if(badge && activation && activation.expiresAt > Date.now()) badge.textContent = 'Activation code';
  }

  function init(){
    addStyles();
    createModal();
    installBillingNotice();
    rememberPendingPurchase();
    updatePlanWording();

    // The main app rerenders billing labels, so gently restore manual wording.
    const observer = new MutationObserver(() => {
      installBillingNotice();
      rememberPendingPurchase();
      updatePlanWording();
    });
    observer.observe(document.body, { childList:true, subtree:true, characterData:true });

    window.openWebotActivation = openActivation;
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
