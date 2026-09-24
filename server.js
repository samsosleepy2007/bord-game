import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingTimeout: 20000,
  pingInterval: 25000
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));

const PORT = process.env.PORT || 3000;
const rooms = new Map();
const socketIndex = new Map();

const HARD = [
  ['coding','การเขียนโค้ด','Coding'],
  ['first_aid','การปฐมพยาบาล','First Aid'],
  ['data_analysis','การวิเคราะห์ข้อมูล','Data Analysis'],
  ['statistics','การวิเคราะห์สถิติ','Statistics'],
  ['database','การใช้โปรแกรมจัดการข้อมูล','Data Tools'],
  ['photography','การถ่ายภาพ','Photography'],
  ['camera','ทักษะมุมกล้อง/ภาพ','Cinematography'],
  ['foreign_language','ทักษะภาษาต่างประเทศ','Foreign Language'],
  ['product_knowledge','ความรู้ในตัวสินค้า','Product Knowledge'],
  ['food_safety','สุขอนามัยและความปลอดภัยอาหาร','Food Safety'],
  ['cooking','เทคนิคการปรุงอาหาร','Cooking'],
  ['accounting','การบัญชีพื้นฐาน','Accounting'],
  ['uiux','การออกแบบ UX/UI','UX/UI Design'],
  ['networking_it','ระบบเครือข่ายคอมพิวเตอร์','IT Networking'],
  ['cybersecurity','ความปลอดภัยไซเบอร์','Cybersecurity'],
  ['project_tools','การใช้เครื่องมือบริหารโครงการ','Project Tools'],
  ['digital_marketing','การตลาดดิจิทัล','Digital Marketing'],
  ['research','ระเบียบวิธีวิจัย','Research'],
  ['presentation_tools','การสร้างสื่อนำเสนอ','Presentation Tools'],
  ['financial_analysis','การวิเคราะห์การเงิน','Financial Analysis']
];

const SOFT = [
  ['communication','การสื่อสาร','Communication'],
  ['critical_thinking','การคิดเชิงวิพากษ์','Critical Thinking'],
  ['adaptability','การปรับตัว','Adaptability'],
  ['empathy','ความเห็นอกเห็นใจ','Empathy'],
  ['leadership','ความเป็นผู้นำ','Leadership'],
  ['pressure_decision','การตัดสินใจภายใต้ความกดดัน','Decision Under Pressure'],
  ['creativity','ความคิดสร้างสรรค์','Creativity'],
  ['negotiation','การเจรจาต่อรอง','Negotiation'],
  ['active_listening','การฟังอย่างลึกซึ้ง','Active Listening'],
  ['teamwork','การทำงานเป็นทีม','Teamwork'],
  ['problem_solving','การแก้ปัญหา','Problem Solving'],
  ['time_management','การบริหารเวลา','Time Management'],
  ['resilience','ความยืดหยุ่นทางใจ','Resilience'],
  ['conflict_resolution','การจัดการความขัดแย้ง','Conflict Resolution'],
  ['storytelling','การเล่าเรื่อง','Storytelling'],
  ['attention_detail','ความใส่ใจในรายละเอียด','Attention to Detail'],
  ['collaboration','การประสานงาน','Collaboration'],
  ['ethics','จริยธรรมวิชาชีพ','Professional Ethics'],
  ['self_learning','การเรียนรู้ด้วยตนเอง','Self-learning'],
  ['customer_focus','การเข้าใจผู้รับบริการ','Customer Focus']
];

const COMPETENCY_LIBRARY = [
  ...HARD.map(([key, name, en]) => ({ key, name, en, type: 'hard' })),
  ...SOFT.map(([key, name, en]) => ({ key, name, en, type: 'soft' }))
];

const PROFESSIONS = [
  ['พยาบาลวิชาชีพ','Nurse',6,['first_aid','empathy','pressure_decision']],
  ['นักวิเคราะห์ข้อมูล','Data Analyst',6,['statistics','database','communication']],
  ['ผู้กำกับภาพยนตร์','Film Director',7,['camera','leadership','creativity']],
  ['พนักงานขาย','Sales Executive',6,['product_knowledge','negotiation','active_listening']],
  ['วิศวกรข้อมูล','Data Engineer',7,['coding','database','problem_solving']],
  ['คอนเทนต์ครีเอเตอร์','Content Creator',6,['photography','storytelling','creativity']],
  ['เชฟ','Chef',6,['cooking','food_safety','time_management']],
  ['ผู้จัดการโครงการ','Project Manager',7,['project_tools','leadership','collaboration']],
  ['นักการตลาดดิจิทัล','Digital Marketer',6,['digital_marketing','data_analysis','creativity']],
  ['นักวิจัย','Researcher',7,['research','critical_thinking','attention_detail']],
  ['นักออกแบบ UX/UI','UX/UI Designer',6,['uiux','empathy','problem_solving']],
  ['วิศวกรซอฟต์แวร์','Software Engineer',7,['coding','self_learning','teamwork']],
  ['ผู้เชี่ยวชาญไซเบอร์','Cybersecurity Specialist',7,['cybersecurity','critical_thinking','pressure_decision']],
  ['ผู้ดูแลระบบเครือข่าย','Network Administrator',6,['networking_it','problem_solving','attention_detail']],
  ['นักบัญชี','Accountant',6,['accounting','attention_detail','ethics']],
  ['นักวิเคราะห์การเงิน','Financial Analyst',7,['financial_analysis','statistics','critical_thinking']],
  ['ล่ามภาษา','Interpreter',6,['foreign_language','communication','active_listening']],
  ['วิทยากร','Trainer',6,['presentation_tools','communication','empathy']],
  ['หัวหน้าทีมบริการลูกค้า','Customer Service Lead',6,['customer_focus','conflict_resolution','leadership']],
  ['ผู้ประกอบการ','Entrepreneur',8,['financial_analysis','adaptability','negotiation','leadership']]
].map((p, i) => ({ id: `job-${i+1}`, name: p[0], en: p[1], vp: p[2], requirements: p[3] }));

const CRISES = [
  ['ลูกค้าเปลี่ยนบรีฟงานกะทันหันก่อนส่ง 1 ชั่วโมง!','Client changes the brief one hour before delivery.',4],
  ['เพื่อนร่วมทีมลาออกกะทันหันในวันสำคัญ','A teammate suddenly resigns on a critical day.',4],
  ['ระบบเซิร์ฟเวอร์ล่มทั่วประเทศ','A nationwide server outage hits.',5],
  ['งบประมาณโครงการถูกตัดลง 40%','The project budget is cut by 40%.',4],
  ['ลูกค้าร้องเรียนอย่างรุนแรงบนโซเชียล','A customer complaint goes viral.',4],
  ['ไฟล์งานสำคัญเสียหายก่อนพรีเซนต์','Critical files are corrupted before a presentation.',4],
  ['ทีมสองฝ่ายขัดแย้งกันจนงานหยุด','Two teams clash and work stops.',4],
  ['ต้องนำเสนอให้ผู้บริหารโดยไม่มีเวลาเตรียมตัว','You must present to executives with no prep time.',4],
  ['ข้อมูลที่ใช้ตัดสินใจมีความขัดแย้งกัน','Key decision data conflicts.',5],
  ['เครื่องมือหลักที่ใช้ทำงานใช้งานไม่ได้','Your main work tool stops working.',4],
  ['งานเร่งด้วน 3 งานเข้าพร้อมกัน','Three urgent tasks arrive at once.',4],
  ['พบข้อผิดพลาดหลังส่งงานให้ลูกค้าแล้ว','A major error is found after delivery.',5],
  ['สมาชิกใหม่ในทีมตามงานไม่ทัน','A new teammate cannot keep up.',3],
  ['ผู้มีส่วนได้ส่วนเสียไม่เห็นด้วยกับแนวทางทีม','Stakeholders reject the team approach.',4],
  ['ข้อมูลลูกค้าที่สำคัญมีความเสี่ยงรั่วไหล','Sensitive customer data may be exposed.',5],
  ['ยอดขายตกต่อเนื่องแต่ทีมมีทรัพยากรจำกัด','Sales keep falling with limited resources.',4],
  ['ต้องทำงานร่วมกับทีมต่างวัฒนธรรมแบบเร่งด่วน','You must urgently collaborate across cultures.',4],
  ['ผู้ใช้จริงไม่เข้าใจผลิตภัณฑ์ที่ทีมออกแบบ','Users do not understand the product.',4],
  ['เกิดความเข้าใจผิดจากการสื่อสารในทีม','A communication misunderstanding causes rework.',3],
  ['แผนเดิมใช้ไม่ได้เพราะเงื่อนไขภายนอกเปลี่ยน','External changes make the original plan unusable.',5]
].map((c, i) => ({ id: `crisis-${i+1}`, name: c[0], en: c[1], vp: c[2] }));

function safeName(v) {
  return String(v || '').replace(/[<>]/g, '').trim().slice(0, 24) || 'ผู้เล่น';
}
function roomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = Array.from({ length: 6 }, () => chars[crypto.randomInt(chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}
function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function makeCompetencyDeck() {
  const copies = [];
  for (const base of COMPETENCY_LIBRARY) {
    for (let copy = 1; copy <= 2; copy++) {
      copies.push({ ...base, id: `${base.key}-${copy}-${crypto.randomUUID().slice(0, 6)}`, kind: 'competency' });
    }
  }
  const crisisCards = CRISES.map(c => ({ ...c, kind: 'crisis' }));
  return shuffle([...copies, ...crisisCards]);
}
function getRoomBySocket(socket) {
  const ref = socketIndex.get(socket.id);
  return ref ? rooms.get(ref.code) : null;
}
function getPlayer(room, playerId) {
  return room?.players.find(p => p.id === playerId);
}
function publicPlayer(p, room) {
  const current = room.game?.currentPlayerId === p.id;
  return {
    id: p.id,
    name: p.name,
    host: room.hostId === p.id,
    connected: p.connected,
    handCount: p.hand.length,
    vp: p.vp,
    jobs: p.jobs,
    crises: p.crises,
    current
  };
}
function publicRoom(room, viewerId) {
  const me = getPlayer(room, viewerId);
  const game = room.game;
  return {
    code: room.code,
    status: room.status,
    hostId: room.hostId,
    players: room.players.map(p => publicPlayer(p, room)),
    me: me ? {
      id: me.id,
      name: me.name,
      hand: me.hand,
      vp: me.vp,
      jobs: me.jobs,
      crises: me.crises,
      host: room.hostId === me.id
    } : null,
    game: game ? {
      turn: game.turn,
      currentPlayerId: game.currentPlayerId,
      market: game.market,
      deckCount: game.deck.length,
      discardCount: game.discard.length,
      phase: game.phase,
      crisis: game.crisis ? {
        card: game.crisis.card,
        submittedPlayerIds: Object.keys(game.crisis.submissions),
        submissions: game.crisis.phase === 'voting'
          ? Object.values(game.crisis.submissions).map(s => ({ playerId: s.playerId, cards: s.cards, pitch: s.pitch }))
          : [],
        votesCast: Object.keys(game.crisis.votes),
        phase: game.crisis.phase
      } : null,
      trade: game.trade && (game.trade.fromId === viewerId || game.trade.toId === viewerId)
        ? game.trade
        : game.trade ? { active: true, fromId: game.trade.fromId, toId: game.trade.toId } : null,
      log: game.log.slice(-12)
    } : null
  };
}
function emitRoom(room) {
  for (const p of room.players) {
    if (!p.socketId) continue;
    io.to(p.socketId).emit('room:state', publicRoom(room, p.id));
  }
}
function notify(socket, message, type = 'info') {
  socket.emit('toast', { message, type });
}
function addLog(room, text) {
  if (!room.game) return;
  room.game.log.push({ id: crypto.randomUUID(), text, at: Date.now() });
  if (room.game.log.length > 50) room.game.log.shift();
}
function advanceTurn(room) {
  const g = room.game;
  if (!g || room.status !== 'playing') return;
  if (g.deck.length === 0) {
    endGame(room);
    return;
  }
  g.turn += 1;
  const idx = room.players.findIndex(p => p.id === g.currentPlayerId);
  const next = room.players[(idx + 1 + room.players.length) % room.players.length];
  g.currentPlayerId = next.id;
  addLog(room, `ถึงตาของ ${next.name}`);
}
function endGame(room) {
  room.status = 'finished';
  if (room.game) {
    room.game.phase = 'finished';
    const max = Math.max(...room.players.map(p => p.vp));
    const names = room.players.filter(p => p.vp === max).map(p => p.name).join(', ');
    addLog(room, `เกมจบแล้ว — คะแนนสูงสุด ${max} VP: ${names}`);
  }
  emitRoom(room);
}
function refillMarket(room) {
  const g = room.game;
  while (g.market.length < 4 && g.professionDeck.length) g.market.push(g.professionDeck.shift());
}
function cardName(key) {
  return COMPETENCY_LIBRARY.find(c => c.key === key)?.name || key;
}
function startCrisis(room, crisisCard) {
  const g = room.game;
  g.phase = 'crisis';
  g.crisis = { card: crisisCard, phase: 'pitching', submissions: {}, votes: {} };
  addLog(room, `🚨 Crisis: ${crisisCard.name}`);
}
function resolveCrisisIfReady(room) {
  const g = room.game;
  if (!g?.crisis) return;
  const activeIds = room.players.map(p => p.id);
  const submissions = Object.keys(g.crisis.submissions);
  if (g.crisis.phase === 'pitching' && submissions.length >= activeIds.length) {
    g.crisis.phase = 'voting';
    addLog(room, 'เปิด Pitch ของทุกคนแล้ว เริ่มโหวตได้');
  }
  if (g.crisis.phase === 'voting') {
    if (activeIds.length === 1) {
      const winner = getPlayer(room, activeIds[0]);
      winner.crises.push(g.crisis.card);
      winner.vp += g.crisis.card.vp;
      addLog(room, `${winner.name} ได้ Crisis +${g.crisis.card.vp} VP`);
      g.crisis = null;
      g.phase = 'turn';
      advanceTurn(room);
      return;
    }
    const votes = Object.values(g.crisis.votes);
    if (votes.length >= activeIds.length) {
      const tally = {};
      for (const target of votes) tally[target] = (tally[target] || 0) + 1;
      const best = Math.max(...Object.values(tally));
      const tied = Object.entries(tally).filter(([, v]) => v === best).map(([id]) => id);
      const winnerId = tied[crypto.randomInt(tied.length)];
      const winner = getPlayer(room, winnerId);
      winner.crises.push(g.crisis.card);
      winner.vp += g.crisis.card.vp;
      addLog(room, `🏆 ${winner.name} ชนะ Crisis +${g.crisis.card.vp} VP`);
      g.crisis = null;
      g.phase = 'turn';
      advanceTurn(room);
    }
  }
}
function removePlayer(room, playerId, reason = 'left') {
  const idx = room.players.findIndex(p => p.id === playerId);
  if (idx < 0) return;
  const [removed] = room.players.splice(idx, 1);
  if (removed.socketId) socketIndex.delete(removed.socketId);
  if (room.players.length === 0) {
    rooms.delete(room.code);
    return;
  }
  if (room.hostId === playerId) room.hostId = room.players[0].id;
  if (room.game) {
    if (room.game.currentPlayerId === playerId) room.game.currentPlayerId = room.players[0].id;
    if (room.game.trade && [room.game.trade.fromId, room.game.trade.toId].includes(playerId)) room.game.trade = null;
    if (room.game.crisis) {
      delete room.game.crisis.submissions[playerId];
      delete room.game.crisis.votes[playerId];
      for (const [voter, target] of Object.entries(room.game.crisis.votes)) {
        if (target === playerId) delete room.game.crisis.votes[voter];
      }
      resolveCrisisIfReady(room);
    }
  }
  if (room.game) addLog(room, `${removed.name} ออกจากห้อง (${reason})`);
  emitRoom(room);
}

io.on('connection', socket => {
  socket.on('room:create', ({ name, sessionId }, cb) => {
    try {
      const code = roomCode();
      const player = {
        id: sessionId || crypto.randomUUID(),
        name: safeName(name),
        socketId: socket.id,
        connected: true,
        hand: [], jobs: [], crises: [], vp: 0
      };
      const room = { code, hostId: player.id, status: 'lobby', players: [player], game: null };
      rooms.set(code, room);
      socket.join(code);
      socketIndex.set(socket.id, { code, playerId: player.id });
      cb?.({ ok: true, code, playerId: player.id });
      emitRoom(room);
    } catch (e) { cb?.({ ok: false, error: 'สร้างห้องไม่สำเร็จ' }); }
  });

  socket.on('room:join', ({ code, name, sessionId }, cb) => {
    code = String(code || '').toUpperCase().trim();
    const room = rooms.get(code);
    if (!room) return cb?.({ ok: false, error: 'ไม่พบห้องนี้' });
    let player = sessionId ? getPlayer(room, sessionId) : null;
    if (player) {
      if (player.socketId) socketIndex.delete(player.socketId);
      player.socketId = socket.id;
      player.connected = true;
      player.name = safeName(name || player.name);
    } else {
      if (room.status !== 'lobby') return cb?.({ ok: false, error: 'เกมเริ่มไปแล้ว ไม่สามารถเข้ากลางเกมได้' });
      if (room.players.length >= 8) return cb?.({ ok: false, error: 'ห้องเต็มแล้ว (สูงสุด 8 คน)' });
      player = {
        id: sessionId || crypto.randomUUID(),
        name: safeName(name), socketId: socket.id, connected: true,
        hand: [], jobs: [], crises: [], vp: 0
      };
      room.players.push(player);
    }
    socket.join(code);
    socketIndex.set(socket.id, { code, playerId: player.id });
    cb?.({ ok: true, code, playerId: player.id });
    emitRoom(room);
  });

  socket.on('room:leave', () => {
    const ref = socketIndex.get(socket.id);
    const room = ref && rooms.get(ref.code);
    if (room) removePlayer(room, ref.playerId, 'leave');
  });

  socket.on('room:kick', ({ playerId }, cb) => {
    const ref = socketIndex.get(socket.id);
    const room = ref && rooms.get(ref.code);
    if (!room || room.hostId !== ref.playerId) return cb?.({ ok: false, error: 'เฉพาะเจ้าของห้องเท่านั้น' });
    if (playerId === room.hostId) return cb?.({ ok: false, error: 'เตะตัวเองไม่ได้' });
    const target = getPlayer(room, playerId);
    if (!target) return cb?.({ ok: false, error: 'ไม่พบผู้เล่น' });
    if (target.socketId) io.to(target.socketId).emit('room:kicked', { reason: 'เจ้าของห้องนำคุณออกจากห้อง' });
    removePlayer(room, playerId, 'kick');
    cb?.({ ok: true });
  });

  socket.on('room:disband', (_, cb) => {
    const ref = socketIndex.get(socket.id);
    const room = ref && rooms.get(ref.code);
    if (!room || room.hostId !== ref.playerId) return cb?.({ ok: false, error: 'เฉพาะเจ้าของห้องเท่านั้น' });
    io.to(room.code).emit('room:disbanded');
    for (const p of room.players) if (p.socketId) socketIndex.delete(p.socketId);
    rooms.delete(room.code);
    cb?.({ ok: true });
  });

  socket.on('game:start', (_, cb) => {
    const ref = socketIndex.get(socket.id);
    const room = ref && rooms.get(ref.code);
    if (!room || room.hostId !== ref.playerId) return cb?.({ ok: false, error: 'เฉพาะเจ้าของห้องเท่านั้น' });
    if (room.status !== 'lobby') return cb?.({ ok: false, error: 'เกมเริ่มแล้ว' });
    if (room.players.length < 2) return cb?.({ ok: false, error: 'ต้องมีผู้เล่นอย่างน้อย 2 คน' });
    const deck = makeCompetencyDeck();
    const professionDeck = shuffle(PROFESSIONS);
    for (const p of room.players) {
      p.hand = []; p.jobs = []; p.crises = []; p.vp = 0;
      while (p.hand.length < 5 && deck.length) {
        const c = deck.shift();
        if (c.kind === 'competency') p.hand.push(c);
        else deck.push(c); // keep crises out of initial deal
      }
    }
    const starter = room.players[crypto.randomInt(room.players.length)];
    room.game = {
      turn: 1,
      currentPlayerId: starter.id,
      deck: shuffle(deck),
      professionDeck,
      market: [],
      discard: [],
      phase: 'turn',
      crisis: null,
      trade: null,
      log: []
    };
    refillMarket(room);
    room.status = 'playing';
    addLog(room, `เกมเริ่มแล้ว — ${starter.name} ได้เริ่มก่อน`);
    cb?.({ ok: true });
    emitRoom(room);
  });

  socket.on('game:upskill', (_, cb) => {
    const ref = socketIndex.get(socket.id);
    const room = ref && rooms.get(ref.code);
    const g = room?.game;
    if (!room || room.status !== 'playing' || !g) return cb?.({ ok: false, error: 'เกมยังไม่พร้อม' });
    if (g.phase !== 'turn' || g.currentPlayerId !== ref.playerId) return cb?.({ ok: false, error: 'ยังไม่ใช่ตาของคุณ' });
    const p = getPlayer(room, ref.playerId);
    let drawn = 0;
    let crisisTriggered = false;
    while (drawn < 2 && g.deck.length) {
      const c = g.deck.shift();
      if (c.kind === 'crisis') {
        startCrisis(room, c);
        crisisTriggered = true;
        break;
      }
      p.hand.push(c); drawn++;
    }
    addLog(room, `${p.name} เลือก Upskill และจั่ว ${drawn} ใบ`);
    if (!crisisTriggered) advanceTurn(room);
    cb?.({ ok: true, drawn, crisis: crisisTriggered });
    emitRoom(room);
  });

  socket.on('game:apply', ({ professionId, cardIds }, cb) => {
    const ref = socketIndex.get(socket.id);
    const room = ref && rooms.get(ref.code);
    const g = room?.game;
    if (!g || g.phase !== 'turn' || g.currentPlayerId !== ref.playerId) return cb?.({ ok: false, error: 'ยังไม่ใช่ตาของคุณ' });
    const job = g.market.find(j => j.id === professionId);
    if (!job) return cb?.({ ok: false, error: 'ไม่พบอาชีพนี้ในตลาด' });
    const p = getPlayer(room, ref.playerId);
    const chosen = p.hand.filter(c => cardIds?.includes(c.id));
    const chosenKeys = chosen.map(c => c.key);
    const ok = job.requirements.every(req => chosenKeys.includes(req));
    if (!ok || chosen.length !== job.requirements.length) {
      return cb?.({ ok: false, error: 'การ์ดสมรรถนะที่เลือกยังไม่ตรงตามเงื่อนไข' });
    }
    p.hand = p.hand.filter(c => !cardIds.includes(c.id));
    g.discard.push(...chosen);
    p.jobs.push(job);
    p.vp += job.vp;
    g.market = g.market.filter(j => j.id !== professionId);
    refillMarket(room);
    addLog(room, `💼 ${p.name} สมัคร ${job.name} สำเร็จ +${job.vp} VP`);
    advanceTurn(room);
    cb?.({ ok: true });
    emitRoom(room);
  });

  socket.on('trade:offer', ({ toId, cardIds }, cb) => {
    const ref = socketIndex.get(socket.id);
    const room = ref && rooms.get(ref.code);
    const g = room?.game;
    if (!g || g.phase !== 'turn' || g.currentPlayerId !== ref.playerId) return cb?.({ ok: false, error: 'ยังไม่ใช่ตาของคุณ' });
    if (g.trade) return cb?.({ ok: false, error: 'มีคำขอแลกเปลี่ยนค้างอยู่' });
    if (toId === ref.playerId || !getPlayer(room, toId)) return cb?.({ ok: false, error: 'เลือกผู้เล่นไม่ถูกต้อง' });
    const from = getPlayer(room, ref.playerId);
    const selected = from.hand.filter(c => cardIds?.includes(c.id));
    if (selected.length !== 2) return cb?.({ ok: false, error: 'ต้องเสนอการ์ด 2 ใบ' });
    g.phase = 'trade';
    g.trade = {
      id: crypto.randomUUID(), fromId: from.id, toId,
      offeredCards: selected,
      createdAt: Date.now()
    };
    addLog(room, `${from.name} ส่งข้อเสนอ Networking`);
    cb?.({ ok: true });
    emitRoom(room);
  });

  socket.on('trade:respond', ({ accept, requestedCardId }, cb) => {
    const ref = socketIndex.get(socket.id);
    const room = ref && rooms.get(ref.code);
    const g = room?.game;
    const trade = g?.trade;
    if (!trade || trade.toId !== ref.playerId) return cb?.({ ok: false, error: 'ไม่มีคำขอแลกเปลี่ยนสำหรับคุณ' });
    const from = getPlayer(room, trade.fromId);
    const to = getPlayer(room, trade.toId);
    if (!accept) {
      addLog(room, `${to.name} ปฏิเสธข้อเสนอ Networking`);
      g.trade = null; g.phase = 'turn';
      advanceTurn(room);
      cb?.({ ok: true }); emitRoom(room); return;
    }
    const giveBack = to.hand.find(c => c.id === requestedCardId);
    const offerIds = trade.offeredCards.map(c => c.id);
    const stillHas = offerIds.every(id => from.hand.some(c => c.id === id));
    if (!giveBack || !stillHas) return cb?.({ ok: false, error: 'การ์ดสำหรับแลกไม่พร้อมแล้ว' });
    const offerCards = from.hand.filter(c => offerIds.includes(c.id));
    from.hand = from.hand.filter(c => !offerIds.includes(c.id));
    to.hand = to.hand.filter(c => c.id !== giveBack.id);
    to.hand.push(...offerCards);
    from.hand.push(giveBack);
    addLog(room, `🤝 ${from.name} และ ${to.name} แลกเปลี่ยนประสบการณ์สำเร็จ`);
    g.trade = null; g.phase = 'turn';
    advanceTurn(room);
    cb?.({ ok: true }); emitRoom(room);
  });

  socket.on('crisis:submit', ({ cardIds, pitch }, cb) => {
    const ref = socketIndex.get(socket.id);
    const room = ref && rooms.get(ref.code);
    const crisis = room?.game?.crisis;
    if (!crisis || crisis.phase !== 'pitching') return cb?.({ ok: false, error: 'ไม่อยู่ในช่วง Pitching' });
    const p = getPlayer(room, ref.playerId);
    const selected = p.hand.filter(c => cardIds?.includes(c.id));
    if (selected.length < 1 || selected.length > 2) return cb?.({ ok: false, error: 'เลือกสมรรถนะ 1-2 ใบ' });
    const text = String(pitch || '').trim().slice(0, 500);
    if (text.length < 5) return cb?.({ ok: false, error: 'อธิบายวิธีแก้ปัญหาอย่างน้อย 5 ตัวอักษร' });
    crisis.submissions[p.id] = { playerId: p.id, cards: selected, pitch: text };
    addLog(room, `${p.name} ส่ง Pitch แล้ว`);
    resolveCrisisIfReady(room);
    cb?.({ ok: true }); emitRoom(room);
  });

  socket.on('crisis:vote', ({ playerId }, cb) => {
    const ref = socketIndex.get(socket.id);
    const room = ref && rooms.get(ref.code);
    const crisis = room?.game?.crisis;
    if (!crisis || crisis.phase !== 'voting') return cb?.({ ok: false, error: 'ยังไม่เปิดโหวต' });
    if (playerId === ref.playerId) return cb?.({ ok: false, error: 'โหวตให้ตัวเองไม่ได้' });
    if (!crisis.submissions[playerId]) return cb?.({ ok: false, error: 'ไม่พบ Pitch นี้' });
    if (crisis.votes[ref.playerId]) return cb?.({ ok: false, error: 'คุณโหวตแล้ว' });
    crisis.votes[ref.playerId] = playerId;
    resolveCrisisIfReady(room);
    cb?.({ ok: true }); emitRoom(room);
  });

  socket.on('game:request-state', (_, cb) => {
    const ref = socketIndex.get(socket.id);
    const room = ref && rooms.get(ref.code);
    cb?.(room ? { ok: true, state: publicRoom(room, ref.playerId) } : { ok: false });
  });

  socket.on('disconnect', () => {
    const ref = socketIndex.get(socket.id);
    if (!ref) return;
    const room = rooms.get(ref.code);
    const p = room && getPlayer(room, ref.playerId);
    socketIndex.delete(socket.id);
    if (p && p.socketId === socket.id) {
      p.socketId = null;
      p.connected = false;
      emitRoom(room);
    }
  });
});

server.listen(PORT, () => console.log(`Skill Canvas running on http://localhost:${PORT}`));
