const players = [
  { name: "たけ", checked: true },
  { name: "ゆか", checked: true },
  { name: "たろう", checked: true },
  { name: "かず", checked: true },
  { name: "つよし", checked: false },
  { name: "りさ", checked: false }
];

const $ = id => document.getElementById(id);

let allTopics = [];
let remainingTopics = [];
let wolfTopics = [];
let wolfTopicQueue = [];
let lastWolfTopicId = null;
let currentTopic = null;
let topicMode = "normal";
let favoriteTopicIds = [];
let favoriteQueue = [];
let lastFavoriteTopicId = null;

let roundPlayers = [];
let currentViewerIndex = 0;
let rankingOrder = [];
let correctOrder = [];
let revealCursor = -1;
let answerRevealPhase = "name";

let sessionStats = {
  completed: 0,
  perfect: 0,
  close: 0,
  almost: 0,
  challenge: 0
};
let roundNumber = 0;
let gameActive = false;
let numberVisible = false;
let gameMode = "normal";
let werewolfTotalRounds = 5;
let wolfDifficulty = "normal";
let werewolfName = null;
let werewolfMisses = 0;
let wolfGuessName = null;

let soundEnabled = true;
let vibrationEnabled = true;
let audioContext = null;

const HISTORY_KEY = "itoHistoryV6";
const SETTINGS_KEY = "itoSettingsV6";
const GAME_STATE_KEY = "itoGameStateV85";
const TOPIC_PROGRESS_KEY = "itoTopicProgressV73";
const FAVORITES_KEY = "itoFavoriteTopicsV79";

let currentStageName = "setup";
let savedStatePending = null;

let wakeLockSentinel = null;
let wakeLockRequestPending = false;
let pendingConfirmAction = null;

const setupScreen = $("setupScreen");
const gameScreen = $("gameScreen");
const playersEl = $("players");
const remainingEl = $("remaining");
const soundToggle = $("soundToggle");
const vibrationToggle = $("vibrationToggle");
const startBtn = $("startBtn");
const resetTopicsBtn = $("resetTopicsBtn");
const setupMessage = $("setupMessage");
const favoriteCount = $("favoriteCount");
const topicModeInputs = document.querySelectorAll('input[name="topicMode"]');
const gameModeInputs = document.querySelectorAll('input[name="gameMode"]');
const wolfRoundInputs = document.querySelectorAll('input[name="wolfRounds"]');
const wolfDifficultyInputs = document.querySelectorAll('input[name="wolfDifficulty"]');
const wolfRangeDescription = $("wolfRangeDescription");
const werewolfOptions = $("werewolfOptions");
const historyBtn = $("historyBtn");
const resumeCard = $("resumeCard");
const resumeSummary = $("resumeSummary");
const resumeGameBtn = $("resumeGameBtn");
const discardGameBtn = $("discardGameBtn");

const roundLabel = $("roundLabel");
const wakeLockStatus = $("wakeLockStatus");
const wolfStatus = $("wolfStatus");
const endGameBtn = $("endGameBtn");

const numberStage = $("numberStage");
const dealProgress = $("dealProgress");
const passView = $("passView");
const numberView = $("numberView");
const currentPlayer = $("currentPlayer");
const secretRole = $("secretRole");
const wolfSecretHint = $("wolfSecretHint");
const secretNumber = $("secretNumber");
const revealBtn = $("revealBtn");
const hideNumberBtn = $("hideNumberBtn");

const topicStage = $("topicStage");
const topicEl = $("topic");
const rangeRuleNotice = $("rangeRuleNotice");
const minLabel = $("minLabel");
const maxLabel = $("maxLabel");
const goRankingBtn = $("goRankingBtn");

const rankingStage = $("rankingStage");
const rankSlots = $("rankSlots");
const rankButtons = $("rankButtons");
const undoRankBtn = $("undoRankBtn");
const clearRankBtn = $("clearRankBtn");
const answerStartBtn = $("answerStartBtn");

const answerStage = $("answerStage");
const answerGuide = $("answerGuide");
const answerRevealList = $("answerRevealList");
const revealNextAnswerBtn = $("revealNextAnswerBtn");
const finalResult = $("finalResult");
const resultBadge = $("resultBadge");
const resultDetail = $("resultDetail");
const sessionStatsEl = $("sessionStats");
const guessSummary = $("guessSummary");
const compareBoard = $("compareBoard");
const favoriteTopicBtn = $("favoriteTopicBtn");
const nextRoundBtn = $("nextRoundBtn");
const wolfStage = $("wolfStage");
const wolfGuessButtons = $("wolfGuessButtons");
const revealWolfBtn = $("revealWolfBtn");
const wolfFinalResult = $("wolfFinalResult");
const finishWolfGameBtn = $("finishWolfGameBtn");
const sameTopicBtn = $("sameTopicBtn");

const historyModal = $("historyModal");
const historyList = $("historyList");
const closeHistoryBtn = $("closeHistoryBtn");
const clearHistoryBtn = $("clearHistoryBtn");

const confirmModal = $("confirmModal");
const confirmTitle = $("confirmTitle");
const confirmMessage = $("confirmMessage");
const confirmCancelBtn = $("confirmCancelBtn");
const confirmOkBtn = $("confirmOkBtn");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function activePlayers() {
  return players.filter(player => player.checked);
}

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqueNumbers(count) {
  var numbers = [];
  var start = gameMode === "werewolf" ? (wolfDifficulty === "hard" ? 80 : 51) : 1;
  for (var i = start; i <= 100; i++) numbers.push(i);
  return shuffle(numbers).slice(0, count);
}

function wolfMissTarget() {
  return 3;
}

function updateWolfStatus() {
  if (!wolfStatus) return;
  if (gameMode !== "werewolf" || !gameActive) {
    wolfStatus.classList.add("hidden");
    return;
  }
  wolfStatus.classList.remove("hidden");
  wolfStatus.textContent = `🐺 並び替えミス ${werewolfMisses} / ${wolfMissTarget()}　・　全${werewolfTotalRounds}ROUND`;
}

function renderPlayers() {
  playersEl.innerHTML = "";

  players.forEach((player, index) => {
    const label = document.createElement("label");
    label.className = `player${gameActive ? " locked" : ""}`;
    label.innerHTML = `
      <input type="checkbox" data-index="${index}" ${player.checked ? "checked" : ""} ${gameActive ? "disabled" : ""}>
      <span>${escapeHtml(player.name)}</span>
    `;
    playersEl.appendChild(label);
  });

  playersEl.querySelectorAll("input").forEach(input => {
    input.addEventListener("change", event => {
      players[Number(event.target.dataset.index)].checked = event.target.checked;
      saveGameState();
    });
  });
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += ch;
    }
  }

  values.push(value);
  return values;
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const header = parseCsvLine(lines[0]);

  const idIndex = header.indexOf("id");
  const topicIndex = header.indexOf("topic");
  const minIndex = header.indexOf("minLabel");
  const maxIndex = header.indexOf("maxLabel");

  return lines.slice(1).map(line => {
    const cols = parseCsvLine(line);
    return {
      id: Number(cols[idIndex]),
      topic: cols[topicIndex] || "",
      minLabel: minIndex >= 0 ? cols[minIndex] : "ほとんど当てはまらない",
      maxLabel: maxIndex >= 0 ? cols[maxIndex] : "ものすごく当てはまる"
    };
  }).filter(item => item.topic);
}

function loadFavorites() {
  try {
    var raw = localStorage.getItem(FAVORITES_KEY);
    var ids = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(ids)) ids = [];

    favoriteTopicIds = ids
      .map(function(id) { return Number(id); })
      .filter(function(id, index, array) {
        return Number.isFinite(id) && array.indexOf(id) === index;
      });
  } catch (error) {
    favoriteTopicIds = [];
  }

  favoriteQueue = [];
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteTopicIds));
  } catch (error) {}
}

function isFavoriteTopic(id) {
  return favoriteTopicIds.indexOf(Number(id)) !== -1;
}

function validFavoriteTopics() {
  return allTopics.filter(function(topic) {
    return isFavoriteTopic(topic.id);
  });
}

function syncTopicModeControls() {
  topicModeInputs.forEach(function(input) {
    input.checked = input.value === topicMode;
  });
}

function renderFavoriteButton() {
  if (!favoriteTopicBtn || !currentTopic) return;

  if (gameMode === "werewolf") {
    favoriteTopicBtn.classList.add("hidden");
    return;
  }
  favoriteTopicBtn.classList.remove("hidden");

  var active = isFavoriteTopic(currentTopic.id);
  favoriteTopicBtn.classList.toggle("active", active);
  favoriteTopicBtn.textContent = active
    ? "★ お気に入り済み"
    : "☆ 盛り上がった";
}

function updateFavoriteUI() {
  if (favoriteCount) {
    favoriteCount.textContent = "★ " + favoriteTopicIds.length + "問";
  }

  syncTopicModeControls();
  renderFavoriteButton();
  updateRemaining();
}

function toggleCurrentTopicFavorite() {
  if (!currentTopic) return;

  var id = Number(currentTopic.id);
  var index = favoriteTopicIds.indexOf(id);

  if (index >= 0) {
    favoriteTopicIds.splice(index, 1);
  } else {
    favoriteTopicIds.push(id);
  }

  favoriteQueue = [];
  saveFavorites();
  updateFavoriteUI();
  playTone("tap");
  vibrate(20);
}

function pickFavoriteTopic() {
  var topics = validFavoriteTopics();
  if (!topics.length) return null;

  var validIds = topics.map(function(topic) { return topic.id; });

  favoriteQueue = favoriteQueue.filter(function(id) {
    return validIds.indexOf(id) !== -1;
  });

  if (!favoriteQueue.length) {
    favoriteQueue = shuffle(validIds);
  }

  if (
    favoriteQueue.length > 1 &&
    lastFavoriteTopicId !== null &&
    favoriteQueue[0] === lastFavoriteTopicId
  ) {
    var swap = favoriteQueue[0];
    favoriteQueue[0] = favoriteQueue[1];
    favoriteQueue[1] = swap;
  }

  var id = favoriteQueue.shift();
  lastFavoriteTopicId = id;
  return topicById(id);
}

function pickWolfTopic() {
  if (!wolfTopics.length) return null;

  var validIds = wolfTopics.map(function(topic) { return topic.id; });
  wolfTopicQueue = wolfTopicQueue.filter(function(id) {
    return validIds.indexOf(id) !== -1;
  });

  if (!wolfTopicQueue.length) {
    wolfTopicQueue = shuffle(validIds);
  }

  if (wolfTopicQueue.length > 1 && lastWolfTopicId !== null && wolfTopicQueue[0] === lastWolfTopicId) {
    var swap = wolfTopicQueue[0];
    wolfTopicQueue[0] = wolfTopicQueue[1];
    wolfTopicQueue[1] = swap;
  }

  var id = wolfTopicQueue.shift();
  lastWolfTopicId = id;
  return topicById(id);
}

function hasTopicForCurrentMode() {
  if (gameMode === "werewolf") {
    return wolfTopics.length > 0;
  }

  if (topicMode === "favorites") {
    return validFavoriteTopics().length > 0;
  }

  return remainingTopics.length > 0;
}

function noTopicMessageForCurrentMode() {
  if (gameMode === "werewolf") {
    return "人狼専用のお題を読み込めませんでした。";
  }

  if (topicMode === "favorites") {
    return "お気に入りのお題がありません。通常モードで遊んで「☆ 盛り上がった」を付けてください。";
  }

  return "お題をすべて使いました。お題をリセットしてください。";
}

async function loadTopics() {
  try {
    const response = await fetch("topics.csv", { cache: "no-store" });
    if (!response.ok) throw new Error("CSV load error");

    const csvTopics = parseCsv(await response.text());
    if (!csvTopics.length) throw new Error("CSV empty");
    allTopics = csvTopics;
  } catch (error) {
    if (Array.isArray(window.ITO_TOPICS) && window.ITO_TOPICS.length) {
      allTopics = window.ITO_TOPICS.map(item => ({ ...item }));
    } else {
      remainingEl.textContent = "お題読み込みエラー";
      startBtn.disabled = true;
      setupMessage.textContent = "お題データを読み込めませんでした。";
      return;
    }
  }

  try {
    const wolfResponse = await fetch("wolf-topics.csv", { cache: "no-store" });
    if (!wolfResponse.ok) throw new Error("Wolf CSV load error");
    const csvWolfTopics = parseCsv(await wolfResponse.text());
    if (!csvWolfTopics.length) throw new Error("Wolf CSV empty");
    wolfTopics = csvWolfTopics;
  } catch (error) {
    if (Array.isArray(window.ITO_WOLF_TOPICS) && window.ITO_WOLF_TOPICS.length) {
      wolfTopics = window.ITO_WOLF_TOPICS.map(item => ({ ...item }));
    } else {
      wolfTopics = [];
    }
  }

  loadFavorites();

  // CSV更新などで存在しなくなったIDはお気に入りから自動除外。
  favoriteTopicIds = favoriteTopicIds.filter(function(id) {
    return topicById(id) !== null;
  });
  saveFavorites();

  restoreTopicProgress();
  updateFavoriteUI();
  showResumeCardIfNeeded();
}

function updateRemaining() {
  if (gameMode === "werewolf") {
    remainingEl.textContent = `🐺 人狼専用お題 ${wolfTopics.length}問`;
    remainingEl.classList.toggle("all-used", wolfTopics.length === 0);
    return;
  }

  if (topicMode === "favorites") {
    remainingEl.textContent = `★ お気に入り ${favoriteTopicIds.length}問`;
    remainingEl.classList.toggle("all-used", favoriteTopicIds.length === 0);
    return;
  }

  remainingEl.textContent = `お題 残り ${remainingTopics.length} / ${allTopics.length}`;

  if (allTopics.length && remainingTopics.length === 0) {
    remainingEl.classList.add("all-used");
  } else {
    remainingEl.classList.remove("all-used");
  }
}

function pickTopic() {
  if (gameMode === "werewolf") {
    return pickWolfTopic();
  }

  if (topicMode === "favorites") {
    return pickFavoriteTopic();
  }

  if (!remainingTopics.length) return null;

  const index = Math.floor(Math.random() * remainingTopics.length);
  const [topic] = remainingTopics.splice(index, 1);

  updateRemaining();
  saveTopicProgress();

  return topic;
}


function setWakeLockStatus(text, mode) {
  if (!wakeLockStatus) return;

  wakeLockStatus.textContent = text;
  wakeLockStatus.classList.remove("active", "unsupported");

  if (mode === "active") {
    wakeLockStatus.classList.add("active");
  } else if (mode === "unsupported") {
    wakeLockStatus.classList.add("unsupported");
  }
}

async function requestGameWakeLock() {
  if (!gameActive) return;

  if (!("wakeLock" in navigator) || !navigator.wakeLock || !navigator.wakeLock.request) {
    setWakeLockStatus("画面スリープ防止：非対応", "unsupported");
    return;
  }

  if (wakeLockSentinel && !wakeLockSentinel.released) {
    setWakeLockStatus("画面スリープ防止：ON ✓", "active");
    return;
  }

  if (wakeLockRequestPending) return;
  if (document.visibilityState !== "visible") return;

  wakeLockRequestPending = true;

  try {
    wakeLockSentinel = await navigator.wakeLock.request("screen");
    setWakeLockStatus("画面スリープ防止：ON ✓", "active");

    wakeLockSentinel.addEventListener("release", function() {
      wakeLockSentinel = null;

      if (gameActive && document.visibilityState === "visible") {
        setWakeLockStatus("画面スリープ防止を再取得中", "");
      } else if (!gameActive) {
        setWakeLockStatus("画面スリープ防止：OFF", "");
      }
    });
  } catch (error) {
    wakeLockSentinel = null;
    setWakeLockStatus("画面スリープ防止：利用不可", "unsupported");
  } finally {
    wakeLockRequestPending = false;
  }
}

async function releaseGameWakeLock() {
  wakeLockRequestPending = false;

  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch (error) {}

    wakeLockSentinel = null;
  }

  setWakeLockStatus("画面スリープ防止：OFF", "");
}

function saveTopicProgress() {
  try {
    var progress = {
      version: 73,
      remainingTopicIds: remainingTopics.map(function(topic) {
        return topic.id;
      }),
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(TOPIC_PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    // localStorage が使えない環境でもゲーム自体は続行する。
  }
}

function loadTopicProgress() {
  try {
    var raw = localStorage.getItem(TOPIC_PROGRESS_KEY);
    if (!raw) return null;

    var progress = JSON.parse(raw);
    if (!progress || progress.version !== 73) return null;
    if (!Array.isArray(progress.remainingTopicIds)) return null;

    return progress;
  } catch (error) {
    return null;
  }
}

function restoreTopicProgress() {
  var progress = loadTopicProgress();

  if (!progress) {
    remainingTopics = allTopics.slice();
    return;
  }

  var allowedIds = {};
  for (var i = 0; i < progress.remainingTopicIds.length; i++) {
    allowedIds[progress.remainingTopicIds[i]] = true;
  }

  // CSV側のお題が更新されていても、存在するIDだけ安全に復元する。
  remainingTopics = allTopics.filter(function(topic) {
    return !!allowedIds[topic.id];
  });
}

function clearTopicProgress() {
  try {
    localStorage.removeItem(TOPIC_PROGRESS_KEY);
  } catch (error) {}
}

function getRemainingTopicIds() {
  return remainingTopics.map(function(topic) { return topic.id; });
}

function saveGameState() {
  try {
    var state = {
      version: 84,
      gameActive: gameActive,
      roundNumber: roundNumber,
      stage: currentStageName,
      topicMode: topicMode,
      gameMode: gameMode,
      werewolfTotalRounds: werewolfTotalRounds,
      wolfDifficulty: wolfDifficulty,
      werewolfName: werewolfName,
      werewolfMisses: werewolfMisses,
      wolfGuessName: wolfGuessName,
      wolfTopicQueue: wolfTopicQueue.slice(),
      lastWolfTopicId: lastWolfTopicId,
      players: players.map(function(player) {
        return { name: player.name, checked: player.checked };
      }),
      remainingTopicIds: getRemainingTopicIds(),
      currentTopicId: currentTopic ? currentTopic.id : null,
      roundPlayers: roundPlayers.map(function(player) {
        return { name: player.name, number: player.number };
      }),
      currentViewerIndex: currentViewerIndex,
      rankingOrder: rankingOrder.slice(),
      correctOrder: correctOrder.map(function(player) {
        return { name: player.name, number: player.number };
      }),
      revealCursor: revealCursor,
      answerRevealPhase: answerRevealPhase,
      sessionStats: {
        completed: sessionStats.completed,
        perfect: sessionStats.perfect,
        close: sessionStats.close,
        almost: sessionStats.almost,
        challenge: sessionStats.challenge
      },
      savedAt: new Date().toISOString()
    };

    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    // Storage may be unavailable in private browsing; game continues normally.
  }
}

function clearSavedGameState() {
  try {
    localStorage.removeItem(GAME_STATE_KEY);
  } catch (error) {}
  savedStatePending = null;
  if (resumeCard) resumeCard.classList.add("hidden");
}

function readSavedGameState() {
  try {
    var raw = localStorage.getItem(GAME_STATE_KEY);
    if (!raw) return null;
    var state = JSON.parse(raw);
    if (!state || state.version !== 84 || !state.gameActive) return null;
    return state;
  } catch (error) {
    return null;
  }
}

function topicById(id) {
  if (id === null || id === undefined) return null;
  for (var i = 0; i < allTopics.length; i++) {
    if (allTopics[i].id === id) return allTopics[i];
  }
  for (var j = 0; j < wolfTopics.length; j++) {
    if (wolfTopics[j].id === id) return wolfTopics[j];
  }
  return null;
}

function showResumeCardIfNeeded() {
  var state = readSavedGameState();
  if (!state || !allTopics.length) {
    resumeCard.classList.add("hidden");
    return;
  }

  savedStatePending = state;

  var stageNames = {
    number: "秘密の数字を確認中",
    topic: "お題について話し合い中",
    ranking: "順位を決めている途中",
    answer: "答え発表の途中",
    wolf: "人狼を推理中"
  };

  var participantNames = state.roundPlayers && state.roundPlayers.length
    ? state.roundPlayers.map(function(player) { return player.name; }).join("・")
    : "参加者情報あり";

  resumeSummary.innerHTML =
    "ROUND " + state.roundNumber + "<br>" +
    (stageNames[state.stage] || "ゲーム途中") + "<br>" +
    escapeHtml(participantNames);

  resumeCard.classList.remove("hidden");
}

function restoreSavedGame() {
  var state = savedStatePending || readSavedGameState();
  if (!state || !allTopics.length) return;

  if (state.topicMode === "favorites" || state.topicMode === "normal") {
    topicMode = state.topicMode;
    syncTopicModeControls();
  }
  gameMode = state.gameMode === "werewolf" ? "werewolf" : "normal";
  werewolfTotalRounds = 5;
  wolfDifficulty = state.wolfDifficulty === "hard" ? "hard" : "normal";
  werewolfName = state.werewolfName || null;
  werewolfMisses = Number(state.werewolfMisses) || 0;
  wolfGuessName = state.wolfGuessName || null;
  wolfTopicQueue = Array.isArray(state.wolfTopicQueue) ? state.wolfTopicQueue.slice() : [];
  lastWolfTopicId = Number.isFinite(Number(state.lastWolfTopicId)) ? Number(state.lastWolfTopicId) : null;
  syncGameModeControls();

  // Restore participants
  if (Array.isArray(state.players)) {
    for (var i = 0; i < players.length; i++) {
      for (var j = 0; j < state.players.length; j++) {
        if (players[i].name === state.players[j].name) {
          players[i].checked = !!state.players[j].checked;
          break;
        }
      }
    }
  }

  // Restore remaining topics
  if (Array.isArray(state.remainingTopicIds)) {
    var idMap = {};
    for (var k = 0; k < state.remainingTopicIds.length; k++) {
      idMap[state.remainingTopicIds[k]] = true;
    }
    remainingTopics = allTopics.filter(function(topic) {
      return !!idMap[topic.id];
    });
    saveTopicProgress();
  }

  currentTopic = topicById(state.currentTopicId);
  roundPlayers = Array.isArray(state.roundPlayers) ? state.roundPlayers.map(function(player) {
    return { name: player.name, number: player.number };
  }) : [];

  currentViewerIndex = Number(state.currentViewerIndex) || 0;
  rankingOrder = Array.isArray(state.rankingOrder) ? state.rankingOrder.slice() : [];
  correctOrder = Array.isArray(state.correctOrder) ? state.correctOrder.map(function(player) {
    return { name: player.name, number: player.number };
  }) : [];
  revealCursor = typeof state.revealCursor === "number" ? state.revealCursor : -1;
  answerRevealPhase = state.answerRevealPhase === "number" ? "number" : "name";

  if (state.sessionStats && typeof state.sessionStats === "object") {
    sessionStats = {
      completed: Number(state.sessionStats.completed) || 0,
      perfect: Number(state.sessionStats.perfect) || 0,
      close: Number(state.sessionStats.close) || 0,
      almost: Number(state.sessionStats.almost) || 0,
      challenge: Number(state.sessionStats.challenge) || 0
    };
  } else {
    sessionStats = {
      completed: 0,
      perfect: 0,
      close: 0,
      almost: 0,
      challenge: 0
    };
  }

  roundNumber = Number(state.roundNumber) || 1;
  gameActive = true;
  numberVisible = false;

  updateRemaining();
  renderPlayers();
  roundLabel.textContent = gameMode === "werewolf" ? `ROUND ${roundNumber} / ${werewolfTotalRounds}` : `ROUND ${roundNumber}`;
  updateWolfStatus();

  setupScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  requestGameWakeLock();

  var stage = state.stage || "number";

  if (stage === "topic" && currentTopic) {
    showTopic();
  } else if (stage === "ranking" && currentTopic) {
    topicEl.textContent = currentTopic.topic;
    minLabel.textContent = currentTopic.minLabel;
    maxLabel.textContent = currentTopic.maxLabel;
    showStage(rankingStage);
    renderRankingSelection();
    currentStageName = "ranking";
  } else if (stage === "answer" && currentTopic && correctOrder.length) {
    restoreAnswerStage();
  } else if (stage === "wolf" && gameMode === "werewolf") {
    openWolfGuessStage();
  } else {
    // Secret number is NEVER restored as visible.
    showStage(numberStage);
    currentStageName = "number";
    if (currentViewerIndex < 0 || currentViewerIndex >= roundPlayers.length) {
      currentViewerIndex = 0;
    }
    showViewerPass();
  }

  resumeCard.classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
  saveGameState();
}

function restoreAnswerStage() {
  showStage(answerStage);
  currentStageName = "answer";
  answerGuide.textContent = "名前 → 数字の順に発表します";

  answerRevealList.innerHTML = correctOrder.map(function(player, index) {
    // revealCursor より下位はすでに「名前＋数字」まで発表済み。
    if (index > revealCursor) {
      return buildAnswerRow(player, index, true, true);
    }

    // 現在の順位で、名前だけ発表済み。
    if (index === revealCursor && answerRevealPhase === "number") {
      return buildAnswerRow(player, index, true, false);
    }

    return buildAnswerRow(player, index, false, false);
  }).join("");

  if (revealCursor >= 0) {
    finalResult.classList.add("hidden");
    revealNextAnswerBtn.classList.remove("hidden");
    updateAnswerRevealButton();
  } else {
    revealNextAnswerBtn.classList.add("hidden");
    showFinalResult(false);
  }
}

function buildAnswerRow(player, index, showName, showNumber) {
  var isFirst = index === 0;
  var classes = [];

  if (!showName) {
    classes.push("answer-placeholder");
  } else {
    classes.push("answer-row");

    if (!showNumber) {
      classes.push("name-only");
    }

    if (isFirst) {
      classes.push("first-place");
      if (showNumber) classes.push("winner-revealed");
    }
  }

  return `
    <div id="answerRow${index}" class="${classes.join(" ")}">
      <span class="answer-rank">${index + 1}位</span>
      <span class="answer-name">${showName ? escapeHtml(player.name) : "？？？"}</span>
      <span class="answer-number">${showNumber ? player.number : "？"}</span>
    </div>
  `;
}

function updateAnswerRevealButton() {
  if (revealCursor < 0) return;

  var rank = revealCursor + 1;

  if (answerRevealPhase === "name") {
    revealNextAnswerBtn.textContent =
      revealCursor === correctOrder.length - 1
        ? "最下位の名前を発表"
        : rank === 1
          ? "いよいよ1位の名前を発表！"
          : rank + "位の名前を発表";
  } else {
    revealNextAnswerBtn.textContent =
      rank === 1
        ? "1位の数字を発表！"
        : rank + "位の数字を発表";
  }
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    soundEnabled = saved.sound !== false;
    vibrationEnabled = saved.vibration !== false;
    topicMode = saved.topicMode === "favorites" ? "favorites" : "normal";
    gameMode = saved.gameMode === "werewolf" ? "werewolf" : "normal";
    werewolfTotalRounds = 5;
    wolfDifficulty = saved.wolfDifficulty === "hard" ? "hard" : "normal";
  } catch {
    soundEnabled = true;
    vibrationEnabled = true;
    topicMode = "normal";
    gameMode = "normal";
    werewolfTotalRounds = 5;
    wolfDifficulty = "normal";
  }

  soundToggle.checked = soundEnabled;
  vibrationToggle.checked = vibrationEnabled;
  syncTopicModeControls();
  syncGameModeControls();
}

function saveSettings() {
  soundEnabled = soundToggle.checked;
  vibrationEnabled = vibrationToggle.checked;

  var checkedMode = document.querySelector('input[name="topicMode"]:checked');
  topicMode = checkedMode && checkedMode.value === "favorites"
    ? "favorites"
    : "normal";

  var checkedGameMode = document.querySelector('input[name="gameMode"]:checked');
  gameMode = checkedGameMode && checkedGameMode.value === "werewolf" ? "werewolf" : "normal";
  werewolfTotalRounds = 5;
  var checkedWolfDifficulty = document.querySelector('input[name="wolfDifficulty"]:checked');
  wolfDifficulty = checkedWolfDifficulty && checkedWolfDifficulty.value === "hard" ? "hard" : "normal";

  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    sound: soundEnabled,
    vibration: vibrationEnabled,
    topicMode: topicMode,
    gameMode: gameMode,
    wolfDifficulty: wolfDifficulty,
    werewolfTotalRounds: werewolfTotalRounds
  }));

  updateRemaining();
}

function syncGameModeControls() {
  gameModeInputs.forEach(function(input) { input.checked = input.value === gameMode; });
  wolfRoundInputs.forEach(function(input) { input.checked = Number(input.value) === werewolfTotalRounds; });
  if (werewolfOptions) werewolfOptions.classList.toggle("hidden", gameMode !== "werewolf");
  wolfDifficultyInputs.forEach(function(input) { input.checked = input.value === wolfDifficulty; });
  var rangeText = wolfDifficulty === "hard" ? "80〜100" : "51〜100";
  if (wolfRangeDescription) wolfRangeDescription.innerHTML = `数字は<strong>${rangeText}</strong>のみ。ただしお題の尺度は常に<strong>1〜100</strong>のままです。`;
  if (rangeRuleNotice) rangeRuleNotice.innerHTML = `🐺 このROUNDの数字は <strong>${rangeText}</strong>。ただし回答は通常どおり「1〜100の尺度」で考えます。`;
}

function ensureAudio() {
  if (!soundEnabled) return null;
  try {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      audioContext = new AudioCtx();
    }
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  } catch {
    return null;
  }
}

function playTone(kind = "tap") {
  if (!soundEnabled) return;
  const ctx = ensureAudio();
  if (!ctx) return;

  const config = {
    tap: [440, 0.06],
    reveal: [620, 0.09],
    answer: [520, 0.13],
    perfect: [760, 0.24]
  }[kind] || [440, 0.06];

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = config[0];
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.11, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + config[1]);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + config[1] + 0.02);
}

function vibrate(pattern = 25) {
  if (!vibrationEnabled) return;
  if ("vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
}

function startGame() {
  const selected = activePlayers();

  saveSettings();

  if (gameMode === "werewolf") {
    if (selected.length < 4 || selected.length > 6) {
      setupMessage.textContent = "人狼ルールは4〜6人で遊んでください。";
      return;
    }
  } else if (selected.length < 2) {
    setupMessage.textContent = "参加者を2人以上選んでください。";
    return;
  }

  if (!hasTopicForCurrentMode()) {
    setupMessage.textContent = noTopicMessageForCurrentMode();
    return;
  }


  ensureAudio();

  gameActive = true;
  roundNumber = 0;
  sessionStats = {
    completed: 0,
    perfect: 0,
    close: 0,
    almost: 0,
    challenge: 0
  };
  werewolfName = gameMode === "werewolf" ? selected[Math.floor(Math.random() * selected.length)].name : null;
  werewolfMisses = 0;
  wolfGuessName = null;
  wolfTopicQueue = gameMode === "werewolf" ? shuffle(wolfTopics.map(function(topic) { return topic.id; })) : [];
  lastWolfTopicId = null;
  currentStageName = "number";
  setupMessage.textContent = "";
  renderPlayers();
  clearSavedGameState();

  setupScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  requestGameWakeLock();

  beginRound(false);
}

function beginRound(useSameTopic = false) {
  const selected = activePlayers();

  if (selected.length < 2) return;

  if (!useSameTopic && !hasTopicForCurrentMode()) {
    endGame();
    setupMessage.textContent = noTopicMessageForCurrentMode();
    return;
  }

  if (!useSameTopic) {
    currentTopic = null;
  }

  roundNumber++;
  roundLabel.textContent = gameMode === "werewolf"
    ? `ROUND ${roundNumber} / ${werewolfTotalRounds}`
    : `ROUND ${roundNumber}`;
  updateWolfStatus();

  const randomizedPlayers = shuffle(selected);
  const numbers = uniqueNumbers(randomizedPlayers.length);

  roundPlayers = randomizedPlayers.map((player, index) => ({
    name: player.name,
    number: numbers[index]
  }));

  currentViewerIndex = 0;
  rankingOrder = [];
  correctOrder = [];
  revealCursor = -1;
  answerRevealPhase = "name";
  numberVisible = false;

  currentStageName = "number";
  showStage(numberStage);
  showViewerPass();
  saveGameState();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showStage(stage) {
  [numberStage, topicStage, rankingStage, answerStage, wolfStage].forEach(el => {
    el.classList.toggle("hidden", el !== stage);
  });
}

function showViewerPass() {
  hideSecretNumber();

  const player = roundPlayers[currentViewerIndex];
  dealProgress.textContent = `${currentViewerIndex + 1} / ${roundPlayers.length} 人目`;
  currentPlayer.textContent = `${player.name}さん`;

  passView.classList.remove("hidden");
  numberView.classList.add("hidden");
}

function revealSecretNumber() {
  const player = roundPlayers[currentViewerIndex];
  if (!player) return;

  numberVisible = true;
  secretNumber.textContent = player.number;
  if (gameMode === "werewolf") {
    var isWolf = player.name === werewolfName;
    secretRole.textContent = isWolf ? "🐺 あなたは人狼です" : "👥 あなたは市民です";
    secretRole.className = "secret-role " + (isWolf ? "wolf" : "citizen");
    wolfSecretHint.classList.toggle("hidden", !isWolf);
  } else {
    secretRole.classList.add("hidden");
    wolfSecretHint.classList.add("hidden");
  }

  passView.classList.add("hidden");
  numberView.classList.remove("hidden");

  playTone("reveal");
  vibrate(30);
  saveGameState();
}

function hideSecretNumber() {
  numberVisible = false;
  secretNumber.textContent = "--";
  secretRole.classList.add("hidden");
  wolfSecretHint.classList.add("hidden");
  numberView.classList.add("hidden");
}

function finishNumberView() {
  hideSecretNumber();
  playTone("tap");

  if (currentViewerIndex < roundPlayers.length - 1) {
    currentViewerIndex++;
    showViewerPass();
    saveGameState();
    return;
  }

  if (!currentTopic) {
    currentTopic = pickTopic();

    if (!currentTopic) {
      endGame();
      setupMessage.textContent = noTopicMessageForCurrentMode();
      return;
    }
  }

  showTopic();
}

function showTopic() {
  if (rangeRuleNotice) rangeRuleNotice.classList.toggle("hidden", gameMode !== "werewolf");
  topicEl.textContent = currentTopic.topic;
  minLabel.textContent = currentTopic.minLabel;
  maxLabel.textContent = currentTopic.maxLabel;

  currentStageName = "topic";
  showStage(topicStage);
  playTone("tap");
  vibrate(20);
  saveGameState();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openRanking() {
  // 最初の並びによる先入観をなくすため、順位は空の状態から始める。
  rankingOrder = [];
  currentStageName = "ranking";
  renderRankingSelection();
  showStage(rankingStage);
  saveGameState();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderRankingSelection() {
  rankSlots.innerHTML = roundPlayers.map(function(player, index) {
    var selectedName = rankingOrder[index];
    return `
      <div class="rank-slot ${selectedName ? "filled" : ""}">
        <span class="rank-slot-position">${index + 1}位</span>
        <span class="rank-slot-name ${selectedName ? "" : "empty"}">
          ${selectedName ? escapeHtml(selectedName) : "未選択"}
        </span>
      </div>
    `;
  }).join("");

  var unusedNames = roundPlayers
    .map(function(player) { return player.name; })
    .filter(function(name) { return rankingOrder.indexOf(name) === -1; });

  if (unusedNames.length) {
    rankButtons.innerHTML = unusedNames.map(function(name) {
      return `<button class="rank-select-button" type="button" data-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`;
    }).join("");

    var buttons = rankButtons.querySelectorAll(".rank-select-button");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function() {
        selectRankMember(this.getAttribute("data-name"));
      });
    }
  } else {
    rankButtons.innerHTML = `<div class="all-selected">全員選択しました ✓</div>`;
  }

  undoRankBtn.disabled = rankingOrder.length === 0;
  clearRankBtn.disabled = rankingOrder.length === 0;
  answerStartBtn.disabled = rankingOrder.length !== roundPlayers.length;
}

function selectRankMember(name) {
  if (rankingOrder.indexOf(name) !== -1) return;
  if (rankingOrder.length >= roundPlayers.length) return;

  rankingOrder.push(name);
  playTone("tap");
  vibrate(15);
  renderRankingSelection();
  saveGameState();
}

function undoRankSelection() {
  if (!rankingOrder.length) return;
  rankingOrder.pop();
  playTone("tap");
  renderRankingSelection();
  saveGameState();
}

function clearRankSelection() {
  rankingOrder = [];
  playTone("tap");
  renderRankingSelection();
  saveGameState();
}

function startAnswerReveal() {
  if (rankingOrder.length !== roundPlayers.length) return;

  correctOrder = [...roundPlayers].sort((a, b) => b.number - a.number);
  revealCursor = correctOrder.length - 1;
  answerRevealPhase = "name";
  currentStageName = "answer";

  renderAnswerPlaceholders();

  finalResult.classList.add("hidden");
  compareBoard.innerHTML = "";
  revealNextAnswerBtn.classList.remove("hidden");
  answerGuide.textContent = "名前 → 数字の順に発表します";
  updateAnswerRevealButton();

  showStage(answerStage);
  saveGameState();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAnswerPlaceholders() {
  answerRevealList.innerHTML = correctOrder.map(function(player, index) {
    return buildAnswerRow(player, index, false, false);
  }).join("");
}

function revealNextAnswer() {
  if (revealCursor < 0) return;

  const player = correctOrder[revealCursor];
  const row = $(`answerRow${revealCursor}`);
  const isFirst = revealCursor === 0;

  // 1回目：名前だけ発表。
  if (answerRevealPhase === "name") {
    row.className = "answer-row name-only just-revealed" + (isFirst ? " first-place" : "");
    row.innerHTML = `
      <span class="answer-rank">${revealCursor + 1}位</span>
      <span class="answer-name">${escapeHtml(player.name)}</span>
      <span class="answer-number">？</span>
    `;

    playTone("answer");
    vibrate(isFirst ? [35, 45, 35] : 25);

    answerRevealPhase = "number";
    answerGuide.textContent = isFirst
      ? "最後の数字は……"
      : `${revealCursor + 1}位は ${player.name}さん。数字は？`;

    updateAnswerRevealButton();
    saveGameState();
    return;
  }

  // 2回目：数字を発表。
  row.className = "answer-row just-revealed" + (isFirst ? " first-place winner-revealed" : "");
  row.innerHTML = `
    <span class="answer-rank">${revealCursor + 1}位</span>
    <span class="answer-name">${escapeHtml(player.name)}</span>
    <span class="answer-number">${player.number}</span>
  `;

  if (isFirst) {
    playTone("perfect");
    vibrate([60, 50, 90]);
    answerGuide.textContent = `1位は ${player.name}さん、${player.number}！`;
  } else {
    playTone("reveal");
    vibrate([25, 40, 25]);
    answerGuide.textContent = `${revealCursor + 1}位は ${player.name}さん、${player.number}`;
  }

  answerRevealPhase = "name";
  revealCursor--;
  saveGameState();

  if (revealCursor >= 0) {
    updateAnswerRevealButton();
  } else {
    revealNextAnswerBtn.classList.add("hidden");
    answerGuide.textContent = "全員の数字が出ました！";
    showFinalResult();
  }
}

function recordSessionResult(badge) {
  sessionStats.completed++;

  if (badge === "PERFECT！") {
    sessionStats.perfect++;
  } else if (badge === "惜しい！") {
    sessionStats.close++;
  } else if (badge === "あと少し！") {
    sessionStats.almost++;
  } else {
    sessionStats.challenge++;
  }
}

function renderSessionStats() {
  sessionStatsEl.innerHTML = `
    <div class="session-stat main">
      <strong>${sessionStats.completed} ROUND</strong>
      <span>今回遊んだ回数</span>
    </div>

    <div class="session-stat">
      <strong>${sessionStats.perfect}</strong>
      <span>PERFECT</span>
    </div>

    <div class="session-stat">
      <strong>${sessionStats.close}</strong>
      <span>惜しい！</span>
    </div>

    <div class="session-stat">
      <strong>${sessionStats.almost}</strong>
      <span>あと少し！</span>
    </div>

    <div class="session-stat">
      <strong>${sessionStats.challenge}</strong>
      <span>チャレンジ</span>
    </div>
  `;
}

function renderCompareBoard() {
  var correctByName = {};

  for (var i = 0; i < correctOrder.length; i++) {
    correctByName[correctOrder[i].name] = {
      rank: i,
      number: correctOrder[i].number
    };
  }

  var guessRows = rankingOrder.map(function(name, index) {
    var info = correctByName[name];
    var isMatch = info && info.rank === index;

    return `
      <div class="compare-row ${isMatch ? "match" : "miss"}">
        <span class="compare-rank">${index + 1}位</span>
        <span class="compare-name">${escapeHtml(name)}</span>
        <span class="compare-number compare-check">${isMatch ? "✓" : ""}</span>
      </div>
    `;
  }).join("");

  var correctRows = correctOrder.map(function(player, index) {
    var isMatch = rankingOrder[index] === player.name;

    return `
      <div class="compare-row ${isMatch ? "match" : ""}">
        <span class="compare-rank">${index + 1}位</span>
        <span class="compare-name">${escapeHtml(player.name)}</span>
        <span class="compare-number">${player.number}</span>
      </div>
    `;
  }).join("");

  compareBoard.innerHTML = `
    <div class="compare-column">
      <div class="compare-column-title">みんなの予想</div>
      ${guessRows}
    </div>
    <div class="compare-column">
      <div class="compare-column-title">正解</div>
      ${correctRows}
    </div>
  `;
}

function showFinalResult(shouldSaveHistory) {
  if (shouldSaveHistory === undefined) shouldSaveHistory = true;
  const correctNames = correctOrder.map(player => player.name);
  const exactPositions = rankingOrder.reduce((count, name, index) => (
    count + (correctNames[index] === name ? 1 : 0)
  ), 0);

  let badge = "";
  let detail = "";

  if (exactPositions === correctNames.length) {
    badge = "PERFECT！";
    detail = "全員の順番が完全正解！";
    playTone("perfect");
    vibrate([60, 50, 60, 50, 100]);
  } else if (exactPositions >= Math.max(1, correctNames.length - 2)) {
    badge = "惜しい！";
    detail = `${correctNames.length}人中 ${exactPositions}人が正しい位置でした。`;
  } else if (exactPositions >= Math.ceil(correctNames.length / 2)) {
    badge = "あと少し！";
    detail = `${correctNames.length}人中 ${exactPositions}人が正しい位置でした。`;
  } else {
    badge = "ナイスチャレンジ！";
    detail = `${correctNames.length}人中 ${exactPositions}人が正しい位置でした。`;
  }

  resultBadge.textContent = badge;
  resultDetail.textContent = detail;

  if (shouldSaveHistory) {
    recordSessionResult(badge);
    if (gameMode === "werewolf" && badge !== "PERFECT！") {
      werewolfMisses++;
    }
  }

  updateWolfStatus();
  renderSessionStats();
  guessSummary.textContent = rankingOrder.map((name, index) => `${index + 1}位 ${name}`).join(" → ");
  renderCompareBoard();
  renderFavoriteButton();

  finalResult.classList.remove("hidden");

  if (gameMode === "werewolf") {
    var isLastRound = roundNumber >= werewolfTotalRounds;
    nextRoundBtn.textContent = isLastRound ? "🐺 人狼を当てる" : "次のラウンド";
    sameTopicBtn.classList.toggle("hidden", isLastRound);
  } else {
    nextRoundBtn.textContent = "次のラウンド";
    sameTopicBtn.classList.remove("hidden");
  }

  if (shouldSaveHistory) {
    saveHistory({
      round: roundNumber,
      topic: currentTopic.topic,
      guess: [...rankingOrder],
      correct: correctOrder.map(player => ({ name: player.name, number: player.number })),
      result: badge
    });
  }

  saveGameState();
}

function openWolfGuessStage() {
  if (gameMode !== "werewolf") return;
  currentStageName = "wolf";
  wolfGuessName = null;
  wolfFinalResult.classList.add("hidden");
  finishWolfGameBtn.classList.add("hidden");
  revealWolfBtn.classList.remove("hidden");
  revealWolfBtn.disabled = true;
  wolfGuessButtons.innerHTML = activePlayers().map(function(player) {
    return `<button class="rank-person-button wolf-guess-button" type="button" data-name="${escapeHtml(player.name)}">${escapeHtml(player.name)}</button>`;
  }).join("");
  wolfGuessButtons.querySelectorAll("button").forEach(function(button) {
    button.addEventListener("click", function() {
      wolfGuessName = button.dataset.name;
      wolfGuessButtons.querySelectorAll("button").forEach(function(b) { b.classList.toggle("selected", b === button); });
      revealWolfBtn.disabled = false;
      saveGameState();
    });
  });
  showStage(wolfStage);
  saveGameState();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function revealWerewolfResult() {
  if (!wolfGuessName || !werewolfName) return;
  var caught = wolfGuessName === werewolfName;
  var sabotageSuccess = werewolfMisses >= wolfMissTarget();
  var wolfWins = !caught && sabotageSuccess;
  var title = wolfWins ? "🐺 人狼の勝利！" : "👥 市民の勝利！";
  var reason = caught
    ? `人狼 ${escapeHtml(werewolfName)} を見破りました！ 正体がバレたため人狼の負けです。`
    : sabotageSuccess
      ? `人狼は ${escapeHtml(werewolfName)}！ 正体を隠したまま ${werewolfMisses}回のミスを起こしました。`
      : `人狼は ${escapeHtml(werewolfName)}！ 正体は隠せましたが、ミスは ${werewolfMisses}回で目標の${wolfMissTarget()}回に届きませんでした。`;
  wolfFinalResult.innerHTML = `<div class="wolf-result-title">${title}</div><div class="wolf-result-reveal">人狼は…… <strong>${escapeHtml(werewolfName)}</strong> 🐺</div><p>${reason}</p><div class="wolf-result-score">並び替えミス ${werewolfMisses} / 目標 ${wolfMissTarget()}</div>`;
  wolfFinalResult.classList.remove("hidden");
  revealWolfBtn.classList.add("hidden");
  wolfGuessButtons.querySelectorAll("button").forEach(function(b) { b.disabled = true; });
  finishWolfGameBtn.classList.remove("hidden");
  playTone(wolfWins ? "answer" : "perfect");
  vibrate(wolfWins ? [40,50,40] : [60,50,60,50,100]);
  saveGameState();
}

function handleNextRound() {
  if (gameMode === "werewolf" && roundNumber >= werewolfTotalRounds) {
    openWolfGuessStage();
  } else {
    beginRound(false);
  }
}

function loadHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

function saveHistory(entry) {
  const history = loadHistory();
  history.unshift({
    ...entry,
    savedAt: new Date().toISOString()
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
}

function openConfirmDialog(options) {
  pendingConfirmAction = options.onConfirm || null;

  confirmTitle.textContent = options.title || "確認";
  confirmMessage.textContent = options.message || "";
  confirmOkBtn.textContent = options.okText || "実行する";

  confirmModal.classList.remove("hidden");
  confirmCancelBtn.focus();
}

function closeConfirmDialog() {
  pendingConfirmAction = null;
  confirmModal.classList.add("hidden");
}

function runConfirmedAction() {
  var action = pendingConfirmAction;
  pendingConfirmAction = null;
  confirmModal.classList.add("hidden");

  if (typeof action === "function") {
    action();
  }
}

function openHistory() {
  const history = loadHistory();

  if (!history.length) {
    historyList.innerHTML = `<div class="history-empty">まだ履歴はありません。</div>`;
  } else {
    historyList.innerHTML = history.map(item => {
      const correctText = item.correct
        .map((p, index) => `${index + 1}位 ${escapeHtml(p.name)}(${p.number})`)
        .join(" → ");

      return `
        <div class="history-item">
          <div class="history-top">
            <span>ROUND ${item.round}</span>
            <span>${escapeHtml(item.result)}</span>
          </div>
          <div class="history-topic">${escapeHtml(item.topic)}</div>
          <div class="history-result">${correctText}</div>
        </div>
      `;
    }).join("");
  }

  historyModal.classList.remove("hidden");
}

function closeHistory() {
  historyModal.classList.add("hidden");
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  openHistory();
}

function endGame() {
  hideSecretNumber();
  gameActive = false;
  currentStageName = "setup";
  releaseGameWakeLock();
  clearSavedGameState();
  roundPlayers = [];
  rankingOrder = [];
  correctOrder = [];
  currentTopic = null;
  werewolfName = null;
  werewolfMisses = 0;
  wolfGuessName = null;

  gameScreen.classList.add("hidden");
  setupScreen.classList.remove("hidden");
  renderPlayers();
  updateFavoriteUI();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetTopics() {
  clearTopicProgress();
  remainingTopics = allTopics.slice();
  saveTopicProgress();

  updateRemaining();
  setupMessage.textContent = "お題を500個に戻しました。";
  saveGameState();
}

soundToggle.addEventListener("change", saveSettings);
vibrationToggle.addEventListener("change", saveSettings);

topicModeInputs.forEach(function(input) {
  input.addEventListener("change", function() {
    saveSettings();
    setupMessage.textContent = "";
  });
});
gameModeInputs.forEach(function(input) {
  input.addEventListener("change", function() {
    saveSettings();
    syncGameModeControls();
    setupMessage.textContent = "";
  });
});
wolfRoundInputs.forEach(function(input) {
  input.addEventListener("change", function() {
    saveSettings();
    syncGameModeControls();
  });
});
wolfDifficultyInputs.forEach(function(input) {
  input.addEventListener("change", function() {
    saveSettings();
    syncGameModeControls();
    setupMessage.textContent = "";
  });
});

startBtn.addEventListener("click", startGame);
resetTopicsBtn.addEventListener("click", function() {
  openConfirmDialog({
    title: "お題をリセットしますか？",
    message: "使用済みのお題の記録を消して、残りを500問に戻します。\nこの操作は元に戻せません。",
    okText: "500問に戻す",
    onConfirm: resetTopics
  });
});

historyBtn.addEventListener("click", openHistory);
resumeGameBtn.addEventListener("click", restoreSavedGame);

discardGameBtn.addEventListener("click", function() {
  openConfirmDialog({
    title: "前回のゲームを破棄しますか？",
    message: "途中のROUND情報は消えます。\n使用済みお題と履歴は残ります。",
    okText: "ゲームを破棄",
    onConfirm: clearSavedGameState
  });
});

endGameBtn.addEventListener("click", function() {
  openConfirmDialog({
    title: "ゲームを終了しますか？",
    message: "現在のROUNDを終了して参加者選択へ戻ります。\n使用済みお題と履歴は残ります。",
    okText: "ゲーム終了",
    onConfirm: endGame
  });
});
revealBtn.addEventListener("click", revealSecretNumber);
hideNumberBtn.addEventListener("click", finishNumberView);
goRankingBtn.addEventListener("click", openRanking);
undoRankBtn.addEventListener("click", undoRankSelection);
clearRankBtn.addEventListener("click", clearRankSelection);
answerStartBtn.addEventListener("click", startAnswerReveal);
revealNextAnswerBtn.addEventListener("click", revealNextAnswer);
favoriteTopicBtn.addEventListener("click", toggleCurrentTopicFavorite);
nextRoundBtn.addEventListener("click", handleNextRound);
sameTopicBtn.addEventListener("click", () => beginRound(true));
revealWolfBtn.addEventListener("click", revealWerewolfResult);
finishWolfGameBtn.addEventListener("click", endGame);

closeHistoryBtn.addEventListener("click", closeHistory);
clearHistoryBtn.addEventListener("click", function() {
  openConfirmDialog({
    title: "履歴をすべて削除しますか？",
    message: "保存されているゲーム履歴をすべて削除します。\nこの操作は元に戻せません。",
    okText: "履歴を削除",
    onConfirm: clearHistory
  });
});

confirmCancelBtn.addEventListener("click", closeConfirmDialog);
confirmOkBtn.addEventListener("click", runConfirmedAction);

confirmModal.addEventListener("click", function(event) {
  if (event.target === confirmModal) {
    closeConfirmDialog();
  }
});

document.addEventListener("keydown", function(event) {
  if (event.key === "Escape" && !confirmModal.classList.contains("hidden")) {
    closeConfirmDialog();
  }
});
historyModal.addEventListener("click", event => {
  if (event.target === historyModal) closeHistory();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    saveGameState();

    if (numberVisible) {
      hideSecretNumber();
      passView.classList.remove("hidden");
    }

    return;
  }

  if (gameActive) {
    requestGameWakeLock();
  }
});

window.addEventListener("pagehide", () => {
  saveGameState();
  if (numberVisible) hideSecretNumber();
  releaseGameWakeLock();
});

loadSettings();
renderPlayers();
loadTopics();
