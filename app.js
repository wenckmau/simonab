const STORAGE_KEY = "java_quiz_progress_v2";

function nowMs(){ return Date.now(); }
function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function clamp(n, lo, hi){ return Math.max(lo, Math.min(hi, n)); }

function loadProgress(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch(e){ return {}; }
}
function saveProgress(p){ localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }
function resetProgress(){ localStorage.removeItem(STORAGE_KEY); }

function defaultCard(){
  return { streak:0, due:0, last:0, wrong:0, right:0 };
}
function nextIntervalMs(streak){
  const mins = [0,10,60,360,1440,4320,10080,20160];
  const idx = clamp(streak, 0, mins.length-1);
  return mins[idx]*60*1000;
}

let ALL = [];
let SESSION = null;

const els = {
  mode: document.getElementById("mode"),
  topic: document.getElementById("topic"),
  count: document.getElementById("count"),
  startBtn: document.getElementById("startBtn"),
  resetBtn: document.getElementById("resetBtn"),

  quizPanel: document.getElementById("quizPanel"),
  questionBox: document.getElementById("questionBox"),
  answersBox: document.getElementById("answersBox"),
  submitBtn: document.getElementById("submitBtn"),
  nextBtn: document.getElementById("nextBtn"),
  quitBtn: document.getElementById("quitBtn"),
  explainBox: document.getElementById("explainBox"),
  explainText: document.getElementById("explainText"),
  sourceText: document.getElementById("sourceText"),
  progress: document.getElementById("progress"),
  topicPill: document.getElementById("topicPill"),

  resultPanel: document.getElementById("resultPanel"),
  resultText: document.getElementById("resultText"),
  reviewBox: document.getElementById("reviewBox"),
  backBtn: document.getElementById("backBtn"),
};

function uniqueTopics(qs){
  const s = new Set();
  qs.forEach(q => s.add(q.topic || "General"));
  return Array.from(s).sort((a,b)=>a.localeCompare(b));
}

function populateTopics(){
  const topics = uniqueTopics(ALL);
  for(const t of topics){
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    els.topic.appendChild(opt);
  }
}

function getFilteredQuestions(){
  const topic = els.topic.value;
  return (topic==="all") ? ALL : ALL.filter(q => (q.topic||"General")===topic);
}

function pickPracticeSet(qs, n){
  const prog = loadProgress();
  const t = nowMs();
  const scored = qs.map(q=>{
    const c = prog[q.id] || defaultCard();
    const due = (c.due || 0) <= t;
    const diff = (c.wrong+1)/(c.right+1);
    const score = (due?1000:0) + (10 - (c.streak||0))*10 + diff*5 + Math.random();
    return {q, score};
  }).sort((a,b)=>b.score-a.score).map(x=>x.q);
  return scored.slice(0, n);
}
function pickExamSet(qs, n){ return shuffle(qs).slice(0, n); }

function start(){
  const qs = getFilteredQuestions();
  const n = clamp(parseInt(els.count.value||"20",10), 1, qs.length);
  const mode = els.mode.value;

  const set = (mode==="practice") ? pickPracticeSet(qs, n) : pickExamSet(qs, n);

  SESSION = { mode, set, idx:0, answers:[], locked:false };

  els.resultPanel.hidden = true;
  els.quizPanel.hidden = false;
  els.explainBox.hidden = true;
  els.nextBtn.hidden = true;
  els.submitBtn.disabled = true;

  renderCurrent();
}

function renderCurrent(){
  const q = SESSION.set[SESSION.idx];
  els.topicPill.textContent = q.topic || "General";
  els.progress.textContent = `Întrebarea ${SESSION.idx+1}/${SESSION.set.length}`;
  els.questionBox.textContent = q.q;

  els.answersBox.innerHTML = "";
  els.explainBox.open = false;
  els.explainBox.hidden = true;
  els.submitBtn.disabled = true;
  els.nextBtn.hidden = true;
  SESSION.locked = false;

  if(q.type==="mcq"){
    q.choices.forEach((choice, i)=>{
      const label = document.createElement("label");
      label.className = "choice";
      const input = document.createElement("input");
      input.type="radio"; input.name="ans"; input.value=String(i);
      input.addEventListener("change", ()=>{ els.submitBtn.disabled = false; });
      const span = document.createElement("span"); span.textContent = choice;
      label.appendChild(input); label.appendChild(span);
      els.answersBox.appendChild(label);
    });
  } else if(q.type==="tf"){
    ["Adevărat","Fals"].forEach((choice, i)=>{
      const label = document.createElement("label");
      label.className = "choice";
      const input = document.createElement("input");
      input.type="radio"; input.name="ans"; input.value=String(i);
      input.addEventListener("change", ()=>{ els.submitBtn.disabled = false; });
      const span = document.createElement("span"); span.textContent = choice;
      label.appendChild(input); label.appendChild(span);
      els.answersBox.appendChild(label);
    });
  } else if(q.type==="fill"){
    const wrap = document.createElement("div");
    wrap.className = "choice";
    const input = document.createElement("input");
    input.type="text"; input.placeholder="Scrie răspunsul…"; input.style.width="100%";
    input.addEventListener("input", ()=>{ els.submitBtn.disabled = (input.value.trim().length===0); });
    wrap.appendChild(input);
    els.answersBox.appendChild(wrap);
  } else {
    els.answersBox.textContent = "Tip de întrebare necunoscut.";
  }
}

function getUserAnswer(q){
  if(q.type==="fill"){
    const inp = els.answersBox.querySelector("input[type='text']");
    return (inp?.value ?? "").trim();
  }
  const sel = els.answersBox.querySelector("input[name='ans']:checked");
  if(!sel) return null;
  return parseInt(sel.value,10);
}

function isCorrect(q, ua){
  if(q.type==="mcq") return ua === q.answer;
  if(q.type==="tf"){
    const truth = (ua===0);
    return truth === q.answer;
  }
  if(q.type==="fill"){
    const want = (q.answer_text || "").trim().toLowerCase();
    const got  = (ua || "").trim().toLowerCase();
    return got === want;
  }
  return false;
}

function correctAnswerText(q){
  if(q.type==="mcq") return q.choices[q.answer];
  if(q.type==="tf") return q.answer ? "Adevărat" : "Fals";
  if(q.type==="fill") return q.answer_text;
  return "";
}

function updatePracticeProgress(q, ok){
  const prog = loadProgress();
  const card = prog[q.id] || defaultCard();
  card.last = nowMs();
  if(ok){ card.right += 1; card.streak = (card.streak||0)+1; }
  else { card.wrong += 1; card.streak = 0; }
  card.due = nowMs() + nextIntervalMs(card.streak);
  prog[q.id] = card;
  saveProgress(prog);
}

function submit(){
  if(SESSION.locked) return;
  const q = SESSION.set[SESSION.idx];
  const ua = getUserAnswer(q);
  if(ua===null || ua==="") return;

  const ok = isCorrect(q, ua);
  SESSION.answers.push({
    id:q.id, correct:ok, userAnswer:(q.type==="fill")?ua:String(ua),
    correctAnswer: correctAnswerText(q), explain:q.explain||"", source:q.source||"", qText:q.q
  });

  if(SESSION.mode==="practice"){
    updatePracticeProgress(q, ok);
    els.explainText.textContent = (ok ? "✅ Corect. " : "❌ Greșit. ") + (q.explain || "");
    els.sourceText.textContent = q.source ? `Sursă: ${q.source}` : "";
    els.explainBox.hidden = false;
  }
  els.nextBtn.hidden = false;
  SESSION.locked = true;
  els.submitBtn.disabled = true;
  els.nextBtn.focus();
}

function next(){
  if(SESSION.idx < SESSION.set.length - 1){
    SESSION.idx += 1;
    renderCurrent();
  } else showResults();
}

function showResults(){
  els.quizPanel.hidden = true;
  els.resultPanel.hidden = false;

  const total = SESSION.answers.length;
  const good = SESSION.answers.filter(a=>a.correct).length;
  els.resultText.textContent = `Ai ${good}/${total} corecte.`;

  els.reviewBox.innerHTML = "";
  SESSION.answers.forEach((a,i)=>{
    const div = document.createElement("div");
    div.className = "reviewItem " + (a.correct ? "correct" : "wrong");
    const h = document.createElement("div");
    h.innerHTML = `<strong>${i+1}.</strong> ${escapeHtml(a.qText).replaceAll("\n","<br>")}`;
    const p = document.createElement("div");
    if(a.correct){
      p.innerHTML = `✅ Corect`;
    } else {
      p.innerHTML = `❌ Răspunsul tău: <code>${escapeHtml(String(a.userAnswer))}</code> · Corect: <code>${escapeHtml(a.correctAnswer)}</code>`;
      if(a.explain){
        const e = document.createElement("div");
        e.style.marginTop="6px";
        e.textContent = a.explain;
        div.appendChild(e);
      }
    }
    if(a.source){
      const s = document.createElement("div");
      s.className = "src";
      s.textContent = `Sursă: ${a.source}`;
      div.appendChild(s);
    }
    div.appendChild(h);
    div.appendChild(p);
    els.reviewBox.appendChild(div);
  });
}

function escapeHtml(str){
  return str.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
}

els.startBtn.addEventListener("click", start);
els.submitBtn.addEventListener("click", submit);
els.nextBtn.addEventListener("click", next);
els.quitBtn.addEventListener("click", ()=>{ SESSION=null; els.quizPanel.hidden=true; });
els.backBtn.addEventListener("click", ()=>{ els.resultPanel.hidden=true; });
els.resetBtn.addEventListener("click", ()=>{ resetProgress(); alert("Progres resetat."); });

document.addEventListener("keydown",(e)=>{
  if(!SESSION) return;
  if(e.key==="Enter"){
    if(!els.submitBtn.disabled) submit();
    else if(!els.nextBtn.hidden) next();
  }
});

fetch("questions.json")
  .then(r=>r.json())
  .then(data=>{ ALL = data.questions || []; populateTopics(); })
  .catch(err=>{ console.error(err); alert("Nu pot încărca questions.json. Rulează prin http.server."); });
