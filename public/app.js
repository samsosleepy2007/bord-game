const socket = io();
const app = document.querySelector('#app');
const toastRoot = document.querySelector('#toast-root');

let state = null;
let profile = {
  sessionId: localStorage.getItem('skillcanvas_session') || crypto.randomUUID(),
  name: localStorage.getItem('skillcanvas_name') || '',
  roomCode: sessionStorage.getItem('skillcanvas_room') || ''
};
localStorage.setItem('skillcanvas_session', profile.sessionId);

let ui = { modal: null, selected: new Set() };

const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const me = () => state?.me;
const isMyTurn = () => state?.status === 'playing' && state?.game?.phase === 'turn' && state?.game?.currentPlayerId === me()?.id;
const playerById = id => state?.players.find(p => p.id === id);
const skillIcon = type => type === 'hard' ? '🟦' : '🟧';
const typeLabel = type => type === 'hard' ? 'Hard Skill' : 'Soft Skill';

function toast(message, type='info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`; el.textContent = message;
  toastRoot.appendChild(el); setTimeout(() => el.remove(), 3200);
}
function emitAck(event, payload={}) {
  return new Promise(resolve => socket.emit(event, payload, resolve));
}
function persistRoom(code) { profile.roomCode = code; sessionStorage.setItem('skillcanvas_room', code); }
function clearRoom() { profile.roomCode = ''; sessionStorage.removeItem('skillcanvas_room'); state = null; ui.modal = null; ui.selected.clear(); render(); }

socket.on('room:state', next => { state = next; persistRoom(next.code); render(); });
socket.on('toast', t => toast(t.message, t.type));
socket.on('room:kicked', ({reason}) => { toast(reason, 'error'); clearRoom(); });
socket.on('room:disbanded', () => { toast('ห้องถูกยุบแล้ว', 'error'); clearRoom(); });
socket.on('connect', async () => {
  if (profile.roomCode && profile.name) {
    const r = await emitAck('room:join', { code: profile.roomCode, name: profile.name, sessionId: profile.sessionId });
    if (!r?.ok) clearRoom();
  }
});

function landing() {
  app.innerHTML = `
    <section class="hero">
      <div class="hero-grid">
        <div class="hero-copy">
          <span class="eyebrow">🎲 Online Board Game • 2–8 Players</span>
          <h1><span class="gradient-text">Skill Canvas</span><br><span style="font-size:.54em">จับคู่สมรรถนะ ทะลุมิติวิชาชีพ</span></h1>
          <p>สะสม Hard Skills + Soft Skills เพื่อปลดล็อกอาชีพ รับมือสถานการณ์ฉุกเฉินด้วยการ Pitch และโหวตกันแบบเรียลไทม์</p>
          <div class="feature-row"><span class="feature-chip">🟦 Set Collection</span><span class="feature-chip">🧠 Problem Solving</span><span class="feature-chip">🚨 Crisis Pitching</span><span class="feature-chip">🤝 Networking</span></div>
        </div>
        <div class="panel join-card">
          <h2>เข้าสู่ Skill Canvas</h2><div class="muted">ตั้งชื่อก่อนสร้างหรือเข้าห้อง</div>
          <div class="field"><label>ชื่อผู้เล่น</label><input id="name" class="input" maxlength="24" value="${esc(profile.name)}" placeholder="เช่น Sam" /></div>
          <button id="create" class="btn btn-primary btn-wide">✨ สร้างห้องใหม่</button>
          <div class="or">หรือ</div>
          <div class="field"><label>โค้ดห้อง 6 ตัว</label><input id="code" class="input" maxlength="6" placeholder="ABC123" style="text-transform:uppercase;letter-spacing:4px" /></div>
          <button id="join" class="btn btn-wide">เข้าห้องด้วยโค้ด</button>
        </div>
      </div>
    </section>`;
  document.querySelector('#create').onclick = async () => {
    const name = document.querySelector('#name').value.trim(); if (!name) return toast('กรอกชื่อผู้เล่นก่อน', 'error');
    profile.name = name; localStorage.setItem('skillcanvas_name', name);
    const r = await emitAck('room:create', { name, sessionId: profile.sessionId });
    if (!r?.ok) toast(r?.error || 'สร้างห้องไม่สำเร็จ','error'); else persistRoom(r.code);
  };
  document.querySelector('#join').onclick = async () => {
    const name = document.querySelector('#name').value.trim(); const code = document.querySelector('#code').value.trim().toUpperCase();
    if (!name || code.length !== 6) return toast('กรอกชื่อและโค้ดห้องให้ครบ', 'error');
    profile.name = name; localStorage.setItem('skillcanvas_name', name);
    const r = await emitAck('room:join', { code, name, sessionId: profile.sessionId });
    if (!r?.ok) toast(r?.error || 'เข้าห้องไม่สำเร็จ','error'); else persistRoom(code);
  };
}

function header() {
  return `<div class="topbar"><div class="brand"><div class="logo">🎨</div><div><h1>Skill Canvas</h1><small>จับคู่สมรรถนะ ทะลุมิติวิชาชีพ</small></div></div><div class="top-actions"><span class="pill">ห้อง <b>${esc(state.code)}</b></span><button class="btn btn-sm btn-ghost" id="copy-code">คัดลอกโค้ด</button>${state.status==='lobby'?'<button class="btn btn-sm" id="leave-room">ออกห้อง</button>':''}</div></div>`;
}
function bindHeader() {
  document.querySelector('#copy-code')?.addEventListener('click', async () => { await navigator.clipboard?.writeText(state.code); toast('คัดลอกโค้ดห้องแล้ว','success'); });
  document.querySelector('#leave-room')?.addEventListener('click', () => { socket.emit('room:leave'); clearRoom(); });
}

function lobby() {
  const canStart = me().host && state.players.length >= 2;
  app.innerHTML = `<div class="shell">${header()}<div class="lobby-grid">
    <section class="panel lobby-main"><div class="room-code-box"><div><div class="muted">โค้ดห้อง</div><div class="room-code">${esc(state.code)}</div><div class="muted">ส่งโค้ดนี้ให้เพื่อนเพื่อเข้าห้อง</div></div>${me().host?`<div style="display:grid;gap:8px"><button id="start" class="btn btn-primary" ${canStart?'':'disabled'}>▶ เริ่มเกม</button><button id="disband" class="btn btn-danger">ยุบห้อง</button></div>`:''}</div>
    <div class="section-title" style="margin-top:20px"><h3>ผู้เล่น (${state.players.length}/8)</h3><span class="muted">${state.players.length<2?'รออย่างน้อย 2 คน':'พร้อมเริ่มเกม'}</span></div>
    <div class="player-list">${state.players.map(p=>`<div class="player"><div class="player-meta"><div class="avatar">${esc(p.name[0]?.toUpperCase()||'?')}</div><div><div>${esc(p.name)} ${p.host?'<span class="host-badge">HOST</span>':''}</div><div class="muted" style="font-size:11px;display:flex;align-items:center;gap:5px"><i class="status-dot ${p.connected?'':'off'}"></i>${p.connected?'ออนไลน์':'หลุดการเชื่อมต่อ'}</div></div></div>${me().host&&!p.host?`<button class="btn btn-sm btn-danger kick" data-id="${p.id}">เตะ</button>`:''}</div>`).join('')}</div></section>
    <aside class="panel side-info"><h3 style="margin-top:0">วิธีเล่นย่อ</h3><div class="rule-mini"><div class="item"><b>📚 Upskill</b><span>จั่วสมรรถนะ 2 ใบ</span></div><div class="item"><b>💼 Apply Job</b><span>ใช้สมรรถนะตรงเงื่อนไขเพื่อรับ VP</span></div><div class="item"><b>🤝 Networking</b><span>เสนอ 2 ใบ แลกกับผู้เล่นอื่น 1 ใบ</span></div><div class="item"><b>🚨 Crisis</b><span>เลือก 1–2 ทักษะ Pitch แล้วโหวตผู้แก้ปัญหาดีที่สุด</span></div></div></aside>
  </div></div>`;
  bindHeader();
  document.querySelector('#start')?.addEventListener('click', async()=>{const r=await emitAck('game:start');if(!r?.ok)toast(r?.error,'error')});
  document.querySelector('#disband')?.addEventListener('click', async()=>{if(confirm('ยุบห้องนี้สำหรับทุกคน?')) await emitAck('room:disband')});
  document.querySelectorAll('.kick').forEach(b=>b.onclick=async()=>{if(confirm('เตะผู้เล่นคนนี้ออกจากห้อง?')){const r=await emitAck('room:kick',{playerId:b.dataset.id});if(!r?.ok)toast(r?.error,'error')}});
}

function scoreSidebar() {
  return `<aside class="sidebar"><div class="panel side-panel"><div class="section-title"><h3>🏆 ตารางคะแนน</h3><span class="muted">VP</span></div><div class="score-list">${[...state.players].sort((a,b)=>b.vp-a.vp).map(p=>`<div class="score-player ${p.current?'active':''}"><div class="score-head"><span class="score-name">${esc(p.name)}${p.host?' 👑':''}</span><span class="score-vp">${p.vp}</span></div><div class="score-sub">🃏 ${p.handCount} ใบ • 💼 ${p.jobs.length} • 🚨 ${p.crises.length}</div></div>`).join('')}</div></div></aside>`;
}
function professionCard(job) {
  return `<article class="job-card"><div class="job-vp">⭐ ${job.vp} VP</div><h3>${esc(job.name)}</h3><div class="job-en">${esc(job.en)}</div><div class="reqs">${job.requirements.map(key=>{const c=competencyByKey(key);return `<div class="req"><i class="dot ${c?.type||'soft'}"></i>${esc(c?.name||key)}</div>`}).join('')}</div></article>`;
}
function competencyByKey(key){ const cards=[...(me()?.hand||[])]; const inMarket = window.__competencyCache?.[key]; return cards.find(c=>c.key===key)||inMarket||fallbackCompetencies[key]||{key,name:key,type:'soft'}; }
const fallbackCompetencies = {
  coding:{name:'การเขียนโค้ด',type:'hard'},first_aid:{name:'การปฐมพยาบาล',type:'hard'},data_analysis:{name:'การวิเคราะห์ข้อมูล',type:'hard'},statistics:{name:'การวิเคราะห์สถิติ',type:'hard'},database:{name:'การใช้โปรแกรมจัดการข้อมูล',type:'hard'},photography:{name:'การถ่ายภาพ',type:'hard'},camera:{name:'ทักษะมุมกล้อง/ภาพ',type:'hard'},foreign_language:{name:'ทักษะภาษาต่างประเทศ',type:'hard'},product_knowledge:{name:'ความรู้ในตัวสินค้า',type:'hard'},food_safety:{name:'สุขอนามัยและความปลอดภัยอาหาร',type:'hard'},cooking:{name:'เทคนิคการปรุงอาหาร',type:'hard'},accounting:{name:'การบัญชีพื้นฐาน',type:'hard'},uiux:{name:'การออกแบบ UX/UI',type:'hard'},networking_it:{name:'ระบบเครือข่ายคอมพิวเตอร์',type:'hard'},cybersecurity:{name:'ความปลอดภัยไซเบอร์',type:'hard'},project_tools:{name:'การใช้เครื่องมือบริหารโครงการ',type:'hard'},digital_marketing:{name:'การตลาดดิจิทัล',type:'hard'},research:{name:'ระเบียบวิธีวิจัย',type:'hard'},presentation_tools:{name:'การสร้างสื่อนำเสนอ',type:'hard'},financial_analysis:{name:'การวิเคราะห์การเงิน',type:'hard'},communication:{name:'การสื่อสาร',type:'soft'},critical_thinking:{name:'การคิดเชิงวิพากษ์',type:'soft'},adaptability:{name:'การปรับตัว',type:'soft'},empathy:{name:'ความเห็นอกเห็นใจ',type:'soft'},leadership:{name:'ความเป็นผู้นำ',type:'soft'},pressure_decision:{name:'การตัดสินใจภายใต้ความกดดัน',type:'soft'},creativity:{name:'ความคิดสร้างสรรค์',type:'soft'},negotiation:{name:'การเจรจาต่อรอง',type:'soft'},active_listening:{name:'การฟังอย่างลึกซึ้ง',type:'soft'},teamwork:{name:'การทำงานเป็นทีม',type:'soft'},problem_solving:{name:'การแก้ปัญหา',type:'soft'},time_management:{name:'การบริหารเวลา',type:'soft'},resilience:{name:'ความยืดหยุ่นทางใจ',type:'soft'},conflict_resolution:{name:'การจัดการความขัดแย้ง',type:'soft'},storytelling:{name:'การเล่าเรื่อง',type:'soft'},attention_detail:{name:'ความใส่ใจในรายละเอียด',type:'soft'},collaboration:{name:'การประสานงาน',type:'soft'},ethics:{name:'จริยธรรมวิชาชีพ',type:'soft'},self_learning:{name:'การเรียนรู้ด้วยตนเอง',type:'soft'},customer_focus:{name:'การเข้าใจผู้รับบริการ',type:'soft'}
};
function handCards(selectable=false) {
  const selected = ui.selected;
  return (me().hand||[]).map(c=>`<div class="skill-card ${c.type} ${selectable?'selectable':''} ${selected.has(c.id)?'selected':''}" data-card="${c.id}"><div class="card-icon">${skillIcon(c.type)}</div><div class="skill-type">${typeLabel(c.type)}</div><h4>${esc(c.name)}</h4><small>${esc(c.en)}</small></div>`).join('');
}
function crisisBlock() {
  const c = state.game.crisis; if (!c) return '';
  const submitted = c.submittedPlayerIds.includes(me().id);
  if (c.phase === 'pitching') return `<section class="panel crisis-panel"><div class="crisis-title"><span style="font-size:28px">🚨</span><div><h2>สถานการณ์ฉุกเฉิน!</h2><div class="crisis-meta">โบนัส ${c.card.vp} VP</div></div></div><p><b>${esc(c.card.name)}</b><br><span class="muted">${esc(c.card.en)}</span></p>${submitted?'<div class="submitted">✓ ส่ง Pitch แล้ว รอผู้เล่นคนอื่น</div>':'<button class="btn btn-primary" id="open-pitch">เลือกสมรรถนะและ Pitch</button>'}</section>`;
  return `<section class="panel crisis-panel"><div class="crisis-title"><span style="font-size:28px">🗳️</span><div><h2>โหวตวิธีแก้ปัญหา</h2><div class="crisis-meta">ห้ามโหวตตัวเอง</div></div></div><p><b>${esc(c.card.name)}</b></p><div>${c.submissions.map(s=>{const p=playerById(s.playerId);const voted=c.votesCast.includes(me().id);return `<div class="pitch-card"><b>${esc(p?.name||'ผู้เล่น')}</b><div class="pitch-cards">${s.cards.map(x=>`<span class="mini-skill">${skillIcon(x.type)} ${esc(x.name)}</span>`).join('')}</div><div class="muted">${esc(s.pitch)}</div>${s.playerId!==me().id?`<button class="btn btn-sm btn-green vote" data-id="${s.playerId}" ${voted?'disabled':''}>โหวตคนนี้</button>`:'<span class="muted"> • Pitch ของคุณ</span>'}</div>`}).join('')}</div></section>`;
}
function rightbar() {
  return `<aside class="rightbar"><div class="panel side-panel right-section"><div class="section-title"><h3>📊 สถานะเกม</h3></div><div class="rule-mini"><div class="item"><b>${state.game.deckCount}</b><span>การ์ดในกองจั่ว</span></div><div class="item"><b>Turn ${state.game.turn}</b><span>รอบปัจจุบัน</span></div></div></div><div class="panel side-panel"><div class="section-title"><h3>📝 Game Log</h3></div><div class="log">${[...state.game.log].reverse().map(x=>`<div class="log-item">${esc(x.text)}</div>`).join('')||'<div class="muted">ยังไม่มีเหตุการณ์</div>'}</div></div></aside>`;
}
function game() {
  const current = playerById(state.game.currentPlayerId);
  const turnLabel = state.game.phase==='turn' ? `ตาของ ${current?.name||'-'}` : state.game.phase==='trade'?'กำลัง Networking':'สถานการณ์ฉุกเฉิน';
  app.innerHTML = `<div class="shell">${header()}<div class="game-layout">${scoreSidebar()}<main><div class="panel turn-banner"><div><div class="muted">TURN ${state.game.turn}</div><div class="turn-now ${isMyTurn()?'me':''}">${esc(turnLabel)} ${isMyTurn()?'— เลือก 1 แอ็กชัน':''}</div></div><span class="phase-tag">${esc(state.game.phase.toUpperCase())}</span></div>${crisisBlock()}<section><div class="section-title"><h3>💼 ตลาดอาชีพ</h3><span class="muted">เปิด 4 ใบ</span></div><div class="market">${state.game.market.map(professionCard).join('')}</div></section><section class="panel hand-wrap"><div class="section-title"><h3>🃏 การ์ดสมรรถนะของคุณ</h3><span class="muted">${me().hand.length} ใบ</span></div><div class="hand">${handCards(false)||'<div class="muted">ไม่มีการ์ดในมือ</div>'}</div></section><section class="panel actions-panel"><div class="section-title"><h3>เลือกแอ็กชัน</h3><span class="muted">ทำได้ 1 อย่าง / เทิร์น</span></div><div class="action-grid"><button class="action-btn" id="upskill" ${isMyTurn()?'':'disabled'}><div class="action-emoji">📚</div><b>เรียนรู้ (Upskill)</b><span>จั่วการ์ดสมรรถนะเพิ่ม 2 ใบ แต่ระวัง Crisis!</span></button><button class="action-btn" id="apply" ${isMyTurn()?'':'disabled'}><div class="action-emoji">💼</div><b>สมัครงาน (Apply Job)</b><span>จ่ายสมรรถนะตามเงื่อนไขแล้วรับ VP</span></button><button class="action-btn" id="network" ${isMyTurn()?'':'disabled'}><div class="action-emoji">🤝</div><b>Networking</b><span>เสนอ 2 ใบ เพื่อขอแลกกับผู้เล่นอื่น 1 ใบ</span></button></div></section></main>${rightbar()}</div>${modalHtml()}</div>`;
  bindHeader(); bindGame();
}
function finished() {
  const sorted=[...state.players].sort((a,b)=>b.vp-a.vp);
  app.innerHTML=`<div class="shell">${header()}<section class="panel finished-box"><div style="font-size:46px">🏁</div><h2>เกมจบแล้ว</h2><div class="muted">การ์ดในกองจั่วหมด — สรุปคะแนนทั้งหมด</div><div class="podium">${sorted.slice(0,3).map((p,i)=>`<div class="pod ${i===0?'first':''}"><div>${['🥇','🥈','🥉'][i]}</div><b>${esc(p.name)}</b><strong>${p.vp} VP</strong><small class="muted">${p.jobs.length} อาชีพ • ${p.crises.length} Crisis</small></div>`).join('')}</div>${me().host?'<button id="disband" class="btn btn-danger">ยุบห้อง</button>':''}</section></div>`;bindHeader();document.querySelector('#disband')?.addEventListener('click',async()=>{if(confirm('ยุบห้องนี้?'))await emitAck('room:disband')});
}

function modalHtml(){
  if(!ui.modal) return '';
  if(ui.modal==='apply') return applyModal();
  if(ui.modal==='trade') return tradeModal();
  if(ui.modal==='tradeIncoming') return tradeIncomingModal();
  if(ui.modal==='pitch') return pitchModal();
  return '';
}
function applyModal(){return `<div class="modal-backdrop"><div class="panel modal"><h2>💼 สมัครงาน</h2><div class="muted">เลือกอาชีพ แล้วระบบจะช่วยเลือกการ์ดที่ตรงเงื่อนไขให้</div><div class="field"><label>อาชีพ</label><select id="job-select" class="select"><option value="">เลือกอาชีพ...</option>${state.game.market.map(j=>`<option value="${j.id}">${esc(j.name)} — ${j.vp} VP</option>`).join('')}</select></div><div id="job-check" class="muted">เลือกอาชีพเพื่อดูสมรรถนะที่ต้องใช้</div><div class="modal-actions"><button class="btn close-modal">ยกเลิก</button><button id="confirm-apply" class="btn btn-primary" disabled>สมัครงาน</button></div></div></div>`}
function tradeModal(){const others=state.players.filter(p=>p.id!==me().id);return `<div class="modal-backdrop"><div class="panel modal"><h2>🤝 Networking</h2><div class="muted">เลือกสมรรถนะของคุณ 2 ใบ แล้วส่งข้อเสนอไปยังผู้เล่นอื่น</div><div class="field"><label>ผู้เล่นที่ต้องการแลก</label><select id="trade-target" class="select"><option value="">เลือกผู้เล่น...</option>${others.map(p=>`<option value="${p.id}">${esc(p.name)} • ${p.handCount} ใบ</option>`).join('')}</select></div><div class="pick-grid">${me().hand.map(c=>`<button class="pick-card trade-card" data-id="${c.id}">${skillIcon(c.type)} ${esc(c.name)}</button>`).join('')}</div><div class="modal-actions"><button class="btn close-modal">ยกเลิก</button><button id="send-trade" class="btn btn-primary" disabled>ส่งข้อเสนอ 2 ใบ</button></div></div></div>`}
function tradeIncomingModal(){const t=state.game.trade; if(!t||t.toId!==me().id)return'';const from=playerById(t.fromId);return `<div class="modal-backdrop"><div class="panel modal"><h2>🤝 ${esc(from?.name||'ผู้เล่น')} ขอ Networking</h2><div class="muted">เขาเสนอการ์ด 2 ใบนี้ เพื่อแลกกับการ์ดของคุณ 1 ใบ</div><div class="pick-grid" style="margin:14px 0">${t.offeredCards.map(c=>`<div class="pick-card">${skillIcon(c.type)} ${esc(c.name)}</div>`).join('')}</div><div class="field"><label>เลือก 1 ใบที่คุณจะให้กลับ</label><select id="trade-give" class="select"><option value="">เลือกการ์ด...</option>${me().hand.map(c=>`<option value="${c.id}">${c.type==='hard'?'🟦':'🟧'} ${esc(c.name)}</option>`).join('')}</select></div><div class="modal-actions"><button id="decline-trade" class="btn btn-danger">ปฏิเสธ</button><button id="accept-trade" class="btn btn-green">ยอมรับการแลก</button></div></div></div>`}
function pitchModal(){return `<div class="modal-backdrop"><div class="panel modal"><h2>🚨 Pitch วิธีแก้ปัญหา</h2><div class="muted">เลือกสมรรถนะ 1–2 ใบที่เหมาะกับสถานการณ์ แล้วอธิบายเหตุผล</div><div class="pick-grid" style="margin:14px 0">${me().hand.map(c=>`<button class="pick-card pitch-skill" data-id="${c.id}">${skillIcon(c.type)} ${esc(c.name)}</button>`).join('')}</div><div class="field"><label>คำอธิบาย</label><textarea id="pitch-text" class="textarea" maxlength="500" placeholder="เช่น ใช้ Adaptability เพื่อปรับแผนทันที และ Communication เพื่อคุยกับลูกค้าให้เข้าใจข้อจำกัด..."></textarea></div><div class="modal-actions"><button class="btn close-modal">ยกเลิก</button><button id="submit-pitch" class="btn btn-primary" disabled>ส่ง Pitch</button></div></div></div>`}

function bindGame(){
  document.querySelector('#upskill')?.addEventListener('click',async()=>{const r=await emitAck('game:upskill');if(!r?.ok)toast(r?.error,'error')});
  document.querySelector('#apply')?.addEventListener('click',()=>{ui.modal='apply';ui.selected.clear();render()});
  document.querySelector('#network')?.addEventListener('click',()=>{ui.modal='trade';ui.selected.clear();render()});
  document.querySelector('#open-pitch')?.addEventListener('click',()=>{ui.modal='pitch';ui.selected.clear();render()});
  document.querySelectorAll('.vote').forEach(b=>b.onclick=async()=>{const r=await emitAck('crisis:vote',{playerId:b.dataset.id});if(!r?.ok)toast(r?.error,'error')});
  document.querySelectorAll('.close-modal').forEach(b=>b.onclick=()=>{ui.modal=null;ui.selected.clear();render()});

  const jobSelect=document.querySelector('#job-select');
  if(jobSelect) jobSelect.onchange=()=>{
    const job=state.game.market.find(j=>j.id===jobSelect.value);const box=document.querySelector('#job-check');const btn=document.querySelector('#confirm-apply');ui.selected.clear();
    if(!job){box.textContent='เลือกอาชีพเพื่อดูสมรรถนะที่ต้องใช้';btn.disabled=true;return}
    const chosen=[];const missing=[];for(const req of job.requirements){const card=me().hand.find(c=>c.key===req&&!chosen.some(x=>x.id===c.id));if(card)chosen.push(card);else missing.push(req)}
    ui.selected=new Set(chosen.map(c=>c.id));box.innerHTML=`<div class="pick-grid">${job.requirements.map(k=>{const c=fallbackCompetencies[k]||{name:k,type:'soft'};const have=chosen.some(x=>x.key===k);return `<div class="pick-card" style="border-color:${have?'rgba(88,214,164,.45)':'rgba(255,100,124,.45)'}">${skillIcon(c.type)} ${esc(c.name)}<br><small>${have?'✓ มีแล้ว':'✕ ยังขาด'}</small></div>`}).join('')}</div>`;btn.disabled=missing.length>0;
  };
  document.querySelector('#confirm-apply')?.addEventListener('click',async()=>{const professionId=document.querySelector('#job-select').value;const r=await emitAck('game:apply',{professionId,cardIds:[...ui.selected]});if(!r?.ok)toast(r?.error,'error');else{ui.modal=null;ui.selected.clear()}});

  document.querySelectorAll('.trade-card').forEach(b=>b.onclick=()=>{if(ui.selected.has(b.dataset.id))ui.selected.delete(b.dataset.id);else if(ui.selected.size<2)ui.selected.add(b.dataset.id);b.classList.toggle('active');document.querySelector('#send-trade').disabled=ui.selected.size!==2||!document.querySelector('#trade-target').value});
  document.querySelector('#trade-target')?.addEventListener('change',e=>{document.querySelector('#send-trade').disabled=ui.selected.size!==2||!e.target.value});
  document.querySelector('#send-trade')?.addEventListener('click',async()=>{const r=await emitAck('trade:offer',{toId:document.querySelector('#trade-target').value,cardIds:[...ui.selected]});if(!r?.ok)toast(r?.error,'error');else{ui.modal=null;ui.selected.clear()}});

  document.querySelector('#decline-trade')?.addEventListener('click',async()=>{const r=await emitAck('trade:respond',{accept:false});if(!r?.ok)toast(r?.error,'error');ui.modal=null});
  document.querySelector('#accept-trade')?.addEventListener('click',async()=>{const id=document.querySelector('#trade-give').value;if(!id)return toast('เลือกการ์ดที่จะให้กลับ','error');const r=await emitAck('trade:respond',{accept:true,requestedCardId:id});if(!r?.ok)toast(r?.error,'error');ui.modal=null});

  document.querySelectorAll('.pitch-skill').forEach(b=>b.onclick=()=>{if(ui.selected.has(b.dataset.id))ui.selected.delete(b.dataset.id);else if(ui.selected.size<2)ui.selected.add(b.dataset.id);b.classList.toggle('active');const txt=document.querySelector('#pitch-text');document.querySelector('#submit-pitch').disabled=ui.selected.size<1||txt.value.trim().length<5});
  document.querySelector('#pitch-text')?.addEventListener('input',e=>{document.querySelector('#submit-pitch').disabled=ui.selected.size<1||e.target.value.trim().length<5});
  document.querySelector('#submit-pitch')?.addEventListener('click',async()=>{const r=await emitAck('crisis:submit',{cardIds:[...ui.selected],pitch:document.querySelector('#pitch-text').value});if(!r?.ok)toast(r?.error,'error');else{ui.modal=null;ui.selected.clear()}});
}

function render(){
  if(!state) return landing();
  if(state.status==='lobby') return lobby();
  if(state.status==='finished') return finished();
  if(state.game?.trade?.toId===me()?.id && !ui.modal) ui.modal='tradeIncoming';
  if(state.game?.trade?.toId!==me()?.id && ui.modal==='tradeIncoming') ui.modal=null;
  return game();
}
render();
