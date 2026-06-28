/* ============================================================
   navigation.js — Navegação entre telas e abas.
   Aurora · seu espaço seguro
   ============================================================ */

/* ===== NAVIGATION ===== */
function showPage(id,tab){
  const target=document.getElementById('page-'+id);
  if(!target) return;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>{ t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
  target.classList.add('active');
  if(tab){ tab.classList.add('active'); tab.setAttribute('aria-selected','true'); }
  if(id==='historico'){ calViewDate=new Date(); renderHistorico(); }
  const idx = journeyOrder.indexOf(id);
  if(idx >= 0) currentJourneyIdx = idx;
  // Sincroniza a sala ativa com a página aberta (mantém a room-bar correta)
  if(typeof getRoomForPage === 'function'){
    const r = getRoomForPage(id);
    if(r && r !== currentRoom){
      currentRoom = r;
      document.querySelectorAll('.room-tab').forEach(btn => {
        const on = btn.id === 'room-btn-' + r;
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      document.querySelectorAll('.subnav .tab').forEach(t => {
        const rc = [...t.classList].find(c => c.startsWith('room-') && c.endsWith('-tab'));
        if(rc){ t.classList.toggle('hidden-tab', rc.replace('room-','').replace('-tab','') !== r); }
      });
    }
  }
  // Sempre sobe ao topo ao mudar de página
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


/* ═══════════════════════════════════════════════════
   SISTEMA DE FASES — navegação por 4 fases
   ═══════════════════════════════════════════════════ */

const PHASES = [
  { id: 0, pages: ['percepcao', 'sinais'],                 firstPage: 'percepcao' },
  { id: 1, pages: ['emocional'],                            firstPage: 'emocional' },
  { id: 2, pages: ['reflexao', 'desabafo'],                firstPage: 'reflexao'  },
  { id: 3, pages: ['conquistas', 'compromisso', 'juridica'], firstPage: 'conquistas' },
];

/* ===== AURORA — sistema de 3 SALAS (substitui as 4 fases) =====
   Cada sala agrupa páginas por estado mental, não por sequência. */
const ROOMS = {
  dia:      { firstPage: 'percepcao',  pages: ['percepcao','emocional','reflexao','desabafo'] },
  historia: { firstPage: 'historico',  pages: ['historico','juridica','conquistas','compromisso'] },
  ajuda:    { firstPage: 'apoio',      pages: ['apoio','sinais'] },
};
let currentRoom = 'dia';

function switchRoom(room, autoNavigate = true) {
  if (!ROOMS[room]) return;
  currentRoom = room;
  _inSecondarySection = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Atualiza botões da room-bar
  document.querySelectorAll('.room-tab').forEach(btn => {
    const isActive = btn.id === 'room-btn-' + room;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  // Mostra só as subabas da sala ativa
  document.querySelectorAll('.subnav .tab').forEach(t => {
    const roomClass = [...t.classList].find(c => c.startsWith('room-') && c.endsWith('-tab'));
    if (!roomClass) return;
    const tabRoom = roomClass.replace('room-', '').replace('-tab', '');
    t.classList.toggle('hidden-tab', tabRoom !== room);
  });

  // Navega para a primeira página da sala
  if (autoNavigate) {
    const firstTab = document.querySelector('.room-' + room + '-tab');
    showPage(ROOMS[room].firstPage, firstTab);
  }

  // Salva no estado
  if (typeof state !== 'undefined') {
    state.currentRoom = room;
    saveState();
  }
}

function getRoomForPage(pageId) {
  for (const [room, cfg] of Object.entries(ROOMS)) {
    if (cfg.pages.includes(pageId)) return room;
  }
  return null;
}

// Seções secundárias (ficam no topbar, fora das fases)
const SECONDARY_PAGES = ['apoio', 'historico'];

let currentPhase = 0;
let _inSecondarySection = false;

function getPhaseForPage(pageId) {
  for (const ph of PHASES) {
    if (ph.pages.includes(pageId)) return ph.id;
  }
  return -1; // secundária
}

function switchPhase(phaseIdx, autoNavigate = true) {
  /* PONTE de compatibilidade: o app antigo chamava switchPhase.
     Agora redirecionamos para o sistema de salas. As fases 0-2
     pertenciam à vivência do dia → sala 'dia'. A fase 3 tinha
     conquistas/jurídico → sala 'historia'. */
  const phaseToRoom = { 0: 'dia', 1: 'dia', 2: 'dia', 3: 'historia' };
  const room = phaseToRoom[phaseIdx] || 'dia';
  switchRoom(room, autoNavigate);
}

// Navega para seções secundárias (Histórico, Rede de Apoio) pelo topbar
function goSecondarySection(pageId, btn) {
  _inSecondarySection = true;

  // Cancela qualquer navegação pendente
  if(window._navTimer) clearTimeout(window._navTimer);

  // Mostrar CVV em seções secundárias também
  const cvvBar2 = document.getElementById('cvv-bar');
  if(cvvBar2) cvvBar2.style.display = '';

  // Esconde todas as páginas
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Esconde subnav
  const subnav = document.querySelector('.subnav-wrap');
  if(subnav) subnav.style.opacity = '0.4';

  // Mostra a página alvo
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');

  if (pageId === 'historico') renderHistorico();
  if (pageId === 'apoio') setTimeout(initBotoesLigar, 80);

  // Garante que page permanece ativa após qualquer scroll/timeout
  window._navTimer = setTimeout(() => {
    if (_inSecondarySection) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      if (target) target.classList.add('active');
    }
  }, 300);

  // Destaca o botão do topbar
  document.querySelectorAll('#topbar-apoio-btn, #topbar-hist-btn').forEach(b => {
    b.style.borderColor = '';
    b.style.color = '';
  });
  if (btn) {
    btn.style.borderColor = 'var(--gold-l)';
    btn.style.color = 'var(--gold-l)';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Botão "Voltar à fase" — aparece nas seções secundárias
function voltarAFase() {
  if(window._navTimer) clearTimeout(window._navTimer);
  _inSecondarySection = false;
  const subnav = document.querySelector('.subnav-wrap');
  if(subnav) subnav.style.opacity = '';
  document.querySelectorAll('#topbar-apoio-btn, #topbar-hist-btn').forEach(b => {
    b.style.borderColor = '';
    b.style.color = '';
  });
  switchPhase(currentPhase);
  if(typeof checkCVVVisibility === 'function') checkCVVVisibility(currentPhase);
}

// Avança para a próxima fase com animação suave
function nextPhase() {
  // Não interfere se estiver em seção secundária
  if (_inSecondarySection) return;
  const next = Math.min(currentPhase + 1, PHASES.length - 1);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => { if(!_inSecondarySection) switchPhase(next); }, 200);
}

// Inicia a navegação (sistema de salas)
function initPhaseNav() {
  const savedRoom = (typeof state !== 'undefined' && state.currentRoom) ? state.currentRoom : 'dia';
  switchRoom(ROOMS[savedRoom] ? savedRoom : 'dia', true);
}


function toggleTheme(){
  const cur=document.documentElement.getAttribute('data-theme');
  const next=cur==='light'?'':'light';
  if(next==='light') document.documentElement.setAttribute('data-theme','light');
  else document.documentElement.removeAttribute('data-theme');
  document.getElementById('theme-btn').textContent=next==='light'?'🌙':'☀️';
  state.theme=next; saveState();
}
function applyTheme(){
  const t=state.theme||'';
  if(t==='light') document.documentElement.setAttribute('data-theme','light');
  else document.documentElement.removeAttribute('data-theme');
  document.getElementById('theme-btn').textContent=t==='light'?'🌙':'☀️';
}


/* ===== ABAS DA PÁGINA APOIO ===== */
/* apoioTab (versão antiga removida — a completa está mais abaixo neste arquivo) */


/* ===== ATUALIZA APOIO TAB para incluir novas abas ===== */
const _apoioTabOrig = window.apoioTab;
function apoioTab(btn, tabId){
  document.querySelectorAll('.tab-sec-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  ['apoio-rede','apoio-mapa','apoio-checklist','apoio-plano','apoio-qr'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.style.display='none';
  });
  const target=document.getElementById(tabId);
  if(target) target.style.display='block';
  if(tabId==='apoio-mapa'&&!window._mapaIniciado){ window._mapaIniciado=true; mapaRenderGrid(); }
  if(tabId==='apoio-checklist'&&!window._ckIniciado){ window._ckIniciado=true; ckRestoreAll(); }
  if(tabId==='apoio-rede') setTimeout(initBotoesLigar,50);
  if(tabId==='apoio-qr'&&!window._qrGerado){ window._qrGerado=true; setTimeout(gerarQRCode,100); }
  if(tabId==='apoio-plano') gerarPlanoSeguranca();
}
