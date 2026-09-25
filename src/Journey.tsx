import { useState } from "react";
import { Sparkles, Sprout, Trophy, Timer, Check, Moon } from "lucide-react";
import type { State } from "../shared/domain";
import { localDate } from "../shared/domain";
import { emptyJourney, journeyLevel, journeyXP } from "../shared/features";
import { Button, type Save } from "./components";

export function Garden({ state }: { state: State }) {
  const [message, setMessage] = useState(
    "Tap your little firefly for a gentle nudge.",
  );
  const level = journeyLevel(state),
    plant = state.journey?.plant || "fern";
  const phrases = [
    "One small thing is enough to begin.",
    "Rest is part of growing, too.",
    "Your garden grows at your pace.",
    "A deep breath. A fresh start.",
    "You don't have to finish everything today.",
  ];
  return (
    <div className={`garden-scene plant-${plant}`}>
      <div className="garden-moon" />
      <i className="garden-star star-a">✦</i>
      <i className="garden-star star-b">·</i>
      <i className="garden-star star-c">✧</i>
      <svg
        viewBox="0 0 460 230"
        role="img"
        aria-label={`Your ${plant} garden at level ${level}`}
      >
        <ellipse cx="230" cy="210" rx="140" ry="14" fill="#202f32" />
        {[0, 1, 2].slice(0, Math.min(3, level)).map((n) => (
          <g
            key={n}
            transform={`translate(${n === 0 ? 230 : n === 1 ? 120 : 340},200) scale(${n === 0 ? 1 : 0.65})`}
          >
            <path
              d="M-28 -20L-20 8Q0 18 20 8L28 -20Z"
              fill={n === 0 ? "#ae7995" : "#6e8797"}
            />
            <rect
              x="-32"
              y="-28"
              width="64"
              height="12"
              rx="5"
              fill="#d0a1ae"
            />
            <path
              d="M0 -28Q-8 -90 3 -140"
              stroke="#99c8a3"
              strokeWidth="6"
              fill="none"
            />
            {[0, 1, 2].map((i) => (
              <g key={i} transform={`translate(0,${-45 - i * 28})`}>
                <path
                  d="M0 0Q-50 -42 -45 -9Q-20 14 0 0"
                  fill={i % 2 ? "#72ad91" : "#a1d3ab"}
                />
                <path d="M0 -5Q46 -43 44 -12Q20 12 0 -5" fill="#80bca6" />
              </g>
            ))}
            {plant === "flower" && (
              <g transform="translate(3,-145)">
                {[0, 60, 120, 180, 240, 300].map((a) => (
                  <ellipse
                    key={a}
                    cx="0"
                    cy="-13"
                    rx="10"
                    ry="18"
                    transform={`rotate(${a})`}
                    fill="#eeb5c8"
                  />
                ))}
                <circle r="10" fill="#f4d896" />
              </g>
            )}
            {plant === "tree" && (
              <g fill="#98bfa3">
                <circle cy="-128" r="40" />
                <circle cx="-26" cy="-105" r="30" />
                <circle cx="28" cy="-108" r="31" />
              </g>
            )}
          </g>
        ))}
      </svg>
      <button
        className="firefly"
        aria-label="Visit your firefly companion"
        onClick={() =>
          setMessage(phrases[(phrases.indexOf(message) + 1) % phrases.length])
        }
      >
        <span />✦
      </button>
      <p className="garden-whisper" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
export function JourneyStrip({
  state,
  onOpen,
}: {
  state: State;
  onOpen: () => void;
}) {
  if (state.journey?.enabled === false) return null;
  const level = journeyLevel(state),
    xp = journeyXP(state),
    floor = (level - 1) ** 2 * 50,
    next = level ** 2 * 50;
  return (
    <button className="journey-strip" onClick={onOpen}>
      <span className="garden-badge">
        <Sprout size={22} />
      </span>
      <span>
        <strong>Your little garden · Level {level}</strong>
        <small>
          {xp} XP · {next - xp} to your next growth milestone
        </small>
      </span>
      <span className="progress">
        <span style={{ width: `${((xp - floor) / (next - floor)) * 100}%` }} />
      </span>
      <Sparkles size={17} />
    </button>
  );
}
export default function Journey({
  state,
  save,
  onFocus,
}: {
  state: State;
  save: Save;
  onFocus: () => void;
}) {
  const journey = state.journey || emptyJourney(),
    level = journeyLevel(state),
    xp = journeyXP(state);
  const today = journey.events.filter((e) => e.date === localDate());
  const badges = [
    {
      title: "First leaf",
      detail: "Complete your first task",
      earned: journey.events.some((e) => e.kind === "task"),
    },
    {
      title: "Rooted routine",
      detail: "Reach 7 daily habit targets",
      earned: journey.events.filter((e) => e.kind === "habit").length >= 7,
    },
    {
      title: "Quiet hour",
      detail: "Finish 60 minutes of focus",
      earned:
        (state.focusSessions || [])
          .filter((f) => f.status === "completed" && f.kind === "focus")
          .reduce((s, f) => s + f.minutes, 0) >= 60,
    },
    { title: "Growing together", detail: "Reach level 3", earned: level >= 3 },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SMALL EFFORTS, SOMETHING TO KEEP</div>
          <h1>Your cozy garden</h1>
          <p>A place to notice progress. No missed-day penalties, no rush.</p>
        </div>
        <span className="pill">
          <Sprout size={16} />
          Level {level} · {xp} XP
        </span>
      </div>
      <div className="garden-layout">
        <section className="panel garden-panel">
          {journey.enabled ? (
            <Garden state={state} />
          ) : (
            <div className="garden-paused">
              <Moon size={38} />
              <h2>A quieter workspace</h2>
              <p>Garden rewards are off. Your existing progress is safe.</p>
            </div>
          )}
          <div className="garden-controls">
            <label className="check-label">
              <input
                type="checkbox"
                checked={journey.enabled}
                onChange={(e) =>
                  void save((s) => ({
                    ...s,
                    journey: {
                      ...(s.journey || emptyJourney()),
                      enabled: e.target.checked,
                    },
                  }))
                }
              />
              Garden and rewards
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={journey.celebrations}
                onChange={(e) =>
                  void save((s) => ({
                    ...s,
                    journey: {
                      ...(s.journey || emptyJourney()),
                      celebrations: e.target.checked,
                    },
                  }))
                }
              />
              Gentle celebrations
            </label>
          </div>
          <div className="plant-picker" aria-label="Choose your plant">
            {(["fern", "flower", "tree"] as const).map((p, i) => (
              <Button
                key={p}
                disabled={!journey.enabled || level < i + 1}
                kind={journey.plant === p ? "primary" : "default"}
                onClick={() =>
                  void save((s) => ({
                    ...s,
                    journey: { ...(s.journey || emptyJourney()), plant: p },
                  }))
                }
              >
                {p === "fern"
                  ? "Fern"
                  : p === "flower"
                    ? "Flower"
                    : "Little tree"}
                {level < i + 1 ? ` · Level ${i + 1}` : ""}
              </Button>
            ))}
          </div>
        </section>
        <section className="panel quest-panel">
          <div className="section-heading">
            <h2>Three gentle quests</h2>
            <Sparkles size={18} />
          </div>
          <p className="help">
            Suggestions for today. Do any, all, or take a rest.
          </p>
          {[
            {
              kind: "task",
              title: "Clear one small task",
              reward: "10 XP per completed task",
            },
            {
              kind: "habit",
              title: "Care for a daily habit",
              reward: "15 XP per daily target",
            },
            {
              kind: "focus",
              title: "Make a little focus time",
              reward: "1 XP per minute · up to 60 per session",
            },
          ].map((q) => (
            <div className="quest-row" key={q.kind}>
              <span
                className={`quest-check ${today.some((e) => e.kind === q.kind) ? "done" : ""}`}
              >
                {today.some((e) => e.kind === q.kind) ? (
                  <Check size={16} />
                ) : (
                  <Sprout size={16} />
                )}
              </span>
              <div>
                <strong>{q.title}</strong>
                <small>{q.reward}</small>
              </div>
            </div>
          ))}
          <Button kind="primary" onClick={onFocus}>
            <Timer size={16} />
            Start a focus session
          </Button>
          <p className="help">
            Rewards are earned once. Reopening tasks or resetting check-ins
            won’t earn extra XP. Earlier records aren’t backfilled.
          </p>
        </section>
      </div>
      <section className="panel">
        <div className="section-heading">
          <h2>A shelf of small wins</h2>
          <Trophy size={18} />
        </div>
        <div className="badge-grid">
          {badges.map((b) => (
            <div
              className={`achievement ${b.earned ? "earned" : ""}`}
              key={b.title}
            >
              <Trophy size={25} />
              <strong>{b.title}</strong>
              <small>{b.detail}</small>
              <span>{b.earned ? "Earned" : "Still growing"}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
