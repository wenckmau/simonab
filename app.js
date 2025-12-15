let ALL=[], SESSION=null;

function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function clamp(n, lo, hi){ return Math.max(lo, Math.min(hi, n)); }

const els = {
  mode: document.getElementById("mode"),
  topic: document.getElementById("topic"),
  count: document.getElementById("count"),
  startBtn: document.getElementById("startBtn"),

  quizPanel: document.getElementById("quizPanel"),
  questionBox: document.getElementById("questionBox"),
  answersBox: document.getElementById("answersBox"),
  submitBtn: document.getElementById("submitBtn"),
  nextBtn: document.getElementById("nextBtn"),
  quitBtn: document.getElementById("quitBtn"),
  explainBox: document.getElementById("explainBox"),
  explainText: document.getElementById("explainText"),
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
  uniqueTopics(ALL).forEach(t=>{
    const opt=document.createElement("option");
    opt.value=t; opt.textContent=t;
    els.topic.appendChild(opt);
  });
}
function filtered(){
  const t=els.topic.value;
  return (t==="all") ? ALL : ALL.filter(q => (q.topic||"General")===t);
}

/**
 * IMPORTANT:
 * Selectăm întrebări fără înlocuire (fără repetări) în aceeași sesiune:
 * shuffle(set).slice(0, n)
 */
function start(){
  const mode = els.mode.value;
  const qs = filtered();
  let n = parseInt(els.count.value||"20",10);
  n = clamp(n, 1, qs.length); // dacă ceri mai mult decât există, limităm la max disponibil
  const set = shuffle(qs).slice(0, n); // <-- FĂRĂ REPETĂRI

  SESSION = { mode, set, idx:0, answers:[], locked:false };

  els.resultPanel.hidden = true;
  els.quizPanel.hidden = false;
  els.nextBtn.hidden = true;
  els.submitBtn.disabled = true;
  els.explainBox.hidden = true;
  render();
}

function render(){
  const q = SESSION.set[SESSION.idx];
  els.topicPill.textContent = q.topic || "General";
  els.progress.textContent = `Întrebarea ${SESSION.idx+1}/${SESSION.set.length}`;
  els.questionBox.textContent = q.q;

  els.answersBox.innerHTML="";
  els.explainBox.open=false;
  els.explainBox.hidden=true;
  els.nextBtn.hidden=true;
  els.submitBtn.disabled=true;
  SESSION.locked=false;

  if(q.type==="mcq"){
    q.choices.forEach((choice,i)=>{
      const label=document.createElement("label");
      label.className="choice";
      const input=document.createElement("input");
      input.type="radio"; input.name="ans"; input.value=String(i);
      input.addEventListener("change", ()=>{ els.submitBtn.disabled=false; });
      const span=document.createElement("span"); span.textContent=choice;
      label.appendChild(input); label.appendChild(span);
      els.answersBox.appendChild(label);
    });
  } else if(q.type==="tf"){
    ["Adevărat","Fals"].forEach((choice,i)=>{
      const label=document.createElement("label");
      label.className="choice";
      const input=document.createElement("input");
      input.type="radio"; input.name="ans"; input.value=String(i); // 0=true,1=false
      input.addEventListener("change", ()=>{ els.submitBtn.disabled=false; });
      const span=document.createElement("span"); span.textContent=choice;
      label.appendChild(input); label.appendChild(span);
      els.answersBox.appendChild(label);
    });
  } else if(q.type==="fill"){
    const wrap=document.createElement("div");
    wrap.className="choice";
    const input=document.createElement("input");
    input.type="text"; input.placeholder="Scrie răspunsul…"; input.style.width="100%";
    input.addEventListener("input", ()=>{ els.submitBtn.disabled = (input.value.trim().length===0); });
    wrap.appendChild(input);
    els.answersBox.appendChild(wrap);
  }
}

function getUserAnswer(q){
  if(q.type==="fill"){
    return (els.answersBox.querySelector("input[type='text']")?.value ?? "").trim();
  }
  const sel = els.answersBox.querySelector("input[name='ans']:checked");
  if(!sel) return null;
  return parseInt(sel.value,10);
}
function correctAnswerText(q){
  if(q.type==="mcq") return q.choices[q.answer];
  if(q.type==="tf") return q.answer ? "Adevărat" : "Fals";
  if(q.type==="fill") return q.answer_text;
  return "";
}
function isCorrect(q, ua){
  if(q.type==="mcq") return ua===q.answer;
  if(q.type==="tf") return (ua===0)===q.answer;
  if(q.type==="fill"){
    return (ua||"").trim().toLowerCase() === (q.answer_text||"").trim().toLowerCase();
  }
  return false;
}

function submit(){
  if(SESSION.locked) return;
  const q = SESSION.set[SESSION.idx];
  const ua = getUserAnswer(q);
  if(ua===null || ua==="") return;
  const ok = isCorrect(q, ua);

  SESSION.answers.push({
    qText:q.q, correct:ok,
    userAnswer:(q.type==="fill")?ua:String(ua),
    correctAnswer: correctAnswerText(q),
    explain:q.explain||""
  });

  if(SESSION.mode==="practice"){
    els.explainText.textContent = (ok ? "✅ Corect. " : "❌ Greșit. ") + (q.explain||"");
    els.explainBox.hidden = false;
  }

  SESSION.locked=true;
  els.submitBtn.disabled=true;
  els.nextBtn.hidden=false;
  els.nextBtn.focus();
}
function next(){
  if(SESSION.idx < SESSION.set.length-1){
    SESSION.idx += 1;
    render();
  } else showResults();
}
function showResults(){
  els.quizPanel.hidden=true;
  els.resultPanel.hidden=false;

  const total = SESSION.answers.length;
  const good = SESSION.answers.filter(a=>a.correct).length;
  els.resultText.textContent = `Ai ${good}/${total} corecte.`;

  els.reviewBox.innerHTML="";
  SESSION.answers.forEach((a,i)=>{
    const div=document.createElement("div");
    div.className = "reviewItem " + (a.correct ? "correct":"wrong");
    const q=document.createElement("div");
    q.innerHTML = `<strong>${i+1}.</strong> ${escapeHtml(a.qText).replaceAll("\n","<br>")}`;
    const p=document.createElement("div");
    if(a.correct){
      p.textContent="✅ Corect";
    }else{
      p.innerHTML = `❌ Răspunsul tău: <code>${escapeHtml(String(a.userAnswer))}</code> · Corect: <code>${escapeHtml(a.correctAnswer)}</code>`;
      if(a.explain){
        const e=document.createElement("div");
        e.style.marginTop="6px";
        e.textContent=a.explain;
        div.appendChild(e);
      }
    }
    div.appendChild(q);
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

document.addEventListener("keydown",(e)=>{
  if(!SESSION) return;
  if(e.key==="Enter"){
    if(!els.submitBtn.disabled) submit();
    else if(!els.nextBtn.hidden) next();
  }
});

fetch("questions.json")
  .then(r=>r.json())
  .then(d=>{ ALL = d.questions || []; populateTopics(); })
  .catch(err=>{ console.error(err); alert("Nu pot încărca questions.json. Rulează prin http.server."); });
