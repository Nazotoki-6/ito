const players = [
  { name: "ゆか", checked: true },
  { name: "たけ", checked: true },
  { name: "つね", checked: true },
  { name: "ともみ", checked: true },
  { name: "お母さん", checked: false },
  { name: "お父さん", checked: false }
];

const $ = id => document.getElementById(id);

let allTopics = [];
let remainingTopics = [];
let currentTopic = null;

let roundPlayers = [];
let currentViewerIndex = 0;
let rankingOrder = [];
let correctOrder = [];
let revealCursor = -1;
let roundNumber = 0;
let gameActive = false;
let numberVisible = false;

let soundEnabled = true;
let vibrationEnabled = true;
let audioContext = null;

const HISTORY_KEY = "itoHistoryV6";
const SETTINGS_KEY = "itoSettingsV6";

const setupScreen = $("setupScreen");
const gameScreen = $("gameScreen");
const playersEl = $("players");
const remainingEl = $("remaining");
const soundToggle = $("soundToggle");
const vibrationToggle = $("vibrationToggle");
const startBtn = $("startBtn");
const resetTopicsBtn = $("resetTopicsBtn");
const setupMessage = $("setupMessage");
const historyBtn = $("historyBtn");

const roundLabel = $("roundLabel");
const endGameBtn = $("endGameBtn");

const numberStage = $("numberStage");
const dealProgress = $("dealProgress");
const passView = $("passView");
const numberView = $("numberView");
const currentPlayer = $("currentPlayer");
const secretNumber = $("secretNumber");
const revealBtn = $("revealBtn");
const hideNumberBtn = $("hideNumberBtn");

const topicStage = $("topicStage");
const topicEl = $("topic");
const minLabel = $("minLabel");
const maxLabel = $("maxLabel");
const goRankingBtn = $("goRankingBtn");

const rankingStage = $("rankingStage");
const sortableList = $("sortableList");
const answerStartBtn = $("answerStartBtn");

const answerStage = $("answerStage");
const answerRevealList = $("answerRevealList");
const revealNextAnswerBtn = $("revealNextAnswerBtn");
const finalResult = $("finalResult");
const resultBadge = $("resultBadge");
const resultDetail = $("resultDetail");
const guessSummary = $("guessSummary");
const nextRoundBtn = $("nextRoundBtn");
const sameTopicBtn = $("sameTopicBtn");

const historyModal = $("historyModal");
const historyList = $("historyList");
const closeHistoryBtn = $("closeHistoryBtn");
const clearHistoryBtn = $("clearHistoryBtn");

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
  for (var i = 1; i <= 100; i++) numbers.push(i);
  return shuffle(numbers).slice(0, count);
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

  remainingTopics = [...allTopics];
  updateRemaining();
}

function updateRemaining() {
  remainingEl.textContent = `お題 残り ${remainingTopics.length} / ${allTopics.length}`;
}

function pickTopic() {
  if (!remainingTopics.length) return null;
  const index = Math.floor(Math.random() * remainingTopics.length);
  const [topic] = remainingTopics.splice(index, 1);
  updateRemaining();
  return topic;
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    soundEnabled = saved.sound !== false;
    vibrationEnabled = saved.vibration !== false;
  } catch {
    soundEnabled = true;
    vibrationEnabled = true;
  }

  soundToggle.checked = soundEnabled;
  vibrationToggle.checked = vibrationEnabled;
}

function saveSettings() {
  soundEnabled = soundToggle.checked;
  vibrationEnabled = vibrationToggle.checked;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    sound: soundEnabled,
    vibration: vibrationEnabled
  }));
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

  if (selected.length < 2) {
    setupMessage.textContent = "参加者を2人以上選んでください。";
    return;
  }

  if (!remainingTopics.length) {
    setupMessage.textContent = "お題をすべて使いました。お題をリセットしてください。";
    return;
  }

  saveSettings();
  ensureAudio();

  gameActive = true;
  roundNumber = 0;
  setupMessage.textContent = "";
  renderPlayers();

  setupScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  beginRound(false);
}

function beginRound(useSameTopic = false) {
  const selected = activePlayers();

  if (selected.length < 2) return;

  if (!useSameTopic) {
    currentTopic = null;
  }

  roundNumber++;
  roundLabel.textContent = `ROUND ${roundNumber}`;

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
  numberVisible = false;

  showStage(numberStage);
  showViewerPass();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showStage(stage) {
  [numberStage, topicStage, rankingStage, answerStage].forEach(el => {
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

  passView.classList.add("hidden");
  numberView.classList.remove("hidden");

  playTone("reveal");
  vibrate(30);
}

function hideSecretNumber() {
  numberVisible = false;
  secretNumber.textContent = "--";
  numberView.classList.add("hidden");
}

function finishNumberView() {
  hideSecretNumber();
  playTone("tap");

  if (currentViewerIndex < roundPlayers.length - 1) {
    currentViewerIndex++;
    showViewerPass();
    return;
  }

  if (!currentTopic) {
    currentTopic = pickTopic();

    if (!currentTopic) {
      endGame(false);
      setupMessage.textContent = "お題をすべて使いました。お題をリセットしてください。";
      return;
    }
  }

  showTopic();
}

function showTopic() {
  topicEl.textContent = currentTopic.topic;
  minLabel.textContent = currentTopic.minLabel;
  maxLabel.textContent = currentTopic.maxLabel;

  showStage(topicStage);
  playTone("tap");
  vibrate(20);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openRanking() {
  // Neutral random starting order so neither setup order nor secret-view order biases the group.
  rankingOrder = shuffle(roundPlayers.map(player => player.name));
  renderSortable();
  showStage(rankingStage);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderSortable() {
  sortableList.innerHTML = rankingOrder.map(function(name, index) {
    return `
      <div class="rank-card" data-name="${escapeHtml(name)}">
        <span class="rank-index">${index + 1}位</span>
        <span class="rank-name">${escapeHtml(name)}</span>
        <div class="rank-controls">
          <button class="move-btn move-up" type="button" aria-label="上へ">↑</button>
          <button class="move-btn move-down" type="button" aria-label="下へ">↓</button>
        </div>
      </div>
    `;
  }).join("");

  var cards = sortableList.querySelectorAll(".rank-card");
  for (var i = 0; i < cards.length; i++) {
    (function(index) {
      var card = cards[index];
      var up = card.querySelector(".move-up");
      var down = card.querySelector(".move-down");

      up.disabled = index === 0;
      down.disabled = index === cards.length - 1;

      up.addEventListener("click", function(event) {
        event.stopPropagation();
        moveRank(index, -1);
      });

      down.addEventListener("click", function(event) {
        event.stopPropagation();
        moveRank(index, 1);
      });
    })(i);
  }

  attachSortableEvents();
}

function moveRank(index, direction) {
  var target = index + direction;
  if (target < 0 || target >= rankingOrder.length) return;

  var temp = rankingOrder[index];
  rankingOrder[index] = rankingOrder[target];
  rankingOrder[target] = temp;

  playTone("tap");
  vibrate(15);
  renderSortable();
}

function syncRankingFromDom() {
  var cards = sortableList.querySelectorAll(".rank-card");
  rankingOrder = [];

  for (var i = 0; i < cards.length; i++) {
    rankingOrder.push(cards[i].getAttribute("data-name"));
    cards[i].querySelector(".rank-index").textContent = (i + 1) + "位";
  }
}

function attachSortableEvents() {
  var cards = sortableList.querySelectorAll(".rank-card");

  for (var i = 0; i < cards.length; i++) {
    (function(card) {
      var dragging = false;
      var activePointer = null;
      var touchId = null;

      function isMoveButton(target) {
        return target && target.classList && target.classList.contains("move-btn");
      }

      function moveCard(clientY) {
        var allCards = sortableList.querySelectorAll(".rank-card");
        var inserted = false;

        for (var j = 0; j < allCards.length; j++) {
          var other = allCards[j];
          if (other === card) continue;

          var rect = other.getBoundingClientRect();
          if (clientY < rect.top + rect.height / 2) {
            sortableList.insertBefore(card, other);
            inserted = true;
            break;
          }
        }

        if (!inserted) sortableList.appendChild(card);
        syncRankingFromDom();
      }

      if (window.PointerEvent) {
        card.addEventListener("pointerdown", function(event) {
          if (isMoveButton(event.target)) return;
          activePointer = event.pointerId;
          dragging = true;

          if (card.setPointerCapture) {
            try { card.setPointerCapture(event.pointerId); } catch (e) {}
          }

          card.classList.add("dragging");
          event.preventDefault();
        });

        card.addEventListener("pointermove", function(event) {
          if (!dragging || activePointer !== event.pointerId) return;
          moveCard(event.clientY);
          event.preventDefault();
        });

        function endPointer(event) {
          if (!dragging || activePointer !== event.pointerId) return;
          dragging = false;
          activePointer = null;
          card.classList.remove("dragging");
          syncRankingFromDom();
          renderSortable();
          event.preventDefault();
        }

        card.addEventListener("pointerup", endPointer);
        card.addEventListener("pointercancel", endPointer);
      }

      card.addEventListener("touchstart", function(event) {
        if (isMoveButton(event.target)) return;
        if (!event.changedTouches || !event.changedTouches.length) return;

        touchId = event.changedTouches[0].identifier;
        dragging = true;
        card.classList.add("dragging");
      }, { passive: true });

      card.addEventListener("touchmove", function(event) {
        if (!dragging || touchId === null) return;

        for (var k = 0; k < event.changedTouches.length; k++) {
          var touch = event.changedTouches[k];
          if (touch.identifier === touchId) {
            moveCard(touch.clientY);
            event.preventDefault();
            break;
          }
        }
      }, { passive: false });

      function endTouch() {
        if (!dragging) return;
        dragging = false;
        touchId = null;
        card.classList.remove("dragging");
        syncRankingFromDom();
        renderSortable();
      }

      card.addEventListener("touchend", endTouch, { passive: true });
      card.addEventListener("touchcancel", endTouch, { passive: true });
    })(cards[i]);
  }
}

function startAnswerReveal() {
  syncRankingFromDom();

  correctOrder = [...roundPlayers].sort((a, b) => b.number - a.number);
  revealCursor = correctOrder.length - 1;

  renderAnswerPlaceholders();

  finalResult.classList.add("hidden");
  revealNextAnswerBtn.classList.remove("hidden");
  revealNextAnswerBtn.textContent = "最下位から発表";

  showStage(answerStage);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAnswerPlaceholders() {
  answerRevealList.innerHTML = correctOrder.map((player, index) => `
    <div id="answerRow${index}" class="answer-placeholder">
      <span class="answer-rank">${index + 1}位</span>
      <span class="answer-name">？？？</span>
      <span class="answer-number">？</span>
    </div>
  `).join("");
}

function revealNextAnswer() {
  if (revealCursor < 0) return;

  const player = correctOrder[revealCursor];
  const row = $(`answerRow${revealCursor}`);

  row.className = "answer-row just-revealed";
  row.innerHTML = `
    <span class="answer-rank">${revealCursor + 1}位</span>
    <span class="answer-name">${escapeHtml(player.name)}</span>
    <span class="answer-number">${player.number}</span>
  `;

  playTone("answer");
  vibrate([25, 40, 25]);

  revealCursor--;

  if (revealCursor >= 0) {
    revealNextAnswerBtn.textContent = `${revealCursor + 1}位を発表`;
  } else {
    revealNextAnswerBtn.classList.add("hidden");
    showFinalResult();
  }
}

function showFinalResult() {
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
  guessSummary.textContent = rankingOrder.map((name, index) => `${index + 1}位 ${name}`).join(" → ");

  finalResult.classList.remove("hidden");

  saveHistory({
    round: roundNumber,
    topic: currentTopic.topic,
    guess: [...rankingOrder],
    correct: correctOrder.map(player => ({ name: player.name, number: player.number })),
    result: badge
  });
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
  if (!confirm("履歴をすべて消しますか？")) return;
  localStorage.removeItem(HISTORY_KEY);
  openHistory();
}

function endGame(ask = true) {
  if (ask && !confirm("ゲームを終了して参加者選択に戻りますか？")) return;

  hideSecretNumber();
  gameActive = false;
  roundPlayers = [];
  rankingOrder = [];
  correctOrder = [];
  currentTopic = null;

  gameScreen.classList.add("hidden");
  setupScreen.classList.remove("hidden");
  renderPlayers();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetTopics() {
  remainingTopics = [...allTopics];
  updateRemaining();
  setupMessage.textContent = "お題を500個に戻しました。";
}

soundToggle.addEventListener("change", saveSettings);
vibrationToggle.addEventListener("change", saveSettings);
startBtn.addEventListener("click", startGame);
resetTopicsBtn.addEventListener("click", resetTopics);
historyBtn.addEventListener("click", openHistory);

endGameBtn.addEventListener("click", () => endGame(true));
revealBtn.addEventListener("click", revealSecretNumber);
hideNumberBtn.addEventListener("click", finishNumberView);
goRankingBtn.addEventListener("click", openRanking);
answerStartBtn.addEventListener("click", startAnswerReveal);
revealNextAnswerBtn.addEventListener("click", revealNextAnswer);
nextRoundBtn.addEventListener("click", () => beginRound(false));
sameTopicBtn.addEventListener("click", () => beginRound(true));

closeHistoryBtn.addEventListener("click", closeHistory);
clearHistoryBtn.addEventListener("click", clearHistory);
historyModal.addEventListener("click", event => {
  if (event.target === historyModal) closeHistory();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && numberVisible) {
    hideSecretNumber();
    passView.classList.remove("hidden");
  }
});

window.addEventListener("pagehide", () => {
  if (numberVisible) hideSecretNumber();
});

loadSettings();
renderPlayers();
loadTopics();
