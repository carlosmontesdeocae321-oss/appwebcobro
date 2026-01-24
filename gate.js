// gate.js - público. Inserta un card discreto en páginas que tengan loader configurado.
(function(){
  try{
    const scriptEl = document.currentScript || (function(){
      const scripts = document.getElementsByTagName('script'); return scripts[scripts.length-1];
    })();

    const appId = scriptEl && scriptEl.getAttribute && scriptEl.getAttribute('data-app-id');
    const registryUrl = scriptEl && scriptEl.getAttribute && scriptEl.getAttribute('data-registry');
    const pollMs = scriptEl && parseInt(scriptEl.getAttribute('data-poll-interval-ms'),10) || 0;
    // support a local debug/force flag so we can test visibility without changing registry
    const FORCE_PARAM = (function(){ try{ return new URLSearchParams(window.location.search).get('pwcb_force') === '1'; }catch(e){ return false; }})();
    const FORCE_LS = (function(){ try{ return localStorage.getItem('pwcb.force.show') === '1'; }catch(e){ return false; }})();
    const FORCE_SHOW = FORCE_PARAM || FORCE_LS;
    if (typeof console !== 'undefined' && console.info) console.info('gate.js: init', {appId, registryUrl, pollMs, FORCE_SHOW});
    if(!appId || !registryUrl) return;

    const LS_DISMISS_KEY = 'pwcb.dismiss.' + appId;

    async function fetchRegistry(){
      try{
        const r = await fetch(registryUrl, {cache:'no-store'});
        if(!r.ok) throw new Error('fetch failed');
        const j = await r.json();
        if (typeof console !== 'undefined' && console.info) console.info('gate.js: fetchRegistry OK', j);
        return j;
      }catch(e){ return null; }
    }

    function shouldShow(app){
      if(!app || !app.enabled) return false;
      try{ const v = localStorage.getItem(LS_DISMISS_KEY); if(v==='1') return false; }catch(e){}
      return true;
    }

    function createCard(app){
      const card = document.createElement('div');
      card.className = 'pwcb-card';
      card.setAttribute('role','dialog');
      card.style.display = 'none';

      const icon = document.createElement('div'); icon.className = 'pwcb-icon'; icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v4" stroke="#8a4f00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 17h.01" stroke="#8a4f00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.29 3.86L1.82 18.07a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#8a4f00" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

      const content = document.createElement('div'); content.className = 'pwcb-content';
      const title = document.createElement('div'); title.className = 'pwcb-title'; title.textContent = app.name || 'Notificación';
      // show payment deadline when available
      const msg = document.createElement('div'); msg.className = 'pwcb-msg';
      // prefer site config if present
      let deadlineText = '';
      try{
        const cfg = window.BILLING_GATE_CONFIG;
        if(cfg && cfg.expirationDate){
          const d = new Date(cfg.expirationDate + 'T23:59:59');
          deadlineText = d.toLocaleDateString();
        }
      }catch(e){ /* ignore */ }
      if(!deadlineText && app.expirationDate){
        try{ const d = new Date(app.expirationDate + 'T23:59:59'); deadlineText = d.toLocaleDateString(); }catch(e){}
      }
      if(deadlineText){
        msg.textContent = 'Plazo límite de pago: ' + deadlineText;
      } else {
        msg.textContent = 'Falta de pago. Por favor envía el comprobante para reactivar la página.';
      }

      const actions = document.createElement('div'); actions.className = 'pwcb-actions';
      const wa = document.createElement('a'); wa.className = 'pwcb-btn primary'; wa.href = app.whatsapp || '#'; wa.target = '_blank'; wa.rel='noopener noreferrer'; wa.textContent = 'Contactar';
      const close = document.createElement('button'); close.className = 'pwcb-btn close'; close.textContent = 'Cerrar';
      close.addEventListener('click', ()=>{ card.style.display='none'; });

      actions.appendChild(wa); actions.appendChild(close);

      content.appendChild(title); content.appendChild(msg); content.appendChild(actions);
      card.appendChild(icon); card.appendChild(content);
      return card;
    }

    function createToggleButton(){
      const btn = document.createElement('button');
      btn.className = 'pwcb-toggle';
      btn.setAttribute('aria-label','Mostrar información');
      btn.textContent = '!';
      return btn;
    }



    let currentCard = null;

    async function update(){
      const reg = await fetchRegistry();
      if(!reg || !Array.isArray(reg.apps)) return;
      var app = reg.apps.find(a=>a.id===appId);
      if (typeof console !== 'undefined' && console.info) console.info('gate.js: registry lookup', {found: !!app, app: app, FORCE_SHOW: FORCE_SHOW});
      // if FORCE_SHOW is true, allow showing a fallback card even if registry says disabled
      if(!shouldShow(app) && !FORCE_SHOW){
        if(currentCard){ currentCard.remove(); currentCard=null; }
        return;
      }
      if(!app && FORCE_SHOW){
        app = { id: appId, name: appId, message: '[FORCE] Mensaje de prueba (forzado)', whatsapp: '#' };
      }
      // ensure wrapper and toggle button exist so the '!' is always visible while the app is present
      var wrapper = document.querySelector('.pwcb-wrapper');
      if(!wrapper){ wrapper = document.createElement('div'); wrapper.className = 'pwcb-wrapper'; wrapper.style.position='fixed'; wrapper.style.right='12px'; wrapper.style.bottom='12px'; wrapper.style.zIndex=999999; document.body.appendChild(wrapper); }

      var btn = document.querySelector('.pwcb-toggle');
      if(!btn){
        btn = createToggleButton();
        // add bouncing animation class so the '!' brinca al cargar
        try{ btn.classList.add('pwcb-bounce'); }catch(e){}
        wrapper.appendChild(btn);
      }

      // click handler: lazy-create card on first click and toggle visibility
      // helper to open with animation and hide the toggle
      function openCard(){
        if(!currentCard){
          var useApp = app || { id: appId, name: appId, message: 'Falta de pago. Por favor envía el comprobante.', whatsapp: '#' };
          currentCard = createCard(useApp);
          wrapper.appendChild(currentCard);
          // wire close button to animated close
          const closeEl = currentCard.querySelector('.pwcb-btn.close');
          if(closeEl){ closeEl.addEventListener('click', closeCard); }
        }
        try{ if(!(app && app.enabled)) btn.style.display = 'none'; }catch(e){}
        // stop bounce while open
        try{ btn.classList.remove('pwcb-bounce'); }catch(e){}
        currentCard.style.display = 'block';
        currentCard.classList.remove('pwcb-animate-out');
        currentCard.classList.add('pwcb-animate-in');
        // cleanup after animation
        currentCard.addEventListener('animationend', function _in(){ currentCard.classList.remove('pwcb-animate-in'); currentCard.removeEventListener('animationend', _in); });
      }

      // helper to close with animation and restore the toggle
      function closeCard(){
        if(!currentCard) return;
        currentCard.classList.remove('pwcb-animate-in');
        currentCard.classList.add('pwcb-animate-out');
        currentCard.addEventListener('animationend', function _out(){
          try{ currentCard.style.display = 'none'; }catch(e){}
          try{ if(app && app.enabled) btn.style.display = 'inline-flex'; else btn.style.display = 'inline-flex'; }catch(e){}
          // resume bounce after close
          try{ btn.classList.add('pwcb-bounce'); }catch(e){}
          currentCard.classList.remove('pwcb-animate-out');
          currentCard.removeEventListener('animationend', _out);
        });
      }

      btn.onclick = function(){
        if(!currentCard || currentCard.style.display === 'none'){
          openCard();
        } else {
          closeCard();
        }
      };

      // Do not auto-open the card on load. FORCE_SHOW only bypasses show checks
      // so the button exists and the user still needs to press it to open the card.

      if (typeof console !== 'undefined' && console.info) console.info('gate.js: button ready for', appId, 'found:', !!app, 'forced:', FORCE_SHOW);
    }

    update();
    if(pollMs && pollMs>1000){ setInterval(update, pollMs); }

    // estilos mínimos si no existen
    (function(){
      if(document.getElementById('pwcb-styles')) return;
      const s = document.createElement('style'); s.id='pwcb-styles';
      s.textContent = `
      .pwcb-wrapper { position: fixed; right: 12px; bottom: 12px; z-index: 999999; font-family: Inter, system-ui, Arial, sans-serif; }
      .pwcb-toggle { width:44px; height:44px; border-radius:50%; border:none; background: linear-gradient(180deg,#ffdd55,#ffcc00); box-shadow:0 6px 18px rgba(10,20,40,0.12); color:#102; font-weight:800; font-size:20px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; }
      .pwcb-toggle.pwcb-bounce { animation: pwcb-bounce 1200ms infinite; }
      .pwcb-toggle:hover{ transform:translateY(-2px); }
      /* semi-transparent card with backdrop blur for a modern look */
      .pwcb-card { display:flex; gap:12px; align-items:flex-start; min-width:260px; max-width:360px; padding:12px; border-radius:12px; background: rgba(255,255,255,0.06); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); box-shadow:0 14px 36px rgba(8,20,40,0.08); border:1px solid rgba(255,255,255,0.08); }
      .pwcb-icon { flex:0 0 44px; width:44px; height:44px; border-radius:10px; background: rgba(255,230,180,0.12); display:flex; align-items:center; justify-content:center; box-shadow: inset 0 1px 0 rgba(255,255,255,0.2); }
      .pwcb-content { flex:1 1 auto; }
      .pwcb-title { font-weight:700; font-size:14px; margin-bottom:4px; }
      .pwcb-msg { color:#334155; font-size:13px; margin-bottom:8px; }
      .pwcb-actions { display:flex; gap:8px; align-items:center; }
      .pwcb-btn { padding:8px 10px; border-radius:8px; font-weight:600; font-size:13px; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; border:1px solid transparent; cursor:pointer; }
      .pwcb-btn.primary { background:#0b84ff; color:#fff; }
      .pwcb-btn.ghost { background:transparent; color:#0b84ff; border-color: rgba(11,132,255,0.12); }
      .pwcb-btn.close { background:transparent; color:#64748b; border:1px solid transparent; padding:6px 8px; }
      /* Animations */
      @keyframes pwcb-in { from { transform: translateY(8px) scale(.98); opacity:0 } to { transform: translateY(0) scale(1); opacity:1 } }
      @keyframes pwcb-out { from { transform: translateY(0) scale(1); opacity:1 } to { transform: translateY(8px) scale(.98); opacity:0 } }
      .pwcb-animate-in { animation: pwcb-in 260ms cubic-bezier(.22,.98,.36,1) both; }
      .pwcb-animate-out { animation: pwcb-out 200ms ease-in both; }
      @keyframes pwcb-bounce { 0% { transform: translateY(0); } 10%{ transform: translateY(-6px); } 30%{ transform: translateY(0); } 100%{ transform: translateY(0); } }

      @media (max-width:420px){ .pwcb-card{ max-width:92vw; min-width:unset; } .pwcb-wrapper{ right:10px; bottom:10px; } }
      `;
      document.head.appendChild(s);
    })();

    

  }catch(e){ console.error('gate.js error', e); }
})();
