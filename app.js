/* 乘和除的關係 — classroom game (static, GitHub Pages ready) */
const QUESTIONS = [
  { total: 8, cols: 4, rows: 2, kind: "apple", kindName: "蘋果",
    hint: "共有 8 個蘋果。請用環線圈成數量相同的組，再寫出四條乘除算式家庭。" },
  { total: 12, cols: 4, rows: 3, kind: "cake", kindName: "蛋糕",
    hint: "共有 12 個蛋糕。試吓自己分組，再寫出呢組乘除算式家庭。" },
  { total: 20, cols: 5, rows: 4, kind: "pencil", kindName: "鉛筆",
    hint: "共有 20 支鉛筆。用環線圈成數量相同的組，再寫出四條算式。" },
  { total: 24, cols: 6, rows: 4, kind: "ball", kindName: "皮球",
    hint: "共有 24 個皮球。試吓另一種分組，寫出乘除算式家庭。" }
];

const LOOP_COLORS = ["#e11d48", "#2563eb", "#059669", "#a855f7", "#d97706", "#0f766e"];
const ROWS = [
  { type: "mul", op: "×" },
  { type: "mul", op: "×" },
  { type: "div", op: "÷" },
  { type: "div", op: "÷" }
];
const CLASS_SIZE = 40;
const TEACHER_PIN = "2468";
const CHANNEL_PREFIX = "kayee-p2md-v1-";
const PUB_KEY = "demo";
const SUB_KEY = "demo";
const STORE_KEY = "p2-multiply-divide-v1";
const ONLINE_STALE_MS = 90000;
const PUBLIC_SITE_URL = "https://wkyee-class.github.io/p2-multiply-divide/";
const CLASS_CODE_PARAM = "c";

const SVGS = {
  apple: `<svg viewBox="0 0 120 130" aria-hidden="true">
    <ellipse cx="60" cy="118" rx="28" ry="6" fill="rgba(58,36,21,0.16)"/>
    <path d="M60 28c8 10 8 18 0 22-8-4-8-12 0-22z" fill="#2f9e44"/>
    <path d="M62 24c16-8 26-6 28 0-12 6-20 14-26 24-8-10-10-16-8-22 4 0 4 0 6-2z" fill="#3aa34a"/>
    <path d="M34 52c-14 22-10 50 8 62 12 8 24 6 18-8 16 16 36 10 42-8 8-24-2-52-22-62-8-4-18-2-24 4-6-8-16-8-22 12z" fill="#e23d2d"/>
    <path d="M40 58c6-16 16-22 26-18-12 10-18 24-22 40-8-4-10-12-4-22z" fill="#f08a7a"/>
  </svg>`,
  cake: `<svg viewBox="0 0 120 130" aria-hidden="true">
    <ellipse cx="60" cy="118" rx="32" ry="6" fill="rgba(58,36,21,0.16)"/>
    <path d="M28 78c0 22 14 34 32 34s32-12 32-34" fill="#f3c4d8"/>
    <path d="M28 78c4 8 10 10 16 8 8-3 10-8 16-8s8 5 16 8c6 2 12 0 16-8" fill="#eea8c4"/>
    <path d="M24 70c8-22 20-34 36-34s28 12 36 34c-10 8-22 12-36 12S34 78 24 70z" fill="#fff7fb"/>
    <circle cx="60" cy="34" r="11" fill="#e11d48"/>
    <path d="M60 24c6-10 14-12 16-8-8 2-12 8-16 14-4-6-6-8-8-10 4 0 6 2 8 4z" fill="#2f9e44"/>
  </svg>`,
  pencil: `<svg viewBox="0 0 120 130" aria-hidden="true">
    <ellipse cx="60" cy="118" rx="26" ry="6" fill="rgba(58,36,21,0.16)"/>
    <path d="M48 18l24 0 10 80-44 0z" fill="#f2c14e"/>
    <path d="M48 18h24l-2 12h-20z" fill="#d84b4b"/>
    <path d="M44 98l32 0-16 20z" fill="#e7c39a"/>
    <path d="M56 110l8 0-4 8z" fill="#333"/>
    <path d="M50 30h20v8h-20z" fill="#e5a82e"/>
  </svg>`,
  ball: `<svg viewBox="0 0 120 130" aria-hidden="true">
    <ellipse cx="60" cy="118" rx="30" ry="6" fill="rgba(58,36,21,0.16)"/>
    <circle cx="60" cy="64" r="40" fill="#f27a1a"/>
    <path d="M60 24c22 10 32 28 32 40s-10 30-32 40c-22-10-32-28-32-40s10-30 32-40z" fill="none" stroke="#fff" stroke-width="5"/>
    <path d="M28 50h64M28 78h64" fill="none" stroke="#fff" stroke-width="5"/>
    <circle cx="48" cy="50" r="5" fill="#fff" opacity=".35"/>
  </svg>`
};

const $ = (id) => document.getElementById(id);

const app = {
  role: null,
  mode: "home", // home | class | solo
  studentNo: null,
  pin: "",
  joinCode: "",
  roomCode: "",
  cloud: null,
  lastMsgAt: 0,
  qIndex: 0,
  loops: [],
  drawing: null,
  drag: null,
  equations: ROWS.map(() => ["", "", ""]),
  active: { row: 0, col: 0 },
  checkResult: null,
  submitted: false,
  inspectNo: null,
  inspectQ: 0,
  onlineNamesOpen: false,
  syncLabel: "尚未同步",
  pollTimer: null,
  presenceTimer: null,
  channel: null,
  syncFailCount: 0,
  demoMode: false,
  demoProject: false,
  pendingClassCode: "",
  entryJoinUrl: ""
};

const SYNC_POLL_MS = 2500;
const SYNC_BACKOFF_MAX_MS = 20000;
const HISTORY_COUNT = 100;
const HISTORY_TIMEOUT_MS = 5000;

function emptyCloud(code) {
  return {
    code,
    unlockedQuestion: 0,
    reveal: false,
    broadcast: null,
    studentWork: {},
    online: {},
    updatedAt: Date.now(),
    roundId: "r" + Date.now()
  };
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.toggle("active", el.id === id));
  document.body.classList.remove("mode-play", "mode-broadcast", "mode-inspect", "mode-demo", "drawing-lock");
  document.documentElement.classList.remove("drawing-lock");
  if (id !== "screen-demo") {
    app.demoMode = false;
    app.demoProject = false;
    document.body.classList.remove("demo-project");
  }
  if (id === "screen-play") document.body.classList.add("mode-play");
  if (id === "screen-broadcast") document.body.classList.add("mode-broadcast");
  if (id === "screen-inspect") document.body.classList.add("mode-inspect");
  if (id === "screen-demo") {
    app.demoMode = true;
    document.body.classList.add("mode-demo");
    document.body.classList.toggle("demo-project", !!app.demoProject);
  }
}

function currentQ() { return QUESTIONS[app.qIndex]; }

function svgFor(kind) {
  return (SVGS[kind] || SVGS.apple) + `<div class="halo"></div>`;
}

function genRoomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function channelName(code) {
  return CHANNEL_PREFIX + String(code);
}

/* ---------- local + cloud sync ---------- */
let bc = null;
try { bc = new BroadcastChannel(STORE_KEY); } catch (e) { bc = null; }

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch (e) { return {}; }
}
function saveStore(map) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(map)); } catch (e) {}
}
function saveRoomLocal(state) {
  const map = loadStore();
  map[state.code] = state;
  saveStore(map);
}

function publishLocal(msg) {
  if (bc) {
    try { bc.postMessage(msg); } catch (e) {}
  }
}

async function publishCloud(msg) {
  publishLocal(msg);
  const code = (msg.state && msg.state.code) || app.roomCode;
  if (!code) return;
  const ch = encodeURIComponent(channelName(code));
  try {
    await fetch(`https://ps.pndsn.com/publish/${PUB_KEY}/${SUB_KEY}/0/${ch}/0?store=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg)
    });
    app.syncLabel = "雲端已同步";
  } catch (e) {
    app.syncLabel = "本機同步（雲端暫時未能連接）";
  }
}

async function fetchHistory(code) {
  const ch = encodeURIComponent(channelName(code));
  const url = `https://ps.pndsn.com/v2/history/sub-key/${SUB_KEY}/channel/${ch}?count=${HISTORY_COUNT}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), HISTORY_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error("history");
    const data = await res.json();
    return (data && data[0]) || [];
  } finally {
    clearTimeout(timer);
  }
}

function applyMessage(msg, opts) {
  if (!msg || typeof msg !== "object") return;
  const at = Number(msg.at) || 0;
  if (at && at < app.lastMsgAt - 50) return;
  if (at) app.lastMsgAt = Math.max(app.lastMsgAt, at);

  if (msg.type === "state" && msg.state) {
    const incoming = msg.state;
    if (!app.cloud || incoming.updatedAt >= (app.cloud.updatedAt || 0) || incoming.roundId !== app.cloud.roundId) {
      mergeCloud(incoming);
    }
  } else if (msg.type === "work" && msg.work) {
    if (!app.cloud) return;
    const no = String(msg.work.studentNo);
    const prev = app.cloud.studentWork[no];
    if (!prev || (msg.work.updatedAt || 0) >= (prev.updatedAt || 0)) {
      app.cloud.studentWork[no] = msg.work;
    }
  } else if (msg.type === "presence") {
    if (!app.cloud) return;
    const key = msg.role === "teacher" ? "teacher" : "s:" + msg.no;
    app.cloud.online[key] = { no: msg.no, role: msg.role, at: msg.at || Date.now() };
  }
  if (!opts || !opts.silent) afterCloudChange();
}

function pickNewerWorks(a, b) {
  const out = Object.assign({}, a || {});
  Object.keys(b || {}).forEach((k) => {
    if (!out[k] || ((b[k].updatedAt || 0) >= (out[k].updatedAt || 0))) out[k] = b[k];
  });
  return out;
}
function pickNewerOnline(a, b) {
  const out = Object.assign({}, a || {});
  Object.keys(b || {}).forEach((k) => {
    if (!out[k] || ((b[k].at || 0) >= (out[k].at || 0))) out[k] = b[k];
  });
  return out;
}
function mergeCloud(incoming) {
  if (!incoming) return;
  const prev = app.cloud;
  const prevRound = prev && prev.roundId;
  const wasProvisional = !!(prev && prev.provisional);
  if (incoming.provisional && prev && !prev.provisional) return;
  if (prev && (incoming.roundId === prev.roundId || wasProvisional)) {
    incoming.studentWork = pickNewerWorks(prev.studentWork, incoming.studentWork);
    incoming.online = pickNewerOnline(prev.online, incoming.online);
  }
  app.cloud = incoming;
  if (!incoming.provisional) delete app.cloud.provisional;
  if (prevRound && incoming.roundId !== prevRound && !wasProvisional && app.mode === "class" && app.role === "student") {
    startQuestion(incoming.unlockedQuestion || 0);
  }
}

function afterCloudChange() {
  if (app.role === "teacher") {
    if ($("screen-console").classList.contains("active")) renderConsole();
    if ($("screen-inspect").classList.contains("active")) renderInspect();
    if ($("screen-room").classList.contains("active")) updateRoomStatus();
    updateTeacherSync();
  }
  if (app.role === "student" && app.mode === "class") applyTeacherDirectives();
}

function applyTeacherDirectives() {
  if (!app.cloud) return;
  const bcst = app.cloud.broadcast;
  if (bcst) {
    if (!$("screen-broadcast").classList.contains("active")) showScreen("screen-broadcast");
    renderBroadcast();
    return;
  }
  if ($("screen-broadcast").classList.contains("active")) {
    showScreen("screen-play");
    startQuestion(app.qIndex, true);
  }
  const unlocked = app.cloud.unlockedQuestion || 0;
  if (app.qIndex !== unlocked && $("screen-play").classList.contains("active")) {
    saveCurrentWork();
    startQuestion(unlocked, true);
  }
  updateNextButton();
  updateStudentSyncBar();
}

function pruneOnline(state) {
  const now = Date.now();
  const online = {};
  Object.keys(state.online || {}).forEach((k) => {
    const info = state.online[k];
    if (info && now - (info.at || 0) < ONLINE_STALE_MS) online[k] = info;
  });
  state.online = online;
}

function teacherPublishState() {
  if (!app.cloud) return;
  app.cloud.updatedAt = Date.now();
  pruneOnline(app.cloud);
  saveRoomLocal(app.cloud);
  publishCloud({ type: "state", at: app.cloud.updatedAt, state: app.cloud });
  updateTeacherSync();
}

function studentPublishWork(lastEvent) {
  if (app.demoMode) return;
  if (app.mode !== "class" || !app.studentNo || !app.cloud) return;
  const work = buildStudentWork(lastEvent);
  app.cloud.studentWork[String(app.studentNo)] = work;
  saveRoomLocal(app.cloud);
  publishCloud({ type: "work", at: work.updatedAt, work });
}

function sendPresence() {
  if (!app.roomCode) return;
  const msg = {
    type: "presence",
    at: Date.now(),
    role: app.role,
    no: app.role === "student" ? app.studentNo : "teacher"
  };
  if (app.cloud) {
    const key = app.role === "teacher" ? "teacher" : "s:" + app.studentNo;
    app.cloud.online[key] = { no: msg.no, role: app.role, at: msg.at };
    saveRoomLocal(app.cloud);
  }
  // Teacher re-publishes the full classroom state every presence tick
  // so the official state is not evicted from PubNub demo history.
  if (app.role === "teacher" && app.cloud && !app.cloud.provisional) {
    teacherPublishState();
    return;
  }
  publishCloud(msg);
}

function startSync() {
  stopSync();
  if (bc) {
    bc.onmessage = (ev) => applyMessage(ev.data);
  }
  window.addEventListener("storage", onStorage);
  window.addEventListener("online", onNetworkOnline);
  app.syncFailCount = 0;
  app.presenceTimer = setInterval(sendPresence, 15000);
  sendPresence();
  pollHistory();
  schedulePoll();
}

function schedulePoll() {
  if (app.pollTimer) clearTimeout(app.pollTimer);
  const fails = app.syncFailCount || 0;
  const delay = !fails ? SYNC_POLL_MS : Math.min(SYNC_BACKOFF_MAX_MS, SYNC_POLL_MS * Math.pow(2, fails));
  app.pollTimer = setTimeout(async () => {
    await pollHistory();
    if (app.roomCode) schedulePoll();
  }, delay);
}

function stopSync() {
  if (app.pollTimer) clearTimeout(app.pollTimer);
  if (app.presenceTimer) clearInterval(app.presenceTimer);
  app.pollTimer = app.presenceTimer = null;
  window.removeEventListener("storage", onStorage);
  window.removeEventListener("online", onNetworkOnline);
}

function onNetworkOnline() {
  if (!app.roomCode) return;
  app.syncFailCount = 0;
  if (app.syncLabel !== "雲端已同步") app.syncLabel = "正在連接課堂…";
  pollHistory();
  schedulePoll();
  if (app.role === "student" && app.mode === "class") updateStudentSyncBar();
  if (app.role === "teacher") updateTeacherSync();
}

function onStorage(ev) {
  if (ev.key !== STORE_KEY || !app.roomCode) return;
  const map = loadStore();
  if (map[app.roomCode]) {
    mergeCloud(map[app.roomCode]);
    afterCloudChange();
  }
}

async function pollHistory() {
  if (!app.roomCode) return;
  try {
    const list = await fetchHistory(app.roomCode);
    list.forEach((msg) => applyMessage(msg, { silent: true }));
    app.syncFailCount = 0;
    app.syncLabel = "雲端已同步";
    afterCloudChange();
  } catch (e) {
    app.syncFailCount = (app.syncFailCount || 0) + 1;
    const map = loadStore();
    if (map[app.roomCode] && !(app.cloud && app.cloud.provisional)) {
      mergeCloud(map[app.roomCode]);
    }
    if (app.syncLabel !== "雲端已同步") app.syncLabel = "正在連接課堂…";
    afterCloudChange();
  }
}

function normalizeClassCode(code) {
  const raw = String(code || "").replace(/\D/g, "");
  if (!/^\d{4}$/.test(raw)) return { ok: false, error: "請輸入四位課堂編號。" };
  return { ok: true, code: raw };
}

function localRoomState(code) {
  try { return loadStore()[code] || null; } catch (e) { return null; }
}

function stateFromHistory(list) {
  let found = null;
  (list || []).forEach((msg) => {
    if (msg && msg.type === "state" && msg.state) found = msg.state;
    else if (msg && found) applyInto(found, msg);
  });
  return found;
}

function adoptRoom(code, state, asTeacher) {
  const use = state || Object.assign(emptyCloud(code), { provisional: true, updatedAt: 0 });
  app.roomCode = code;
  app.cloud = use;
  app.lastMsgAt = (use && !use.provisional && use.updatedAt) || 0;
  startSync();
  if (asTeacher && app.cloud && !app.cloud.provisional) teacherPublishState();
}

// Teacher rejoin still tries history (to recover student work), but never
// refuses a valid 4-digit code if history is empty or the fetch fails.
async function joinExistingRoom(code, asTeacher) {
  const parsed = normalizeClassCode(code);
  if (!parsed.ok) return parsed;
  const raw = parsed.code;
  let found = localRoomState(raw);
  try {
    const fromCloud = stateFromHistory(await fetchHistory(raw));
    if (fromCloud) found = fromCloud;
  } catch (e) {}
  adoptRoom(raw, found, asTeacher);
  return { ok: true };
}

function applyInto(state, msg) {
  if (msg.type === "work" && msg.work) state.studentWork[String(msg.work.studentNo)] = msg.work;
  if (msg.type === "presence") {
    const key = msg.role === "teacher" ? "teacher" : "s:" + msg.no;
    state.online[key] = { no: msg.no, role: msg.role, at: msg.at || Date.now() };
  }
}

/* ---------- landing / student number / join ---------- */
function goHome() {
  stopSync();
  app.role = null;
  app.mode = "home";
  app.studentNo = null;
  app.roomCode = "";
  app.cloud = null;
  app.pin = "";
  app.joinCode = "";
  app.pendingClassCode = "";
  app.demoMode = false;
  app.demoProject = false;
  app.syncFailCount = 0;
  try { document.documentElement.classList.remove("prejoin"); } catch (e) {}
  showScreen("screen-landing");
}

function publicJoinUrl(code) {
  // Always encode the public GitHub Pages URL so a projected QR works in class.
  // Never use localhost / 127.0.0.1, even during local preview.
  const base = PUBLIC_SITE_URL.endsWith("/") ? PUBLIC_SITE_URL : PUBLIC_SITE_URL + "/";
  return base + "?" + CLASS_CODE_PARAM + "=" + encodeURIComponent(String(code));
}

function readClassCodeFromUrl() {
  try {
    const raw = new URLSearchParams(location.search).get(CLASS_CODE_PARAM) || "";
    const parsed = normalizeClassCode(raw);
    return parsed.ok ? parsed.code : "";
  } catch (e) {
    return "";
  }
}

function clearClassCodeFromUrl() {
  try {
    const url = new URL(location.href);
    if (!url.searchParams.has(CLASS_CODE_PARAM)) return;
    url.searchParams.delete(CLASS_CODE_PARAM);
    const qs = url.searchParams.toString();
    history.replaceState({}, "", url.pathname + (qs ? "?" + qs : "") + url.hash);
  } catch (e) {}
}

function openNumberGrid() {
  renderNumGrid();
  const sub = $("numbers-sub");
  if (sub) {
    sub.textContent = app.pendingClassCode
      ? "已備好課堂，揀學號就可以加入（不用再輸入編號）"
      : "請點選自己的學號（不用輸入姓名或班別）";
  }
  showScreen("screen-numbers");
}

function leaveNumberGrid() {
  if (app.pendingClassCode) {
    app.pendingClassCode = "";
    clearClassCodeFromUrl();
  }
  goHome();
}

function renderNumGrid() {
  const root = $("num-grid");
  root.innerHTML = "";
  for (let n = 1; n <= CLASS_SIZE; n++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "num-btn";
    b.textContent = String(n);
    b.addEventListener("click", () => chooseNumber(n));
    root.append(b);
  }
}

function chooseNumber(n) {
  app.studentNo = n;
  app.role = "student";
  if (app.pendingClassCode) {
    app.joinCode = app.pendingClassCode;
    studentJoinWithCode(app.pendingClassCode);
    return;
  }
  app.joinCode = "";
  $("join-student-label").textContent = "學號 " + n;
  $("join-code-display").textContent = "____";
  $("join-error").textContent = "";
  showScreen("screen-join");
}

function renderPad(rootId, getValue, setValue, maxLen, mask) {
  const root = $(rootId);
  root.innerHTML = "";
  ["1","2","3","4","5","6","7","8","9","清除","0","刪除"].forEach((k) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = k;
    b.addEventListener("click", () => {
      let v = getValue();
      if (k === "清除") v = "";
      else if (k === "刪除") v = v.slice(0, -1);
      else if (v.length < maxLen) v += k;
      setValue(v);
    });
    root.append(b);
  });
}

function setJoinCode(v) {
  app.joinCode = v.slice(0, 4);
  $("join-code-display").textContent = app.joinCode || "____";
  $("join-error").textContent = "";
}
function setPin(v) {
  app.pin = v.slice(0, 4);
  $("pin-display").textContent = app.pin ? "•".repeat(app.pin.length) : "••••";
  $("pin-error").textContent = "";
}

function studentJoinClass() {
  $("join-error").textContent = "";
  studentJoinWithCode(app.joinCode, $("join-error"));
}

function studentJoinWithCode(code, errorEl) {
  const parsed = normalizeClassCode(code);
  if (!parsed.ok) {
    if (errorEl) errorEl.textContent = parsed.error;
    return false;
  }
  // Never block entry on cloud history. Start with local or empty state and
  // sync in the background (any Wi-Fi / any iPad).
  const found = localRoomState(parsed.code);
  app.mode = "class";
  app.syncLabel = "正在連接課堂…";
  adoptRoom(parsed.code, found, false);
  enterPlay(app.cloud.unlockedQuestion || 0);
  return true;
}

function studentSolo() {
  app.mode = "solo";
  app.roomCode = "";
  app.cloud = null;
  stopSync();
  enterPlay(0);
}

function enterPlay(index) {
  showScreen("screen-play");
  $("who").textContent = "學號 " + app.studentNo + (app.mode === "solo" ? "　單機練習" : "");
  startQuestion(index);
  updateStudentSyncBar();
}

function updateStudentSyncBar() {
  const bar = $("student-sync-bar");
  if (app.mode === "solo") {
    bar.innerHTML = `<div class="sync-pill">單機練習：網絡不穩亦可完成四題</div>`;
    return;
  }
  const code = app.roomCode || "----";
  bar.innerHTML = "";
  const a = document.createElement("div");
  a.className = "sync-pill";
  a.textContent = "課堂：" + code;
  const b = document.createElement("div");
  b.className = "sync-pill " + (app.syncLabel.indexOf("已同步") >= 0 ? "on" : "off");
  b.textContent = app.syncLabel;
  bar.append(a, b);
}

/* ---------- game ---------- */
function startQuestion(index, skipReport) {
  const q = Math.max(0, Math.min(3, index));
  const saved = restoreWork(q);
  app.qIndex = q;
  if (!saved) {
    app.loops = [];
    app.drawing = null;
    app.drag = null;
    app.equations = ROWS.map(() => ["", "", ""]);
    app.active = { row: 0, col: 0 };
    app.checkResult = null;
    app.submitted = false;
  }
  $("feedback").className = "feedback";
  $("feedback").textContent = "";
  $("wait-next").classList.add("hidden");
  $("play-main").classList.remove("hidden");
  renderQuestion();
  updateNextButton();
  if (!skipReport) report("question");
}

function restoreWork(qIndex) {
  if (app.mode !== "class" || !app.cloud || !app.studentNo) return false;
  const work = app.cloud.studentWork[String(app.studentNo)];
  const rec = work && work.questions && work.questions[String(qIndex)];
  if (!rec) return false;
  app.loops = [];
  app.pendingLoops = rec.loops || [];
  app.equations = (rec.equations || ROWS.map(() => ["", "", ""])).map((r) => r.slice());
  app.checkResult = rec.checkResult || null;
  app.submitted = !!rec.submitted;
  app.active = { row: 0, col: 0 };
  return true;
}

function renderQuestion() {
  const q = currentQ();
  $("progress").textContent = `第 ${app.qIndex + 1} 題／共 4 題`;
  $("q-title").textContent = `${q.kindName}：共 ${q.total} 個`;
  $("hint").textContent = q.hint;
  const items = $("items");
  items.style.gridTemplateColumns = `repeat(${q.cols}, 1fr)`;
  items.style.gridTemplateRows = `repeat(${q.rows}, 1fr)`;
  items.innerHTML = "";
  for (let i = 0; i < q.total; i++) {
    const el = document.createElement("div");
    el.className = "item";
    el.dataset.index = i;
    el.innerHTML = svgFor(q.kind);
    items.append(el);
  }
  renderEquations($("equations"), app.equations, app.active, true);
  renderKeys();
  updateCheckButton();
  requestAnimationFrame(() => {
    const overlay = $("overlay");
    syncOverlayBox(overlay);
    if (app.pendingLoops) {
      app.loops = denormalizeLoops(app.pendingLoops, overlay);
      app.pendingLoops = null;
    }
    renderLoops();
    showStudentFeedback();
    updateStudentSyncBar();
  });
}

function updateNextButton() {
  const btn = $("btn-next");
  if (app.mode === "solo") {
    btn.disabled = false;
    btn.textContent = app.qIndex < 3 ? "下一題" : "完成";
    $("wait-next").classList.add("hidden");
    return;
  }
  const unlocked = (app.cloud && app.cloud.unlockedQuestion) || 0;
  if (app.qIndex < 3 && unlocked > app.qIndex) {
    btn.disabled = false;
    btn.textContent = "下一題";
    $("wait-next").classList.add("hidden");
  } else if (app.qIndex >= 3) {
    btn.disabled = false;
    btn.textContent = "完成";
    $("wait-next").classList.add("hidden");
  } else {
    btn.disabled = true;
    btn.textContent = "請等老師進入下一題";
  }
}

function renderEquations(root, equations, active, interactive) {
  root.innerHTML = "";
  ROWS.forEach((row, r) => {
    const wrap = document.createElement("div");
    wrap.className = "eq" + (interactive ? "" : " readonly");
    const blank = (c) => {
      const b = document.createElement("div");
      b.className = "blank" + (interactive && active && active.row === r && active.col === c ? " active" : "");
      b.textContent = (equations[r] && equations[r][c]) || "";
      if (interactive) b.addEventListener("click", () => { app.active = { row: r, col: c }; renderEquations(root, equations, app.active, true); });
      return b;
    };
    const op = document.createElement("div"); op.className = "op"; op.textContent = row.op;
    const eq = document.createElement("div"); eq.className = "eqspan"; eq.textContent = "=";
    wrap.append(blank(0), op, blank(1), eq, blank(2));
    root.append(wrap);
  });
}

function renderKeys(rootId) {
  const root = $(rootId || boardIds().keys);
  if (!root || root.dataset.ready) return;
  ["1","2","3","4","5","6","7","8","9","0","刪除","清空此格"].forEach((k) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = k;
    if (k === "刪除") b.addEventListener("click", backspace);
    else if (k === "清空此格") b.addEventListener("click", () => {
      app.equations[app.active.row][app.active.col] = "";
      renderEquations($(boardIds().equations), app.equations, app.active, true);
      report("typing");
    });
    else b.addEventListener("click", () => typeInto(k));
    root.append(b);
  });
  root.dataset.ready = "1";
}

function typeInto(ch) {
  if (!isBoardScreenActive()) return;
  const { row, col } = app.active;
  const cur = app.equations[row][col];
  if (cur.length >= 3 || !/^[0-9]$/.test(ch)) return;
  app.equations[row][col] = cur === "0" ? ch : cur + ch;
  renderEquations($(boardIds().equations), app.equations, app.active, true);
  report("typing");
}
function backspace() {
  if (!isBoardScreenActive()) return;
  const { row, col } = app.active;
  app.equations[row][col] = app.equations[row][col].slice(0, -1);
  renderEquations($(boardIds().equations), app.equations, app.active, true);
  report("typing");
}

function syncOverlayBox(overlay) {
  const board = overlay.parentElement;
  const w = overlay.clientWidth || (board && board.clientWidth) || 1;
  const h = overlay.clientHeight || (board && board.clientHeight) || 1;
  overlay.setAttribute("viewBox", `0 0 ${w} ${h}`);
  return { w, h };
}

function loopPath(loop) {
  return `M ${loop.cx - loop.rx} ${loop.cy} a ${loop.rx} ${loop.ry} 0 1 0 ${loop.rx * 2} 0 a ${loop.rx} ${loop.ry} 0 1 0 ${-loop.rx * 2} 0`;
}

function normalizeLoops(loops, overlay) {
  const w = overlay.viewBox.baseVal.width || overlay.clientWidth || 1;
  const h = overlay.viewBox.baseVal.height || overlay.clientHeight || 1;
  return loops.map((l) => ({
    id: l.id, nx: l.cx / w, ny: l.cy / h, nrx: l.rx / w, nry: l.ry / h, color: l.color
  }));
}
function denormalizeLoops(nloops, overlay) {
  const w = overlay.viewBox.baseVal.width || overlay.clientWidth || 1;
  const h = overlay.viewBox.baseVal.height || overlay.clientHeight || 1;
  return (nloops || []).map((l) => ({
    id: l.id,
    cx: l.nx != null ? l.nx * w : l.cx,
    cy: l.ny != null ? l.ny * h : l.cy,
    rx: l.nrx != null ? l.nrx * w : l.rx,
    ry: l.nry != null ? l.nry * h : l.ry,
    color: l.color
  }));
}

function paintLoops(overlay, loops, drawing) {
  const all = loops.slice();
  if (drawing) all.push(drawing);
  overlay.innerHTML = all.map((loop) =>
    `<path d="${loopPath(loop)}" fill="${loop.color}" fill-opacity="0.10" stroke="${loop.color}" stroke-width="6"></path>`
  ).join("");
}

function boardIds() {
  if (app.demoMode) {
    return {
      board: "demo-board",
      items: "demo-items",
      overlay: "demo-overlay",
      tools: "demo-loop-tools",
      group: "demo-group-live",
      equations: "demo-equations",
      keys: "demo-numkeys"
    };
  }
  return {
    board: "board",
    items: "items",
    overlay: "overlay",
    tools: "loop-tools",
    group: "group-live",
    equations: "equations",
    keys: "numkeys"
  };
}

function isBoardScreenActive() {
  return $("screen-play").classList.contains("active") ||
    ($("screen-demo") && $("screen-demo").classList.contains("active"));
}

function renderLoops() {
  const ids = boardIds();
  const overlay = $(ids.overlay);
  if (!overlay) return;
  syncOverlayBox(overlay);
  paintLoops(overlay, app.loops, app.drawing);
  renderLoopTools();
  colorItems(ids.items, ids.overlay, app.loops);
  updateGroupLive();
}

function renderLoopTools() {
  const ids = boardIds();
  const overlay = $(ids.overlay);
  const board = $(ids.board);
  const toolsRoot = $(ids.tools);
  if (!overlay || !board || !toolsRoot) return;
  toolsRoot.innerHTML = "";
  const rect = overlay.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();
  const vbW = overlay.viewBox.baseVal.width || rect.width;
  const vbH = overlay.viewBox.baseVal.height || rect.height;
  app.loops.forEach((loop) => {
    const tools = document.createElement("div");
    tools.className = "loop-tools";
    tools.style.left = `${loop.cx * (rect.width / vbW) + (rect.left - boardRect.left)}px`;
    tools.style.top = `${(loop.cy - loop.ry) * (rect.height / vbH) + (rect.top - boardRect.top)}px`;
    const del = document.createElement("button");
    del.textContent = "刪除圈";
    del.style.background = loop.color;
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      app.loops = app.loops.filter((l) => l.id !== loop.id);
      renderLoops();
      report("grouping");
    });
    tools.append(del);
    toolsRoot.append(tools);
  });
}

function itemCenters(itemsId, overlayId) {
  const overlay = $(overlayId);
  const rect = overlay.getBoundingClientRect();
  const vbW = overlay.viewBox.baseVal.width || rect.width || 1;
  const vbH = overlay.viewBox.baseVal.height || rect.height || 1;
  return [...document.querySelectorAll("#" + itemsId + " .item")].map((el) => {
    const r = el.getBoundingClientRect();
    return {
      el,
      x: ((r.left + r.width / 2) - rect.left) * (vbW / rect.width),
      y: ((r.top + r.height / 2) - rect.top) * (vbH / rect.height)
    };
  });
}

function insideLoop(px, py, loop) {
  const dx = (px - loop.cx) / Math.max(loop.rx, 1);
  const dy = (py - loop.cy) / Math.max(loop.ry, 1);
  return dx * dx + dy * dy <= 1;
}

function colorItems(itemsId, overlayId, loops) {
  itemCenters(itemsId, overlayId).forEach(({ el, x, y }) => {
    const hit = [...loops].reverse().find((loop) => insideLoop(x, y, loop));
    el.classList.toggle("in-loop", !!hit);
    const halo = el.querySelector(".halo");
    if (halo) halo.style.background = hit ? hit.color : "transparent";
  });
}

function groupSummary(itemsId, overlayId, loops, qIndex) {
  const q = QUESTIONS[qIndex == null ? app.qIndex : qIndex];
  const loopsUse = loops || app.loops;
  const centers = itemCenters(itemsId || "items", overlayId || "overlay");
  const counts = loopsUse.map((loop) => centers.filter(({ x, y }) => insideLoop(x, y, loop)).length);
  const positive = counts.filter((n) => n > 0);
  const grouped = positive.reduce((a, b) => a + b, 0);
  const uniqueLoops = positive.length;
  const even = uniqueLoops > 0 && positive.every((n) => n === positive[0]);
  const perGroup = even ? positive[0] : null;
  return {
    groups: uniqueLoops,
    perGroup,
    even,
    grouped,
    total: q.total,
    allGrouped: grouped === q.total && uniqueLoops >= 2 && even
  };
}

function updateGroupLive() {
  const ids = boardIds();
  const g = groupSummary(ids.items, ids.overlay);
  const el = $(ids.group);
  if (!el) return;
  if (!g.groups) el.textContent = "尚未圈組。請拖曳畫出環線，把物件圈成數量相同的組。";
  else if (!g.even) el.textContent = `而家圈咗 ${g.groups} 組，但每組數量唔相同。請調成每組一樣多。`;
  else if (g.grouped !== g.total) el.textContent = `而家圈咗 ${g.groups} 組，每組 ${g.perGroup} 個，已圈 ${g.grouped}／${g.total} 個。請把全部物件都圈入組。`;
  else el.textContent = `而家圈咗 ${g.groups} 組，每組 ${g.perGroup} 個。請寫出呢組算式家庭。`;
}

function groupText(g) {
  if (!g || !g.groups) return "尚未圈組";
  if (!g.even) return `圈咗 ${g.groups} 組，每組數量唔同`;
  return `${g.groups} 組、每組 ${g.perGroup} 個（已圈 ${g.grouped}／${g.total}）`;
}

function svgPoint(evt, overlay) {
  const pt = overlay.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(overlay.getScreenCTM().inverse());
}

function hitLoop(p) {
  for (let i = app.loops.length - 1; i >= 0; i--) {
    if (insideLoop(p.x, p.y, app.loops[i])) return app.loops[i];
  }
  return null;
}

function onDown(evt) {
  if (!isBoardScreenActive()) return;
  if (evt.target.closest(".loop-tools") || evt.target.closest("#loop-tools") || evt.target.closest("#demo-loop-tools")) return;
  evt.preventDefault();
  document.documentElement.classList.add("drawing-lock");
  document.body.classList.add("drawing-lock");
  const overlay = $(boardIds().overlay);
  const p = svgPoint(evt, overlay);
  const loop = hitLoop(p);
  if (loop) app.drag = { id: loop.id, start: p, ox: loop.cx, oy: loop.cy };
  else {
    const color = LOOP_COLORS[app.loops.length % LOOP_COLORS.length];
    app.drawing = { id: "draft", cx: p.x, cy: p.y, rx: 1, ry: 1, color, start: p };
  }
  renderLoops();
}
function onMove(evt) {
  if (!app.drawing && !app.drag) return;
  evt.preventDefault();
  const p = svgPoint(evt, $(boardIds().overlay));
  if (app.drawing) {
    const s = app.drawing.start;
    app.drawing.cx = (s.x + p.x) / 2;
    app.drawing.cy = (s.y + p.y) / 2;
    app.drawing.rx = Math.max(16, Math.abs(p.x - s.x) / 2);
    app.drawing.ry = Math.max(16, Math.abs(p.y - s.y) / 2);
  } else if (app.drag) {
    const loop = app.loops.find((l) => l.id === app.drag.id);
    if (!loop) return;
    loop.cx = app.drag.ox + (p.x - app.drag.start.x);
    loop.cy = app.drag.oy + (p.y - app.drag.start.y);
  }
  renderLoops();
}
function onUp() {
  const was = app.drawing || app.drag;
  if (app.drawing) {
    if (app.drawing.rx > 28 && app.drawing.ry > 22) {
      app.loops.push({
        id: "L" + Date.now() + Math.random().toString(16).slice(2),
        cx: app.drawing.cx, cy: app.drawing.cy,
        rx: app.drawing.rx, ry: app.drawing.ry,
        color: app.drawing.color
      });
    }
    app.drawing = null;
    if (was) report("grouping");
  }
  app.drag = null;
  document.documentElement.classList.remove("drawing-lock");
  document.body.classList.remove("drawing-lock");
  if (was) renderLoops();
}

function onTouchMove(e) {
  if (app.drawing || app.drag) e.preventDefault();
}

function parseRowFrom(equations, i) {
  const [a, b, c] = equations[i].map((v) => Number(v));
  if (!a || !b || !c) return null;
  return { type: ROWS[i].type, a, b, c };
}
function expectedFacts(groups, perGroup, total) {
  return [
    { type: "mul", a: groups, b: perGroup, c: total },
    { type: "mul", a: perGroup, b: groups, c: total },
    { type: "div", a: total, b: perGroup, c: groups },
    { type: "div", a: total, b: groups, c: perGroup }
  ];
}
function sameFact(x, y) {
  return x && y && x.type === y.type && x.a === y.a && x.b === y.b && x.c === y.c;
}
function formatFact(f) {
  const op = f.type === "mul" ? "×" : "÷";
  return `${f.a} ${op} ${f.b} = ${f.c}`;
}

function evaluateWork(equations, g) {
  if (!g || !g.allGrouped) return "incomplete";
  const expected = expectedFacts(g.groups, g.perGroup, g.total);
  const got = [0, 1, 2, 3].map((i) => parseRowFrom(equations, i));
  const used = new Set();
  let allFilled = true;
  let allMatch = true;
  got.forEach((row) => {
    if (!row) { allFilled = false; allMatch = false; return; }
    const idx = expected.findIndex((ans, j) => !used.has(j) && sameFact(ans, row));
    if (idx >= 0) used.add(idx);
    else allMatch = false;
  });
  if (!allFilled) return "incomplete";
  if (allMatch && used.size === 4) return "correct";
  return "incorrect";
}

function paintEquationGrades(root, equations, g) {
  const eqs = [...root.children];
  eqs.forEach((el) => el.classList.remove("ok", "bad"));
  if (!g || !g.allGrouped) {
    eqs.forEach((el) => el.classList.add("bad"));
    return;
  }
  const expected = expectedFacts(g.groups, g.perGroup, g.total);
  const used = new Set();
  eqs.forEach((el, i) => {
    const row = parseRowFrom(equations, i);
    if (!row) { el.classList.add("bad"); return; }
    const idx = expected.findIndex((ans, j) => !used.has(j) && sameFact(ans, row));
    if (idx >= 0) { used.add(idx); el.classList.add("ok"); }
    else el.classList.add("bad");
  });
}

function updateCheckButton() {
  const btn = $("btn-check");
  if (!btn) return;
  btn.textContent = app.mode === "solo" ? "檢查答案" : "提交";
}

function showStudentFeedback() {
  const feedback = $("feedback");
  const eqs = $("equations");
  if (eqs) [...eqs.children].forEach((el) => el.classList.remove("ok", "bad"));
  if (app.mode === "solo") {
    if (app.checkResult) applyFeedback(feedback, app.checkResult, groupSummary("items", "overlay"));
    if (app.checkResult && eqs) paintEquationGrades(eqs, app.equations, groupSummary("items", "overlay"));
    return;
  }
  if (app.submitted) {
    feedback.className = "feedback";
    feedback.textContent = "已提交，請等候老師。若要修改，改完再按一次提交。";
  } else {
    feedback.className = "feedback";
    feedback.textContent = "";
  }
}

function checkAnswers() {
  const g = groupSummary();
  app.checkResult = evaluateWork(app.equations, g);
  if (app.mode === "solo") {
    paintEquationGrades($("equations"), app.equations, g);
    applyFeedback($("feedback"), app.checkResult, g);
    report("checked");
    return;
  }
  app.submitted = true;
  const feedback = $("feedback");
  feedback.className = "feedback";
  feedback.textContent = "已提交，請等候老師。若要修改，改完再按一次提交。";
  if ($("equations")) [...$("equations").children].forEach((el) => el.classList.remove("ok", "bad"));
  report("submitted");
}

function applyFeedback(el, result, g) {
  if (result === "correct") {
    el.className = "feedback ok";
    el.textContent = `正確！${g.groups} 組、每組 ${g.perGroup} 個，呢四條就係呢組乘除算式家庭。`;
  } else if (result === "incorrect") {
    el.className = "feedback bad";
    el.textContent = "仲未完全正確。請根據你圈到嘅組數同每組數量再寫算式。";
  } else if (result === "incomplete") {
    el.className = "feedback bad";
    el.textContent = g && !g.allGrouped
      ? "請先用環線把全部物件圈成數量相同、而且多於一組的分組。"
      : "請先填齊四條算式（兩條乘法、兩條除法）。";
  } else {
    el.className = "feedback";
    el.textContent = "";
  }
}

function saveCurrentWork() {
  if (app.mode !== "class") return;
  studentPublishWork("autosave");
}

function buildStudentWork(lastEvent) {
  const prev = (app.cloud && app.cloud.studentWork[String(app.studentNo)]) || {
    studentNo: app.studentNo, questions: {}
  };
  const overlay = $("overlay");
  const rec = {
    loops: overlay ? normalizeLoops(app.loops, overlay) : [],
    equations: app.equations.map((r) => r.slice()),
    groupSummary: groupSummary(),
    checkResult: app.checkResult,
    submitted: !!app.submitted,
    updatedAt: Date.now()
  };
  prev.questions = prev.questions || {};
  prev.questions[String(app.qIndex)] = rec;
  prev.studentNo = app.studentNo;
  prev.currentQuestion = app.qIndex;
  prev.phase = $("screen-done").classList.contains("active") ? "done" : "playing";
  prev.lastEvent = lastEvent;
  prev.updatedAt = rec.updatedAt;
  return prev;
}

let reportTimer = null;
function report(lastEvent) {
  if (app.demoMode) return;
  if (!app.studentNo) return;
  if (app.mode === "class" && app.submitted && (lastEvent === "typing" || lastEvent === "grouping")) {
    app.submitted = false;
    const feedback = $("feedback");
    if (feedback) {
      feedback.className = "feedback";
      feedback.textContent = "更改後請再按提交。";
    }
  }
  if (lastEvent === "typing") {
    clearTimeout(reportTimer);
    reportTimer = setTimeout(() => studentPublishWork("typing"), 400);
    return;
  }
  clearTimeout(reportTimer);
  studentPublishWork(lastEvent);
}

function goNextOrDone() {
  if (app.mode === "class") {
    const unlocked = (app.cloud && app.cloud.unlockedQuestion) || 0;
    if (app.qIndex < 3 && unlocked > app.qIndex) {
      report("next");
      startQuestion(app.qIndex + 1);
      return;
    }
    if (app.qIndex >= 3) {
      report("done");
      $("done-text").textContent = "你已經完成老師安排嘅題目。請等候老師指示。";
      showScreen("screen-done");
      return;
    }
    return;
  }
  if (app.qIndex < 3) startQuestion(app.qIndex + 1);
  else {
    $("done-text").textContent = "你已經完成四題練習。可以返回主頁再試，或等網絡恢復後加入課堂。";
    showScreen("screen-done");
  }
}

/* ---------- teacher ---------- */
function goTeacherPin() {
  app.role = "teacher";
  app.pin = "";
  $("pin-display").textContent = "••••";
  $("pin-error").textContent = "";
  showScreen("screen-pin");
}

function submitPin() {
  if (app.pin !== TEACHER_PIN) {
    $("pin-error").textContent = "密碼不正確。";
    app.pin = "";
    $("pin-display").textContent = "••••";
    return;
  }
  app.roomCode = genRoomCode();
  app.cloud = emptyCloud(app.roomCode);
  $("room-code-display").textContent = app.roomCode;
  $("room-status").textContent = "已建立新課堂。可把編號投影給學生，或再按「新編號」。";
  $("teacher-rejoin-code").value = "";
  saveRoomLocal(app.cloud);
  startSync();
  teacherPublishState();
  showEntryScreen();
}

function regenRoom() {
  app.roomCode = genRoomCode();
  app.cloud = emptyCloud(app.roomCode);
  $("room-code-display").textContent = app.roomCode;
  $("room-status").textContent = "已換新編號。舊編號嘅課堂資料仍然保留，可用下面重開。";
  saveRoomLocal(app.cloud);
  teacherPublishState();
  if ($("screen-entry") && $("screen-entry").classList.contains("active")) showEntryScreen();
}

async function rejoinRoom() {
  const code = $("teacher-rejoin-code").value.trim();
  const res = await joinExistingRoom(code, true);
  if (!res.ok) {
    $("room-status").textContent = res.error;
    $("room-status").style.color = "var(--bad)";
    return;
  }
  $("room-status").style.color = "";
  $("room-code-display").textContent = app.roomCode;
  $("room-status").textContent = "已重新開啟課堂 " + app.roomCode + "。";
  showEntryScreen();
}

function updateRoomStatus() {
  if (!app.cloud) return;
  const n = onlineStudents().length;
  $("room-code-display").textContent = app.cloud.code;
  $("room-status").textContent = "課堂已準備。而家在線學生：" + n + " 人。";
}

function showEntryScreen() {
  if (!app.roomCode) return;
  showScreen("screen-entry");
  renderEntryScreen();
}

function renderEntryScreen() {
  const code = app.roomCode;
  const url = publicJoinUrl(code);
  app.entryJoinUrl = url;
  if ($("entry-code-display")) $("entry-code-display").textContent = code;
  if ($("entry-url-display")) $("entry-url-display").textContent = url;
  drawEntryQr(url);
}

function drawEntryQr(url) {
  const canvas = $("entry-qr-canvas");
  const fallback = $("entry-qr-fallback");
  if (!canvas) return;
  canvas.dataset.qrUrl = url;
  const revealFallback = function () {
    canvas.classList.add("hidden");
    if (fallback) fallback.classList.remove("hidden");
  };
  try {
    if (typeof qrcode !== "function") throw new Error("no-qr-lib");
    const qr = qrcode(0, "Q");
    qr.addData(url);
    qr.make();
    const count = qr.getModuleCount();
    const margin = 2;
    const scale = Math.max(8, Math.floor(800 / (count + margin * 2)));
    const size = (count + margin * 2) * scale;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no-2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#3a2415";
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
        }
      }
    }
    canvas.classList.remove("hidden");
    if (fallback) fallback.classList.add("hidden");
  } catch (e) {
    revealFallback();
  }
}

function enterConsole() {
  if (!app.cloud) return;
  showScreen("screen-console");
  renderConsole();
}

function onlineStudents() {
  if (!app.cloud) return [];
  const now = Date.now();
  const list = [];
  Object.keys(app.cloud.online || {}).forEach((k) => {
    const info = app.cloud.online[k];
    if (!info || info.role === "teacher") return;
    if (now - (info.at || 0) >= ONLINE_STALE_MS) return;
    list.push(Number(info.no));
  });
  return list.sort((a, b) => a - b);
}

function updateTeacherSync() {
  const pill = $("teacher-sync-pill");
  if (pill) {
    pill.textContent = app.syncLabel;
    pill.className = "sync-pill " + (app.syncLabel.indexOf("已同步") >= 0 ? "on" : "off");
  }
}

function resultLabel(r, submitted) {
  const grade = r === "correct" ? "答對" : r === "incorrect" ? "答錯" : r === "incomplete" ? "未完成" : "未評定";
  if (submitted) return "已提交・" + grade;
  if (r) return "作答中・" + grade;
  return "尚未提交";
}

function renderConsole() {
  if (!app.cloud) return;
  pruneOnline(app.cloud);
  $("teacher-code-pill").textContent = app.cloud.code;
  const online = onlineStudents();
  $("teacher-online-pill").textContent = "在線：" + online.length;
  $("teacher-q-badge").textContent = "而家全班：第 " + (app.cloud.unlockedQuestion + 1) + " 題";
  $("btn-next-q").disabled = app.cloud.unlockedQuestion >= 3;
  $("btn-prev-q").disabled = app.cloud.unlockedQuestion <= 0;
  $("btn-reveal").textContent = app.cloud.reveal ? "隱藏答案" : "顯示答案";
  updateTeacherSync();

  const names = $("teacher-online-names");
  if (app.onlineNamesOpen) {
    names.classList.remove("hidden");
    names.textContent = online.length ? ("在線學號：" + online.join("、")) : "暫時未有學生在線。";
  } else names.classList.add("hidden");

  let joined = 0, correctNow = 0, wrongNow = 0;
  const q = app.cloud.unlockedQuestion;
  const list = $("teacher-list");
  list.innerHTML = "";
  for (let n = 1; n <= CLASS_SIZE; n++) {
    const work = app.cloud.studentWork[String(n)];
    const isOnline = online.indexOf(n) >= 0;
    const rec = work && work.questions && work.questions[String(work.currentQuestion != null ? work.currentQuestion : q)];
    const card = document.createElement("button");
    card.type = "button";
    card.className = "student-card";
    if (isOnline) card.classList.add("online");
    if (rec && rec.checkResult === "correct") { card.classList.add("ok"); correctNow++; }
    else if (rec && rec.checkResult === "incorrect") { card.classList.add("bad"); wrongNow++; }
    if (!work) card.classList.add("empty");
    else joined++;
    const h = document.createElement("h3");
    h.textContent = "學號 " + n + (isOnline ? " · 在線" : "");
    const p1 = document.createElement("p");
    if (!work) p1.textContent = "尚未進入";
    else {
      const qq = (work.currentQuestion || 0) + 1;
      p1.textContent = `做到第 ${qq} 題　${groupText(rec && rec.groupSummary)}　${resultLabel(rec && rec.checkResult, rec && rec.submitted)}`;
    }
    card.append(h, p1);
    card.addEventListener("click", () => openInspect(n));
    list.append(card);
  }
  $("teacher-summary").textContent =
    `已進入 ${joined} 人　在線 ${online.length} 人　目前題答對 ${correctNow}　答錯 ${wrongNow}`;
}

function openInspect(n) {
  app.inspectNo = n;
  const work = app.cloud && app.cloud.studentWork[String(n)];
  app.inspectQ = work && work.currentQuestion != null ? work.currentQuestion : (app.cloud.unlockedQuestion || 0);
  showScreen("screen-inspect");
  renderInspect();
}

function getInspectRec() {
  const work = app.cloud && app.cloud.studentWork[String(app.inspectNo)];
  const rec = work && work.questions && work.questions[String(app.inspectQ)];
  return { work, rec };
}

function renderStaticScene(prefix, qIndex, rec, opts) {
  const q = QUESTIONS[qIndex];
  const items = $(prefix + "-items");
  const overlay = $(prefix + "-overlay");
  items.style.gridTemplateColumns = `repeat(${q.cols}, 1fr)`;
  items.style.gridTemplateRows = `repeat(${q.rows}, 1fr)`;
  items.innerHTML = "";
  for (let i = 0; i < q.total; i++) {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = svgFor(q.kind);
    items.append(el);
  }
  const equations = (rec && rec.equations) || ROWS.map(() => ["", "", ""]);
  renderEquations($(prefix + "-equations"), equations, null, false);
  requestAnimationFrame(() => {
    syncOverlayBox(overlay);
    const loops = denormalizeLoops((rec && rec.loops) || [], overlay);
    paintLoops(overlay, loops, null);
    colorItems(prefix + "-items", prefix + "-overlay", loops);
    const g = rec && rec.groupSummary ? rec.groupSummary : groupSummary(prefix + "-items", prefix + "-overlay", loops, qIndex);
    $(prefix + "-group").textContent = groupText(g);
    const reveal = !!(opts && opts.reveal);
    const showGrade = !!(opts && opts.showGrade);
    const ans = $(prefix + "-answer");
    ans.innerHTML = "";
    if (showGrade && rec && rec.checkResult) {
      applyFeedback(ans, rec.checkResult, g);
      paintEquationGrades($(prefix + "-equations"), equations, g);
    }
    if (showGrade && reveal) {
      const box = document.createElement("div");
      box.className = "answer-box";
      if (g && g.allGrouped) {
        box.textContent = "參考答案：" + expectedFacts(g.groups, g.perGroup, g.total).map(formatFact).join("　");
      } else {
        box.textContent = "要先完成均分齊全嘅分組，先至有標準算式家庭。";
      }
      ans.append(box);
    }
  });
}

function renderInspect() {
  const { work, rec } = getInspectRec();
  $("inspect-sub").textContent = "學號 " + app.inspectNo + "　第 " + (app.inspectQ + 1) + " 題";
  $("inspect-title").textContent = QUESTIONS[app.inspectQ].kindName + "：第 " + (app.inspectQ + 1) + " 題";
  let tabs = $("inspect-tabs");
  if (!tabs) {
    tabs = document.createElement("div");
    tabs.id = "inspect-tabs";
    tabs.className = "btn-row";
    $("inspect-sub").after(tabs);
  }
  tabs.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn " + (i === app.inspectQ ? "btn-primary" : "btn-ghost");
    b.textContent = "第 " + (i + 1) + " 題";
    b.addEventListener("click", () => { app.inspectQ = i; renderInspect(); });
    tabs.append(b);
  }
  const broadcasting = app.cloud && app.cloud.broadcast && Number(app.cloud.broadcast.studentNo) === Number(app.inspectNo) && app.cloud.broadcast.questionIndex === app.inspectQ;
  $("btn-broadcast").classList.toggle("hidden", !!broadcasting);
  $("btn-cancel-broadcast").classList.toggle("hidden", !broadcasting);
  $("btn-inspect-reveal").textContent = app.cloud && app.cloud.reveal ? "隱藏答案" : "顯示答案";
  renderStaticScene("inspect", app.inspectQ, rec, { showGrade: true, reveal: !!(app.cloud && app.cloud.reveal) });
}

function renderBroadcast() {
  if (!app.cloud || !app.cloud.broadcast) return;
  const b = app.cloud.broadcast;
  $("broadcast-sub").textContent = "課堂 " + app.roomCode;
  $("broadcast-badge").textContent = "正在討論：學號 " + b.studentNo + "　第 " + (b.questionIndex + 1) + " 題";
  const work = app.cloud.studentWork[String(b.studentNo)];
  const rec = work && work.questions && work.questions[String(b.questionIndex)];
  // 廣播只出示學生作品供討論，不向全班公布對錯或參考答案
  renderStaticScene("broadcast", b.questionIndex, rec || b, { showGrade: false, reveal: false });
}

function teacherBroadcast() {
  const { rec } = getInspectRec();
  app.cloud.broadcast = {
    studentNo: app.inspectNo,
    questionIndex: app.inspectQ,
    loops: rec ? rec.loops : [],
    equations: rec ? rec.equations : ROWS.map(() => ["", "", ""]),
    groupSummary: rec ? rec.groupSummary : null,
    checkResult: rec ? rec.checkResult : null
  };
  teacherPublishState();
  renderInspect();
}
function teacherCancelBroadcast() {
  app.cloud.broadcast = null;
  teacherPublishState();
  renderInspect();
}
function toggleReveal() {
  app.cloud.reveal = !app.cloud.reveal;
  teacherPublishState();
  if ($("screen-inspect").classList.contains("active")) renderInspect();
  else renderConsole();
}
function teacherSetQuestion(delta) {
  const next = app.cloud.unlockedQuestion + delta;
  if (next < 0 || next > 3) return;
  app.cloud.unlockedQuestion = next;
  app.cloud.broadcast = null;
  teacherPublishState();
  renderConsole();
}
function teacherNewRound() {
  if (!confirm("確定開新一輪？本輪學生作答會被清除，課堂編號維持不變。")) return;
  const code = app.cloud.code;
  const online = app.cloud.online;
  app.cloud = emptyCloud(code);
  app.cloud.online = online;
  teacherPublishState();
  renderConsole();
}

function enterTeacherDemo() {
  if (!app.cloud) return;
  app.qIndex = app.cloud.unlockedQuestion || 0;
  app.loops = [];
  app.drawing = null;
  app.drag = null;
  app.equations = ROWS.map(() => ["", "", ""]);
  app.active = { row: 0, col: 0 };
  app.checkResult = null;
  app.submitted = false;
  app.demoProject = false;
  showScreen("screen-demo");
  syncDemoProjectButton();
  renderTeacherDemo();
}

function renderTeacherDemo() {
  const q = currentQ();
  $("demo-q-badge").textContent = "第 " + (app.qIndex + 1) + " 題";
  $("demo-title").textContent = q.kindName + "：共 " + q.total + " 個";
  $("demo-hint").textContent = q.hint;
  $("demo-feedback").className = "feedback";
  $("demo-feedback").textContent = "可畫環線及寫算式。此示範不會傳送到學生畫面。";
  const items = $("demo-items");
  items.style.gridTemplateColumns = `repeat(${q.cols}, 1fr)`;
  items.style.gridTemplateRows = `repeat(${q.rows}, 1fr)`;
  items.innerHTML = "";
  for (let i = 0; i < q.total; i++) {
    const el = document.createElement("div");
    el.className = "item";
    el.dataset.index = i;
    el.innerHTML = svgFor(q.kind);
    items.append(el);
  }
  renderEquations($("demo-equations"), app.equations, app.active, true);
  renderKeys("demo-numkeys");
  requestAnimationFrame(() => renderLoops());
}

function clearTeacherDemo() {
  app.loops = [];
  app.drawing = null;
  app.drag = null;
  app.equations = ROWS.map(() => ["", "", ""]);
  app.active = { row: 0, col: 0 };
  renderTeacherDemo();
}

function leaveTeacherDemo() {
  app.loops = [];
  app.drawing = null;
  app.drag = null;
  app.equations = ROWS.map(() => ["", "", ""]);
  app.demoMode = false;
  app.demoProject = false;
  document.body.classList.remove("demo-project");
  enterConsole();
}

function syncDemoProjectButton() {
  const btn = $("btn-demo-project");
  if (!btn) return;
  btn.textContent = app.demoProject ? "結束投影" : "投影示範";
  btn.setAttribute("aria-pressed", app.demoProject ? "true" : "false");
}

function toggleDemoProject() {
  app.demoProject = !app.demoProject;
  document.body.classList.toggle("demo-project", app.demoProject);
  syncDemoProjectButton();
  requestAnimationFrame(() => renderLoops());
}

function exportData() {
  if (!app.cloud) return;
  const rows = [["學號","題號","物件","總數","組數","每組","分組是否完成","算式1","算式2","算式3","算式4","結果","更新時間"]];
  for (let n = 1; n <= CLASS_SIZE; n++) {
    const work = app.cloud.studentWork[String(n)];
    if (!work) continue;
    for (let q = 0; q < 4; q++) {
      const rec = work.questions && work.questions[String(q)];
      if (!rec) continue;
      const g = rec.groupSummary || {};
      const eq = (rec.equations || []).map((r, i) => {
        const a = (r && r[0]) || "", b = (r && r[1]) || "", c = (r && r[2]) || "";
        if (!a && !b && !c) return "";
        return `${a}${ROWS[i].op}${b}=${c}`;
      });
      const t = rec.updatedAt ? new Date(rec.updatedAt).toLocaleString("zh-HK", { hour12: false }) : "";
      rows.push([n, q + 1, QUESTIONS[q].kindName, QUESTIONS[q].total, g.groups || "", g.perGroup || "", g.allGrouped ? "是" : "否", eq[0] || "", eq[1] || "", eq[2] || "", eq[3] || "", resultLabel(rec.checkResult, rec.submitted), t]);
    }
  }
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "乘和除的關係-課堂" + app.cloud.code + ".csv";
  a.click();
  URL.revokeObjectURL(a.href);

  const jsonBlob = new Blob([JSON.stringify(app.cloud, null, 2)], { type: "application/json" });
  const b = document.createElement("a");
  b.href = URL.createObjectURL(jsonBlob);
  b.download = "乘和除的關係-課堂" + app.cloud.code + ".json";
  b.click();
  URL.revokeObjectURL(b.href);
}

/* ---------- wire events ---------- */
function bind() {
  $("btn-student").addEventListener("click", openNumberGrid);
  $("btn-teacher").addEventListener("click", goTeacherPin);
  $("btn-numbers-back").addEventListener("click", leaveNumberGrid);
  $("btn-join-back").addEventListener("click", () => showScreen("screen-numbers"));
  $("btn-join-go").addEventListener("click", studentJoinClass);
  $("btn-join-skip").addEventListener("click", studentSolo);
  $("btn-check").addEventListener("click", checkAnswers);
  $("btn-clear-loops").addEventListener("click", () => { app.loops = []; renderLoops(); report("grouping"); });
  $("btn-clear-eq").addEventListener("click", () => {
    app.equations = ROWS.map(() => ["", "", ""]);
    app.checkResult = null;
    $("feedback").className = "feedback";
    $("feedback").textContent = "";
    renderEquations($("equations"), app.equations, app.active, true);
    report("typing");
  });
  $("btn-next").addEventListener("click", goNextOrDone);
  $("btn-done-home").addEventListener("click", goHome);
  $("btn-pin-go").addEventListener("click", submitPin);
  $("btn-pin-back").addEventListener("click", goHome);
  $("btn-room-regen").addEventListener("click", regenRoom);
  $("btn-room-entry").addEventListener("click", showEntryScreen);
  $("btn-room-enter").addEventListener("click", enterConsole);
  $("btn-room-rejoin").addEventListener("click", rejoinRoom);
  $("btn-room-home").addEventListener("click", goHome);
  $("btn-entry-console").addEventListener("click", enterConsole);
  $("btn-entry-regen").addEventListener("click", regenRoom);
  $("btn-entry-setup").addEventListener("click", () => {
    if (!app.cloud) return;
    $("room-code-display").textContent = app.roomCode;
    showScreen("screen-room");
    updateRoomStatus();
  });
  $("btn-show-entry").addEventListener("click", showEntryScreen);
  $("btn-export").addEventListener("click", exportData);
  $("btn-console-home").addEventListener("click", goHome);
  $("teacher-online-pill").addEventListener("click", () => {
    app.onlineNamesOpen = !app.onlineNamesOpen;
    renderConsole();
  });
  $("btn-next-q").addEventListener("click", () => teacherSetQuestion(1));
  $("btn-prev-q").addEventListener("click", () => teacherSetQuestion(-1));
  $("btn-reveal").addEventListener("click", toggleReveal);
  $("btn-new-round").addEventListener("click", teacherNewRound);
  $("btn-demo").addEventListener("click", enterTeacherDemo);
  $("btn-demo-project").addEventListener("click", toggleDemoProject);
  $("btn-demo-clear").addEventListener("click", clearTeacherDemo);
  $("btn-demo-back").addEventListener("click", leaveTeacherDemo);
  $("btn-broadcast").addEventListener("click", teacherBroadcast);
  $("btn-cancel-broadcast").addEventListener("click", teacherCancelBroadcast);
  $("btn-inspect-reveal").addEventListener("click", toggleReveal);
  $("btn-inspect-back").addEventListener("click", enterConsole);

  renderPad("join-keys", () => app.joinCode, setJoinCode, 4);
  renderPad("pin-keys", () => app.pin, setPin, 4, true);

  const board = $("board");
  board.addEventListener("pointerdown", onDown);
  $("demo-board").addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("resize", () => {
    if (isBoardScreenActive()) renderLoops();
    if ($("screen-entry") && $("screen-entry").classList.contains("active")) renderEntryScreen();
  });

  window.addEventListener("keydown", (e) => {
    if ($("screen-join").classList.contains("active")) {
      if (e.key >= "0" && e.key <= "9") setJoinCode(app.joinCode + e.key);
      else if (e.key === "Backspace") setJoinCode(app.joinCode.slice(0, -1));
      else if (e.key === "Enter") studentJoinClass();
      return;
    }
    if ($("screen-pin").classList.contains("active")) {
      if (e.key >= "0" && e.key <= "9") setPin(app.pin + e.key);
      else if (e.key === "Backspace") setPin(app.pin.slice(0, -1));
      else if (e.key === "Enter") submitPin();
      return;
    }
    if (!isBoardScreenActive()) return;
    if (e.key >= "0" && e.key <= "9") { typeInto(e.key); e.preventDefault(); }
    else if (e.key === "Backspace") { backspace(); e.preventDefault(); }
    else if (e.key === "Enter" || e.key === "Tab" || e.key === "ArrowRight") {
      const i = app.active.row * 3 + app.active.col + 1;
      app.active = { row: Math.floor((i % 12) / 3), col: i % 3 };
      renderEquations($(boardIds().equations), app.equations, app.active, true);
      e.preventDefault();
    }
  });
}

bind();
const prefilledCode = readClassCodeFromUrl();
if (prefilledCode) {
  app.pendingClassCode = prefilledCode;
  document.documentElement.classList.add("prejoin");
  openNumberGrid();
} else if (location.hash === "#teacher") {
  goTeacherPin();
}
