const PLAYER_DEFAULTS=[['たけ',1],['ゆか',1],['たろう',1],['かず',1],['つよし',0],['りさ',0]];
const $=id=>document.getElementById(id); const screens=['answererPass','secretStage','topicStage','guessPass','guessStage','roundSaved','results'];
let selected=[],order=[],round=0,current=null,guessers=[],gi=0,records=[];
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function show(id){screens.forEach(x=>$(x).classList.toggle('hidden',x!==id));}
function renderPlayers(){ $('players').innerHTML=PLAYER_DEFAULTS.map((p,i)=>`<label class="player"><input type="checkbox" data-i="${i}" ${p[1]?'checked':''}><span>${p[0]}</span></label>`).join(''); }
function topics(){return Array.isArray(window.TOPICS_DATA)?window.TOPICS_DATA:[];}
function pickTopic(){const a=topics(); return a[Math.floor(Math.random()*a.length)]||{topic:'お題データを読み込めませんでした',minLabel:'1',maxLabel:'100'};}

function topicHtml(t){return esc((t&&t.displayTopic)||((t&&t.topic)||'')).split('｜').map(line=>`<span class="topic-line">${line}</span>`).join('');}
function setTopicText(el,t){el.innerHTML=topicHtml(t);}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function start(){selected=[...document.querySelectorAll('#players input:checked')].map(x=>PLAYER_DEFAULTS[+x.dataset.i][0]);if(selected.length<3){$('msg').textContent='3人以上選んでください。';return;} order=shuffle(selected);round=0;records=[];$('setup').classList.add('hidden');$('game').classList.remove('hidden');beginRound();}
function beginRound(){current={answerer:order[round],secret:1+Math.floor(Math.random()*100),topic:pickTopic(),guesses:{}};guessers=shuffle(selected.filter(n=>n!==current.answerer));gi=0;$('roundLabel').textContent=`${round+1} / ${order.length}人目`;$('answererName').textContent=current.answerer;show('answererPass');}
$('showSecretBtn').onclick=()=>{$('secretOwner').textContent=`${current.answerer} の秘密の数字`;$('secretNumber').textContent=current.secret;show('secretStage');};
$('hideSecretBtn').onclick=()=>{const t=current.topic;setTopicText($('topic'),t);$('minLabel').textContent=t.min_label||t.min||'小さい';$('maxLabel').textContent=t.max_label||t.max||'大きい';$('answererPrompt').textContent=`${current.answerer}さん、回答してください` ;show('topicStage');};
$('startGuessBtn').onclick=()=>prepareGuesser();
function prepareGuesser(){if(gi>=guessers.length){records.push(current);show('roundSaved');$('savedTitle').textContent=`${current.answerer}のラウンドを保存しました`; $('nextAnswererBtn').textContent=round>=order.length-1?'結果発表へ':'次の回答者へ';return;} $('guesserName').textContent=guessers[gi];show('guessPass');}
$('openGuessBtn').onclick=()=>{$('guessTarget').textContent=current.answerer;setTopicText($('guessTopic'),current.topic);$('guessInput').value='';show('guessStage');setTimeout(()=>$('guessInput').focus(),100);};
$('saveGuessBtn').onclick=()=>{const v=Number($('guessInput').value);if(!Number.isInteger(v)||v<1||v>100){alert('1〜100の数字を入力してください');return;}current.guesses[guessers[gi]]=v;gi++;prepareGuesser();};
$('nextAnswererBtn').onclick=()=>{round++;if(round>=order.length)renderResults();else beginRound();};
function renderResults(){show('results');const totals=Object.fromEntries(selected.map(n=>[n,{sum:0,count:0}]));$('resultRounds').innerHTML=records.map((r,i)=>{let rows=selected.filter(n=>n!==r.answerer).map(n=>{const g=r.guesses[n],signed=g-r.secret,err=Math.abs(signed);totals[n].sum+=err;totals[n].count++;return `<div class="error-row"><b>${esc(n)}</b><span>予想 ${g}</span><strong>${signed===0?'±0':signed>0?'＋'+signed:'−'+Math.abs(signed)}</strong><small>誤差 ${err}</small></div>`}).join('');return `<div class="result-card"><div class="result-head"><span>${i+1}</span><h3>${esc(r.answerer)}の価値観</h3><b>正解 ${r.secret}</b></div><p class="result-topic">${topicHtml(r.topic)}</p>${rows}</div>`}).join('');const rank=selected.map(n=>({n,...totals[n],avg:totals[n].count?totals[n].sum/totals[n].count:0})).sort((a,b)=>a.avg-b.avg);$('finalRanking').innerHTML=rank.map((x,i)=>`<div class="rank-row"><span>${i+1}位</span><b>${esc(x.n)}</b><strong>平均誤差 ${x.avg.toFixed(1)}</strong><small>総誤差 ${x.sum}</small></div>`).join('');}
$('startBtn').onclick=start;$('quitBtn').onclick=()=>{if(confirm('ゲームを終了しますか？'))location.reload();};$('restartBtn').onclick=()=>location.reload();renderPlayers();
