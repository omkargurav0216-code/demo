import { useEffect, useMemo, useState } from "react";
import week1 from "./data/week1_questions.json";
import week2 from "./data/week2_questions.json";
import week3 from "./data/week3_questions.json";
import week4 from "./data/week4_questions.json";
import week5 from "./data/week5_questions.json";
import week6 from "./data/week6_questions.json";
import week7 from "./data/week7_questions.json";
import week8 from "./data/week8_questions.json";
import week9 from "./data/week9_questions.json";
import week10 from "./data/week10_questions.json";
import week11 from "./data/week11_questions.json";
import week12 from "./data/week12_questions.json";

const API_URL = "http://127.0.0.1:8000";
const STORAGE_KEY = "nptel-quiz-master-weekly-progress-v1";
const BANKS = [week1, week2, week3, week4, week5, week6, week7, week8, week9, week10, week11, week12];

function getQuestions(bank) {
  return (bank?.questions || []).filter((q) =>
    q && typeof q.id === "string" &&
    typeof q.question === "string" &&
    ["single", "multiple", "numeric"].includes(q.type) &&
    (q.type === "numeric" || (Array.isArray(q.options) && q.options.length > 0))
  );
}

function readProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && parsed.version === 1 && parsed.weeks && typeof parsed.weeks === "object"
      ? parsed.weeks : {};
  } catch {
    return {};
  }
}

function normalizeAttempt(saved, questions) {
  if (!saved || saved.version !== 1 || !Array.isArray(saved.questionIds)) return null;
  const ids = questions.map((q) => q.id);
  if (ids.length !== saved.questionIds.length || ids.some((id, i) => id !== saved.questionIds[i])) return null;

  const answers = {};
  for (const q of questions) {
    const entry = saved.answers?.[q.id];
    if (!entry || typeof entry !== "object") continue;
    const selected = Array.isArray(entry.selected)
      ? entry.selected.filter((v) => q.type === "numeric" ? false : q.options.some((o) => o.id === v))
      : [];
    const numeric = typeof entry.numeric === "string" ? entry.numeric.slice(0, 100) : "";
    answers[q.id] = {
      selected,
      numeric,
      submitted: Boolean(entry.submitted),
      isCorrect: Boolean(entry.submitted && entry.isCorrect),
    };
  }
  const currentIndex = Number.isInteger(saved.currentIndex)
    ? Math.max(0, Math.min(saved.currentIndex, Math.max(questions.length - 1, 0))) : 0;
  return { answers, currentIndex, finished: Boolean(saved.finished) };
}

function getCorrectIds(question) {
  return Array.isArray(question.correctAnswers) ? question.correctAnswers : [];
}

function isAnswerCorrect(question, answer) {
  if (question.type === "numeric") {
    const expected = Number(question.answer);
    const actual = Number(String(answer?.numeric ?? "").trim());
    return String(answer?.numeric ?? "").trim() !== "" &&
      Number.isFinite(actual) && Number.isFinite(expected) && actual === expected;
  }
  const expected = getCorrectIds(question);
  const selected = answer?.selected || [];
  return expected.length > 0 && selected.length === expected.length &&
    selected.every((id) => expected.includes(id));
}

export default function App() {
  const [mode, setMode] = useState("dashboard");
  const [activeWeek, setActiveWeek] = useState(null);
  const [weeklyAnswers, setWeeklyAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [weeklyProgress, setWeeklyProgress] = useState(() => readProgress());

  // Existing PDF quiz state and workflow retained separately.
  const [file, setFile] = useState(null);
  const [pdfQuestions, setPdfQuestions] = useState([]);
  const [pdfAnswers, setPdfAnswers] = useState({});
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [pdfStarted, setPdfStarted] = useState(false);
  const [pdfIndex, setPdfIndex] = useState(0);
  const [pdfFinished, setPdfFinished] = useState(false);

  const bankQuestions = activeWeek ? getQuestions(activeWeek) : [];
  const currentQuestion = bankQuestions[currentIndex];
  const currentAnswer = currentQuestion ? weeklyAnswers[currentQuestion.id] : null;
  const pdfQuestion = pdfQuestions[pdfIndex];
  const pdfAnswer = pdfQuestion ? pdfAnswers[pdfQuestion.id ?? pdfQuestion.questionNumber] : null;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, weeks: weeklyProgress }));
    } catch {
      // Private browsing or storage limits should not break the quiz.
    }
  }, [weeklyProgress]);

  const weeklyStats = useMemo(() => BANKS.map((bank, index) => {
    const questions = getQuestions(bank);
    const saved = weeklyProgress[String(bank.week)];
    const valid = normalizeAttempt(saved, questions);
    const answered = valid ? questions.filter((q) => valid.answers[q.id]?.submitted).length : 0;
    const score = valid ? questions.filter((q) => valid.answers[q.id]?.submitted && valid.answers[q.id]?.isCorrect).length : 0;
    return { week: bank.week, title: bank.title || `Week ${bank.week}`, count: questions.length, answered, score, started: Boolean(valid), finished: Boolean(valid?.finished) };
  }), [weeklyProgress]);

  function openWeek(bank) {
    const questions = getQuestions(bank);
    if (!questions.length) {
      setActiveWeek(bank);
      setWeeklyAnswers({});
      setCurrentIndex(0);
      setFinished(false);
      setMode("weekly");
      return;
    }
    const saved = normalizeAttempt(weeklyProgress[String(bank.week)], questions);
    setActiveWeek(bank);
    setWeeklyAnswers(saved?.answers || {});
    setCurrentIndex(saved?.currentIndex || 0);
    setFinished(Boolean(saved?.finished));
    setMode("weekly");
  }

  function saveWeekly(nextAnswers, nextIndex = currentIndex, nextFinished = finished) {
    if (!activeWeek) return;
    const questions = getQuestions(activeWeek);
    const record = {
      version: 1,
      questionIds: questions.map((q) => q.id),
      answers: nextAnswers,
      currentIndex: nextIndex,
      finished: nextFinished,
      updatedAt: new Date().toISOString(),
    };
    setWeeklyProgress((prev) => ({ ...prev, [String(activeWeek.week)]: record }));
  }

  function selectWeeklyOption(optionId) {
    if (!currentQuestion || currentAnswer?.submitted) return;
    const old = currentAnswer?.selected || [];
    const selected = currentQuestion.type === "multiple"
      ? (old.includes(optionId) ? old.filter((id) => id !== optionId) : [...old, optionId])
      : [optionId];
    const next = { ...weeklyAnswers, [currentQuestion.id]: { selected, numeric: "", submitted: false, isCorrect: false } };
    setWeeklyAnswers(next);
    saveWeekly(next);
  }

  function submitWeekly() {
    if (!currentQuestion || currentAnswer?.submitted) return;
    if (currentQuestion.type === "numeric" && !String(currentAnswer?.numeric ?? "").trim()) return;
    if (currentQuestion.type !== "numeric" && !(currentAnswer?.selected || []).length) return;
    const correct = isAnswerCorrect(currentQuestion, currentAnswer);
    const next = { ...weeklyAnswers, [currentQuestion.id]: { ...currentAnswer, submitted: true, isCorrect: correct } };
    setWeeklyAnswers(next);
    saveWeekly(next);
  }

  function updateNumeric(value) {
    if (!currentQuestion || currentAnswer?.submitted) return;
    const next = { ...weeklyAnswers, [currentQuestion.id]: { selected: [], numeric: value, submitted: false, isCorrect: false } };
    setWeeklyAnswers(next);
    saveWeekly(next);
  }

  function nextWeekly() {
    if (!activeWeek) return;
    if (currentIndex < bankQuestions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      saveWeekly(weeklyAnswers, nextIndex, false);
    } else {
      setFinished(true);
      saveWeekly(weeklyAnswers, currentIndex, true);
    }
  }

  function retryWeek() {
    const clean = {};
    setWeeklyAnswers(clean);
    setCurrentIndex(0);
    setFinished(false);
    saveWeekly(clean, 0, false);
  }

  function backDashboard() {
    setMode("dashboard");
    setActiveWeek(null);
  }

  async function handlePdfUpload(event) {
    event.preventDefault();
    if (!file) return;
    setPdfLoading(true);
    setPdfError("");
    setPdfQuestions([]);
    setPdfAnswers({});
    setPdfFinished(false);
    setPdfStarted(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_URL}/api/extract-pdf`, { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Could not process the PDF.");
      if (!result.questions?.length) throw new Error("No questions were detected. Check the OCR output.");
      setPdfQuestions(result.questions);
    } catch (err) {
      setPdfError(err.message || "Unable to connect to the backend.");
    } finally {
      setPdfLoading(false);
    }
  }

  function pdfMulti(q) {
    return /select all that apply|select all|all that apply/i.test(q?.question || "");
  }

  function selectPdfOption(label) {
    if (pdfAnswer?.submitted || !pdfQuestion) return;
    const old = pdfAnswer?.selected || [];
    const selected = pdfMulti(pdfQuestion)
      ? (old.includes(label) ? old.filter((x) => x !== label) : [...old, label])
      : [label];
    setPdfAnswers((prev) => ({ ...prev, [pdfQuestion.id ?? pdfQuestion.questionNumber]: { selected, submitted: false, isCorrect: false } }));
  }

  function submitPdf() {
    if (!pdfQuestion || !pdfAnswer?.selected?.length) return;
    const correct = pdfQuestion.correctAnswers || [];
    const isCorrect = correct.length > 0 && correct.length === pdfAnswer.selected.length && pdfAnswer.selected.every((x) => correct.includes(x));
    setPdfAnswers((prev) => ({ ...prev, [pdfQuestion.id ?? pdfQuestion.questionNumber]: { ...prev[pdfQuestion.id ?? pdfQuestion.questionNumber], submitted: true, isCorrect } }));
  }

  const pdfScore = pdfQuestions.filter((q) => pdfAnswers[q.id ?? q.questionNumber]?.isCorrect).length;
  const weeklyScore = bankQuestions.filter((q) => weeklyAnswers[q.id]?.submitted && weeklyAnswers[q.id]?.isCorrect).length;
  const progressPercent = bankQuestions.length ? ((currentIndex + 1) / bankQuestions.length) * 100 : 0;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-blue-400">Interactive learning</p>
            <h1 className="text-3xl font-bold sm:text-4xl">NPTEL Quiz Master</h1>
            <p className="mt-3 text-slate-400">Practice weekly question banks or create a quiz from a PDF.</p>
          </div>
          {mode !== "dashboard" && <button onClick={backDashboard} className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900">← Dashboard</button>}
        </header>

        {mode === "dashboard" && (
          <>
            <section className="mb-8 grid gap-4 md:grid-cols-2">
              <button onClick={() => setMode("weeklyHome")} className="rounded-2xl border border-blue-800 bg-blue-950/30 p-6 text-left transition hover:border-blue-500">
                <div className="mb-4 text-3xl">📚</div><h2 className="text-xl font-bold">Weekly Question Bank</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">Practice prepared questions from Weeks 1–12. Works locally in your browser.</p>
                <span className="mt-5 inline-block font-semibold text-blue-300">Choose a week →</span>
              </button>
              <button onClick={() => setMode("pdf")} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition hover:border-slate-600">
                <div className="mb-4 text-3xl">📄</div><h2 className="text-xl font-bold">PDF Quiz</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">Upload a PDF and use the existing FastAPI + OCR extraction workflow.</p>
                <span className="mt-5 inline-block font-semibold text-slate-200">Upload a PDF →</span>
              </button>
            </section>
            <p className="text-sm text-slate-500">Weekly question banks are loaded from static JSON files; opening a week does not call the backend.</p>
          </>
        )}

        {mode === "weeklyHome" && (
          <section>
            <div className="mb-5"><h2 className="text-2xl font-bold">Weekly Question Bank</h2><p className="mt-2 text-slate-400">Choose any week. Progress is saved in this browser.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {weeklyStats.map((stat) => (
                <button key={stat.week} onClick={() => openWeek(BANKS[stat.week - 1])} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-blue-600">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-400">Week {stat.week}</p><h3 className="mt-1 text-lg font-semibold">{stat.title}</h3></div><span className="rounded-full bg-slate-800 px-3 py-1 text-xs">{stat.count} questions</span></div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-green-500" style={{ width: `${stat.count ? stat.answered / stat.count * 100 : 0}%` }} /></div>
                  <div className="mt-3 flex justify-between text-xs text-slate-400"><span>{stat.answered}/{stat.count} answered</span><span>{stat.finished ? `Completed · ${stat.score}/${stat.count}` : stat.started ? `Score ${stat.score}` : "Not started"}</span></div>
                </button>
              ))}
            </div>
          </section>
        )}

        {mode === "weekly" && activeWeek && (
          bankQuestions.length === 0 ? <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8"><h2 className="text-xl font-bold">{activeWeek.title || `Week ${activeWeek.week}`}</h2><p className="mt-3 text-slate-400">This week has no usable questions.</p></section>
          : finished ? (
            <section className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
              <div className="text-5xl">🎉</div><h2 className="mt-4 text-3xl font-bold">Quiz completed</h2>
              <p className="mt-3 text-slate-400">{activeWeek.title || `Week ${activeWeek.week}`}</p>
              <p className="mt-8 text-sm text-slate-400">Final score</p><p className="mt-2 text-5xl font-bold text-blue-400">{weeklyScore}/{bankQuestions.length}</p>
              <p className="mt-3 text-xl font-semibold">{Math.round(weeklyScore / bankQuestions.length * 100)}%</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><button onClick={retryWeek} className="rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500">Retry Quiz</button><button onClick={backDashboard} className="rounded-xl border border-slate-700 px-6 py-3 font-semibold hover:bg-slate-800">Back to Dashboard</button></div>
            </section>
          ) : (
            <>
              <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-3 flex justify-between gap-3 text-sm"><span className="text-slate-400">{activeWeek.title || `Week ${activeWeek.week}`} · Question {currentIndex + 1} of {bankQuestions.length}</span><span className="font-semibold text-blue-400">Score: {weeklyScore}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progressPercent}%` }} /></div>
              </section>
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-8">
                <div className="mb-5 flex flex-wrap gap-2"><span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">{currentQuestion.type === "numeric" ? "Numerical answer" : currentQuestion.type === "multiple" ? "Select all that apply" : "Single choice"}</span><span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">ID: {currentQuestion.id}</span></div>
                <h2 className="mb-7 whitespace-pre-wrap text-xl font-semibold leading-8 sm:text-2xl">{currentQuestion.question}</h2>
                {currentQuestion.type === "numeric" ? (
                  <input type="number" inputMode="decimal" value={currentAnswer?.numeric || ""} disabled={currentAnswer?.submitted} onChange={(e) => updateNumeric(e.target.value)} placeholder="Enter numerical answer" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 outline-none focus:border-blue-500 disabled:opacity-60" />
                ) : (
                  <div className="space-y-3">{currentQuestion.options.map((option) => {
                    const selected = (currentAnswer?.selected || []).includes(option.id);
                    const submitted = Boolean(currentAnswer?.submitted);
                    const correct = getCorrectIds(currentQuestion).includes(option.id);
                    let cls = "border-slate-700 bg-slate-950 hover:border-blue-500";
                    if (selected && !submitted) cls = "border-blue-500 bg-blue-500/10";
                    if (submitted && correct) cls = "border-green-500 bg-green-950/40";
                    else if (submitted && selected) cls = "border-red-500 bg-red-950/40";
                    return <button key={option.id} type="button" disabled={submitted} onClick={() => selectWeeklyOption(option.id)} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition disabled:cursor-default ${cls}`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold">{option.id.toUpperCase()}</span><span className="flex-1 whitespace-pre-wrap pt-1 text-sm leading-6 sm:text-base">{option.text}</span>{submitted && correct && <span className="font-bold text-green-400">✓</span>}{submitted && selected && !correct && <span className="font-bold text-red-400">✕</span>}</button>;
                  })}</div>
                )}
                {currentAnswer?.submitted && (
                  <div className={`mt-6 rounded-xl border p-5 ${currentAnswer.isCorrect ? "border-green-700 bg-green-950/30" : "border-red-800 bg-red-950/30"}`}>
                    <h3 className={`text-lg font-bold ${currentAnswer.isCorrect ? "text-green-400" : "text-red-400"}`}>{currentAnswer.isCorrect ? "✓ Correct!" : "✕ Incorrect"}</h3>
                    <p className="mt-3 text-sm leading-6"><strong>Accepted answer: </strong>{currentQuestion.type === "numeric" ? (currentQuestion.answer ?? "Not provided") : getCorrectIds(currentQuestion).map((id) => currentQuestion.options.find((o) => o.id === id)?.id?.toUpperCase() || id).join(", ") || "Not provided"}</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{currentQuestion.explanation?.trim() || "No explanation was provided in this question-bank file."}</p>
                  </div>
                )}
                <div className="mt-7 flex flex-col justify-between gap-3 sm:flex-row"><button onClick={backDashboard} className="rounded-xl border border-slate-700 px-5 py-3 text-sm hover:bg-slate-800">Exit to Dashboard</button>{!currentAnswer?.submitted ? <button onClick={submitWeekly} disabled={currentQuestion.type === "numeric" ? !String(currentAnswer?.numeric ?? "").trim() : !(currentAnswer?.selected || []).length} className="rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">Submit Answer</button> : <button onClick={nextWeekly} className="rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500">{currentIndex === bankQuestions.length - 1 ? "View Results →" : "Next Question →"}</button>}</div>
              </section>
            </>
          )
        )}

        {mode === "pdf" && (
          <>
            {!pdfStarted && !pdfFinished && <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8"><h2 className="text-xl font-bold">PDF Quiz</h2><p className="mt-2 text-sm text-slate-400">This mode uses your existing FastAPI OCR endpoint.</p><form onSubmit={handlePdfUpload} className="mt-6 space-y-4"><input type="file" accept=".pdf,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-white" /><button disabled={!file || pdfLoading} className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold disabled:opacity-50">{pdfLoading ? "Reading your PDF..." : "Extract Questions"}</button></form>{pdfError && <p className="mt-4 rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{pdfError}</p>}{pdfQuestions.length > 0 && <div className="mt-6 rounded-xl border border-slate-700 p-5"><p className="font-semibold">{pdfQuestions.length} questions extracted</p><button onClick={() => { setPdfStarted(true); setPdfIndex(0); setPdfFinished(false); setPdfAnswers({}); }} className="mt-4 w-full rounded-xl bg-green-600 px-5 py-3 font-semibold">Start PDF Quiz →</button></div>}</section>}
            {pdfStarted && !pdfFinished && pdfQuestion && <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-8"><div className="mb-4 flex justify-between text-sm text-slate-400"><span>Question {pdfIndex + 1} of {pdfQuestions.length}</span><span>Score: {pdfScore}</span></div><h2 className="mb-6 text-xl font-semibold leading-8">{pdfQuestion.question}</h2><div className="space-y-3">{(pdfQuestion.options || []).map((option, i) => { const label = option.label || option.id || String.fromCharCode(65 + i); const selected = (pdfAnswer?.selected || []).includes(label); const correct = (pdfQuestion.correctAnswers || []).includes(label); let cls = "border-slate-700 bg-slate-950"; if (selected && !pdfAnswer?.submitted) cls = "border-blue-500 bg-blue-500/10"; if (pdfAnswer?.submitted && correct) cls = "border-green-500 bg-green-950/30"; else if (pdfAnswer?.submitted && selected) cls = "border-red-500 bg-red-950/30"; return <button key={label} disabled={pdfAnswer?.submitted} onClick={() => selectPdfOption(label)} className={`flex w-full gap-3 rounded-xl border p-4 text-left ${cls}`}><span className="font-bold">{label}</span><span>{option.text ?? option}</span></button>; })}</div>{pdfAnswer?.submitted && <div className={`mt-5 rounded-xl border p-4 ${pdfAnswer.isCorrect ? "border-green-700 bg-green-950/30" : "border-red-800 bg-red-950/30"}`}><p className="font-bold">{pdfAnswer.isCorrect ? "Correct!" : "Incorrect"}</p><p className="mt-2 text-sm">Correct answer: {(pdfQuestion.correctAnswers || []).join(", ") || "Not detected"}</p><p className="mt-2 text-sm text-slate-300">{pdfQuestion.explanation || "No explanation detected."}</p></div>}<div className="mt-6 flex justify-between gap-3"><button onClick={backDashboard} className="rounded-xl border border-slate-700 px-4 py-3">Exit</button>{!pdfAnswer?.submitted ? <button disabled={!pdfAnswer?.selected?.length} onClick={submitPdf} className="rounded-xl bg-blue-600 px-6 py-3 disabled:opacity-40">Submit Answer</button> : <button onClick={() => pdfIndex < pdfQuestions.length - 1 ? setPdfIndex((i) => i + 1) : (setPdfFinished(true), setPdfStarted(false))} className="rounded-xl bg-blue-600 px-6 py-3">{pdfIndex === pdfQuestions.length - 1 ? "View Results" : "Next Question"}</button>}</div></section>}
            {pdfFinished && <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center"><h2 className="text-3xl font-bold">PDF Quiz Completed</h2><p className="mt-5 text-5xl font-bold text-blue-400">{pdfScore}/{pdfQuestions.length}</p><p className="mt-2">{pdfQuestions.length ? Math.round(pdfScore / pdfQuestions.length * 100) : 0}%</p><button onClick={() => { setPdfFinished(false); setPdfStarted(false); setPdfQuestions([]); setPdfAnswers({}); setFile(null); }} className="mt-7 rounded-xl bg-blue-600 px-6 py-3 font-semibold">Upload Another PDF</button></section>}
          </>
        )}
      </div>
    </main>
  );
}
