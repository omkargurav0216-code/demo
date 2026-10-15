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

const STORAGE_KEY = "nptel-quiz-master-weekly-progress-v1";
const BANKS = [
  week1,
  week2,
  week3,
  week4,
  week5,
  week6,
  week7,
  week8,
  week9,
  week10,
  week11,
  week12,
];

function getQuestions(bank) {
  return (bank?.questions || []).filter(
    (q) =>
      q &&
      typeof q.id === "string" &&
      typeof q.question === "string" &&
      ["single", "multiple", "numeric"].includes(q.type) &&
      (q.type === "numeric" ||
        (Array.isArray(q.options) && q.options.length > 0)),
  );
}

function readProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed &&
      parsed.version === 1 &&
      parsed.weeks &&
      typeof parsed.weeks === "object"
      ? parsed.weeks
      : {};
  } catch {
    return {};
  }
}

function normalizeAttempt(saved, questions) {
  if (!saved || saved.version !== 1 || !Array.isArray(saved.questionIds))
    return null;
  const ids = questions.map((q) => q.id);
  if (
    ids.length !== saved.questionIds.length ||
    ids.some((id, i) => id !== saved.questionIds[i])
  )
    return null;

  const answers = {};
  for (const q of questions) {
    const entry = saved.answers?.[q.id];
    if (!entry || typeof entry !== "object") continue;
    const selected = Array.isArray(entry.selected)
      ? entry.selected.filter((v) =>
          q.type === "numeric" ? false : q.options.some((o) => o.id === v),
        )
      : [];
    const numeric =
      typeof entry.numeric === "string" ? entry.numeric.slice(0, 100) : "";
    answers[q.id] = {
      selected,
      numeric,
      submitted: Boolean(entry.submitted),
      isCorrect: Boolean(entry.submitted && entry.isCorrect),
    };
  }
  const currentIndex = Number.isInteger(saved.currentIndex)
    ? Math.max(
        0,
        Math.min(saved.currentIndex, Math.max(questions.length - 1, 0)),
      )
    : 0;
  return { answers, currentIndex, finished: Boolean(saved.finished) };
}

function getCorrectIds(question) {
  return Array.isArray(question.correctAnswers) ? question.correctAnswers : [];
}

function isAnswerCorrect(question, answer) {
  if (question.type === "numeric") {
    const expected = Number(question.answer);
    const actual = Number(String(answer?.numeric ?? "").trim());
    return (
      String(answer?.numeric ?? "").trim() !== "" &&
      Number.isFinite(actual) &&
      Number.isFinite(expected) &&
      actual === expected
    );
  }
  const expected = getCorrectIds(question);
  const selected = answer?.selected || [];
  return (
    expected.length > 0 &&
    selected.length === expected.length &&
    selected.every((id) => expected.includes(id))
  );
}

export default function App() {
  const [mode, setMode] = useState("dashboard");
  const [activeWeek, setActiveWeek] = useState(null);
  const [weeklyAnswers, setWeeklyAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [weeklyProgress, setWeeklyProgress] = useState(() => readProgress());

  const bankQuestions = activeWeek ? getQuestions(activeWeek) : [];
  const currentQuestion = bankQuestions[currentIndex];
  const currentAnswer = currentQuestion
    ? weeklyAnswers[currentQuestion.id]
    : null;

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, weeks: weeklyProgress }),
      );
    } catch {
      // Private browsing or storage limits should not break the quiz.
    }
  }, [weeklyProgress]);

  const weeklyStats = useMemo(
    () =>
      BANKS.map((bank, index) => {
        const questions = getQuestions(bank);
        const saved = weeklyProgress[String(bank.week)];
        const valid = normalizeAttempt(saved, questions);
        const answered = valid
          ? questions.filter((q) => valid.answers[q.id]?.submitted).length
          : 0;
        const score = valid
          ? questions.filter(
              (q) =>
                valid.answers[q.id]?.submitted &&
                valid.answers[q.id]?.isCorrect,
            ).length
          : 0;
        return {
          week: bank.week,
          title: bank.title || `Week ${bank.week}`,
          count: questions.length,
          answered,
          score,
          started: Boolean(valid),
          finished: Boolean(valid?.finished),
        };
      }),
    [weeklyProgress],
  );

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
    const saved = normalizeAttempt(
      weeklyProgress[String(bank.week)],
      questions,
    );
    setActiveWeek(bank);
    setWeeklyAnswers(saved?.answers || {});
    setCurrentIndex(saved?.currentIndex || 0);
    setFinished(Boolean(saved?.finished));
    setMode("weekly");
  }

  function saveWeekly(
    nextAnswers,
    nextIndex = currentIndex,
    nextFinished = finished,
  ) {
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
    setWeeklyProgress((prev) => ({
      ...prev,
      [String(activeWeek.week)]: record,
    }));
  }

  function selectWeeklyOption(optionId) {
    if (!currentQuestion || currentAnswer?.submitted) return;
    const old = currentAnswer?.selected || [];
    const selected =
      currentQuestion.type === "multiple"
        ? old.includes(optionId)
          ? old.filter((id) => id !== optionId)
          : [...old, optionId]
        : [optionId];
    const next = {
      ...weeklyAnswers,
      [currentQuestion.id]: {
        selected,
        numeric: "",
        submitted: false,
        isCorrect: false,
      },
    };
    setWeeklyAnswers(next);
    saveWeekly(next);
  }

  function submitWeekly() {
    if (!currentQuestion || currentAnswer?.submitted) return;
    if (
      currentQuestion.type === "numeric" &&
      !String(currentAnswer?.numeric ?? "").trim()
    )
      return;
    if (
      currentQuestion.type !== "numeric" &&
      !(currentAnswer?.selected || []).length
    )
      return;
    const correct = isAnswerCorrect(currentQuestion, currentAnswer);
    const next = {
      ...weeklyAnswers,
      [currentQuestion.id]: {
        ...currentAnswer,
        submitted: true,
        isCorrect: correct,
      },
    };
    setWeeklyAnswers(next);
    saveWeekly(next);
  }

  function updateNumeric(value) {
    if (!currentQuestion || currentAnswer?.submitted) return;
    const next = {
      ...weeklyAnswers,
      [currentQuestion.id]: {
        selected: [],
        numeric: value,
        submitted: false,
        isCorrect: false,
      },
    };
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

  const weeklyScore = bankQuestions.filter(
    (q) => weeklyAnswers[q.id]?.submitted && weeklyAnswers[q.id]?.isCorrect,
  ).length;
  const progressPercent = bankQuestions.length
    ? ((currentIndex + 1) / bankQuestions.length) * 100
    : 0;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-blue-400">
              Interactive learning
            </p>
            <h1 className="text-3xl font-bold sm:text-4xl">
              NPTEL Quiz Master
            </h1>
            <p className="mt-3 text-slate-400">
              Practice prepared NPTEL questions from Weeks 1–12.
            </p>
          </div>
          {mode !== "dashboard" && (
            <button
              onClick={backDashboard}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900"
            >
              ← Dashboard
            </button>
          )}
        </header>

        {mode === "dashboard" && (
          <section className="space-y-8">
            {/* Welcome banner */}
            <div className="relative overflow-hidden rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 p-7 sm:p-10">
              <div className="relative z-10 max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-300">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  YOUR LEARNING SPACE
                </span>

                <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Learn better.
                  <br />
                  <span className="text-blue-400">Score higher.</span>
                </h2>

                <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300 sm:text-base">
                  Strengthen your NPTEL preparation with weekly practice,
                  instant feedback, and progress saved right in your browser.
                </p>

                <button
                  onClick={() => setMode("weeklyHome")}
                  className="mt-7 inline-flex items-center gap-3 rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-950/40 transition hover:-translate-y-0.5 hover:bg-blue-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300"
                >
                  Explore question banks
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 right-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl"
              />
            </div>

            {/* Overview statistics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">Question banks</p>
                  <span className="text-xl" aria-hidden="true">
                    📚
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold text-white">
                  {weeklyStats.length}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Weekly practice sets
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">Total questions</p>
                  <span className="text-xl" aria-hidden="true">
                    ✏️
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold text-white">
                  {weeklyStats.reduce((total, week) => total + week.count, 0)}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Across all available weeks
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">Completed weeks</p>
                  <span className="text-xl" aria-hidden="true">
                    🏆
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold text-white">
                  {weeklyStats.filter((week) => week.finished).length}
                  <span className="ml-1 text-base font-medium text-slate-500">
                    / {weeklyStats.length}
                  </span>
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Finish a weekly quiz to complete it
                </p>
              </div>
            </div>

            {/* Weekly bank preview */}
            <div>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
                    Keep progressing
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white">
                    Your question banks
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Continue a previous quiz or start a new week.
                  </p>
                </div>

                <button
                  onClick={() => setMode("weeklyHome")}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/10 hover:text-blue-200"
                >
                  View all weeks →
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {weeklyStats.slice(0, 3).map((stat) => {
                  const percent = stat.count
                    ? Math.round((stat.answered / stat.count) * 100)
                    : 0;

                  return (
                    <button
                      key={stat.week}
                      onClick={() => openWeek(BANKS[stat.week - 1])}
                      className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-left transition duration-200 hover:-translate-y-1 hover:border-blue-500/60 hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-blue-400">
                            Week {stat.week}
                          </p>
                          <h3 className="mt-2 text-lg font-semibold text-white">
                            {stat.title}
                          </h3>
                        </div>

                        <span className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300">
                          {stat.count} Qs
                        </span>
                      </div>

                      <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
                        <span>
                          {stat.answered} of {stat.count} answered
                        </span>
                        <span>{percent}%</span>
                      </div>

                      <div
                        className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800"
                        role="progressbar"
                        aria-label={`Week ${stat.week} progress`}
                        aria-valuenow={percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
                        <span className="text-xs text-slate-400">
                          {stat.finished
                            ? "Completed"
                            : stat.started
                              ? "In progress"
                              : "Ready to start"}
                        </span>
                        <span className="text-sm font-semibold text-blue-300 transition group-hover:translate-x-1">
                          Open →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 text-center text-xs text-slate-500">
                Your progress is stored locally in this browser.
              </p>
            </div>
          </section>
        )}

        {mode === "weeklyHome" && (
          <section>
            <div className="mb-5">
              <h2 className="text-2xl font-bold">Weekly Question Bank</h2>
              <p className="mt-2 text-slate-400">
                Choose any week. Progress is saved in this browser.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {weeklyStats.map((stat) => (
                <button
                  key={stat.week}
                  onClick={() => openWeek(BANKS[stat.week - 1])}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-blue-600"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-400">
                        Week {stat.week}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">
                        {stat.title}
                      </h3>
                    </div>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs">
                      {stat.count} questions
                    </span>
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{
                        width: `${stat.count ? (stat.answered / stat.count) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="mt-3 flex justify-between text-xs text-slate-400">
                    <span>
                      {stat.answered}/{stat.count} answered
                    </span>
                    <span>
                      {stat.finished
                        ? `Completed · ${stat.score}/${stat.count}`
                        : stat.started
                          ? `Score ${stat.score}`
                          : "Not started"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {mode === "weekly" &&
          activeWeek &&
          (bankQuestions.length === 0 ? (
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="text-xl font-bold">
                {activeWeek.title || `Week ${activeWeek.week}`}
              </h2>
              <p className="mt-3 text-slate-400">
                This week has no usable questions.
              </p>
            </section>
          ) : finished ? (
            <section className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
              <div className="text-5xl">🎉</div>
              <h2 className="mt-4 text-3xl font-bold">Quiz completed</h2>
              <p className="mt-3 text-slate-400">
                {activeWeek.title || `Week ${activeWeek.week}`}
              </p>
              <p className="mt-8 text-sm text-slate-400">Final score</p>
              <p className="mt-2 text-5xl font-bold text-blue-400">
                {weeklyScore}/{bankQuestions.length}
              </p>
              <p className="mt-3 text-xl font-semibold">
                {Math.round((weeklyScore / bankQuestions.length) * 100)}%
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  onClick={retryWeek}
                  className="rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500"
                >
                  Retry Quiz
                </button>
                <button
                  onClick={backDashboard}
                  className="rounded-xl border border-slate-700 px-6 py-3 font-semibold hover:bg-slate-800"
                >
                  Back to Dashboard
                </button>
              </div>
            </section>
          ) : (
            <>
              <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-3 flex justify-between gap-3 text-sm">
                  <span className="text-slate-400">
                    {activeWeek.title || `Week ${activeWeek.week}`} · Question{" "}
                    {currentIndex + 1} of {bankQuestions.length}
                  </span>
                  <span className="font-semibold text-blue-400">
                    Score: {weeklyScore}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </section>
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-8">
                <div className="mb-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                    {currentQuestion.type === "numeric"
                      ? "Numerical answer"
                      : currentQuestion.type === "multiple"
                        ? "Select all that apply"
                        : "Single choice"}
                  </span>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    ID: {currentQuestion.id}
                  </span>
                </div>
                <h2 className="mb-7 whitespace-pre-wrap text-xl font-semibold leading-8 sm:text-2xl">
                  {currentQuestion.question}
                </h2>
                {currentQuestion.type === "numeric" ? (
                  <input
                    type="number"
                    inputMode="decimal"
                    value={currentAnswer?.numeric || ""}
                    disabled={currentAnswer?.submitted}
                    onChange={(e) => updateNumeric(e.target.value)}
                    placeholder="Enter numerical answer"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 outline-none focus:border-blue-500 disabled:opacity-60"
                  />
                ) : (
                  <div className="space-y-3">
                    {currentQuestion.options.map((option) => {
                      const selected = (currentAnswer?.selected || []).includes(
                        option.id,
                      );
                      const submitted = Boolean(currentAnswer?.submitted);
                      const correct = getCorrectIds(currentQuestion).includes(
                        option.id,
                      );
                      let cls =
                        "border-slate-700 bg-slate-950 hover:border-blue-500";
                      if (selected && !submitted)
                        cls = "border-blue-500 bg-blue-500/10";
                      if (submitted && correct)
                        cls = "border-green-500 bg-green-950/40";
                      else if (submitted && selected)
                        cls = "border-red-500 bg-red-950/40";
                      return (
                        <button
                          key={option.id}
                          type="button"
                          disabled={submitted}
                          onClick={() => selectWeeklyOption(option.id)}
                          className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition disabled:cursor-default ${cls}`}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold">
                            {option.id.toUpperCase()}
                          </span>
                          <span className="flex-1 whitespace-pre-wrap pt-1 text-sm leading-6 sm:text-base">
                            {option.text}
                          </span>
                          {submitted && correct && (
                            <span className="font-bold text-green-400">✓</span>
                          )}
                          {submitted && selected && !correct && (
                            <span className="font-bold text-red-400">✕</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                {currentAnswer?.submitted && (
                  <div
                    className={`mt-6 rounded-xl border p-5 ${currentAnswer.isCorrect ? "border-green-700 bg-green-950/30" : "border-red-800 bg-red-950/30"}`}
                  >
                    <h3
                      className={`text-lg font-bold ${currentAnswer.isCorrect ? "text-green-400" : "text-red-400"}`}
                    >
                      {currentAnswer.isCorrect ? "✓ Correct!" : "✕ Incorrect"}
                    </h3>
                    <p className="mt-3 text-sm leading-6">
                      <strong>Accepted answer: </strong>
                      {currentQuestion.type === "numeric"
                        ? (currentQuestion.answer ?? "Not provided")
                        : getCorrectIds(currentQuestion)
                            .map(
                              (id) =>
                                currentQuestion.options
                                  .find((o) => o.id === id)
                                  ?.id?.toUpperCase() || id,
                            )
                            .join(", ") || "Not provided"}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                      {currentQuestion.explanation?.trim() ||
                        "No explanation was provided in this question-bank file."}
                    </p>
                  </div>
                )}
                <div className="mt-7 flex flex-col justify-between gap-3 sm:flex-row">
                  <button
                    onClick={backDashboard}
                    className="rounded-xl border border-slate-700 px-5 py-3 text-sm hover:bg-slate-800"
                  >
                    Exit to Dashboard
                  </button>
                  {!currentAnswer?.submitted ? (
                    <button
                      onClick={submitWeekly}
                      disabled={
                        currentQuestion.type === "numeric"
                          ? !String(currentAnswer?.numeric ?? "").trim()
                          : !(currentAnswer?.selected || []).length
                      }
                      className="rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Submit Answer
                    </button>
                  ) : (
                    <button
                      onClick={nextWeekly}
                      className="rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500"
                    >
                      {currentIndex === bankQuestions.length - 1
                        ? "View Results →"
                        : "Next Question →"}
                    </button>
                  )}
                </div>
              </section>
            </>
          ))}
      </div>
    </main>
  );
}
