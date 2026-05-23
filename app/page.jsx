"use client";

import { useMemo, useState } from "react";
import { buildTripPlan } from "../lib/planner";
import { runTripAgent } from "../lib/tripAgent";
import { cityOptions, defaultTripInputs, preferenceOptions, transportOptions } from "../lib/tripData";

const foodOptions = ["Indian", "Mixed"];
const styleOptions = [
  ["adventure", "Adventure"],
  ["party", "Party"],
  ["relaxation", "Relaxation"],
  ["photography", "Photography"],
  ["trekking", "Trekking"]
];

const typeVisuals = {
  mountains: { emoji: "🏔️", grad: "linear-gradient(135deg, rgba(56,189,248,0.18), rgba(52,211,153,0.18))" },
  beach: { emoji: "🏖️", grad: "linear-gradient(135deg, rgba(34,211,238,0.18), rgba(251,191,36,0.18))" },
  camping: { emoji: "⛺", grad: "linear-gradient(135deg, rgba(52,211,153,0.18), rgba(16,85,60,0.18))" },
  spiritual: { emoji: "🙏", grad: "linear-gradient(135deg, rgba(167,139,250,0.18), rgba(245,166,35,0.18))" },
  peaceful: { emoji: "🌿", grad: "linear-gradient(135deg, rgba(52,211,153,0.12), rgba(20,184,166,0.12))" },
  forest: { emoji: "🌲", grad: "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(6,78,59,0.18))" },
  hidden: { emoji: "💎", grad: "linear-gradient(135deg, rgba(52,211,153,0.15), rgba(30,41,59,0.15))" },
  party: { emoji: "🎉", grad: "linear-gradient(135deg, rgba(244,114,182,0.18), rgba(167,139,250,0.18))" },
  adventure: { emoji: "🧗", grad: "linear-gradient(135deg, rgba(251,146,60,0.18), rgba(239,68,68,0.18))" },
  family: { emoji: "👨‍👩‍👧", grad: "linear-gradient(135deg, rgba(96,165,250,0.18), rgba(167,139,250,0.18))" },
  trekking: { emoji: "🥾", grad: "linear-gradient(135deg, rgba(180,83,9,0.18), rgba(52,211,153,0.18))" }
};

function getTypeVisual(dest) {
  const tag = dest.tags[0];
  return typeVisuals[tag] || { emoji: "📍", grad: "linear-gradient(135deg, rgba(100,116,139,0.15), rgba(71,85,105,0.15))" };
}

export default function Home() {
  const [inputs, setInputs] = useState(defaultTripInputs);
  const [showDrawer, setShowDrawer] = useState(false);
  const plan = useMemo(() => runTripAgent(buildTripPlan(inputs)), [inputs]);
  const [selectedId, setSelectedId] = useState(plan.bestDestination.id);
  const selected = plan.destinations.find((d) => d.id === selectedId) ?? plan.bestDestination;
  const agent = plan.agent;

  function updateInput(key, value) {
    setInputs((c) => ({ ...c, [key]: value }));
  }
  function updateStyle(key) {
    setInputs((c) => ({ ...c, groupStyle: { ...c.groupStyle, [key]: !c.groupStyle[key] } }));
  }

  const inputsPanel = (
    <div className="space-y-5">
      <ControlGroup label="Starting City">
        <SelectControl options={cityOptions} value={inputs.startCity} onChange={(v) => updateInput("startCity", v)} />
      </ControlGroup>
      <ControlGroup label={`Budget: ₹${inputs.budget.toLocaleString("en-IN")}/person`}>
        <input type="range" min="3000" max="9000" step="250" value={inputs.budget} onChange={(e) => updateInput("budget", Number(e.target.value))} />
        <div className="flex justify-between text-xs font-semibold text-white/30 mt-1"><span>₹3k</span><span>₹9k</span></div>
      </ControlGroup>
      <ControlGroup label="Group Size">
        <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
          <button className="control-button" onClick={() => updateInput("groupSize", Math.max(1, inputs.groupSize - 1))}>−</button>
          <div className="rounded-xl border border-white/8 bg-white/4 py-3 text-center text-xl font-black">{inputs.groupSize}</div>
          <button className="control-button" onClick={() => updateInput("groupSize", Math.min(15, inputs.groupSize + 1))}>+</button>
        </div>
      </ControlGroup>
      <ControlGroup label="Preference">
        <Segmented options={preferenceOptions} value={inputs.preference} onChange={(v) => updateInput("preference", v)} />
      </ControlGroup>
      <ControlGroup label="Transport">
        <Segmented options={transportOptions} value={inputs.transport} onChange={(v) => updateInput("transport", v)} />
      </ControlGroup>
      <ControlGroup label="Food">
        <Segmented options={foodOptions} value={inputs.food} onChange={(v) => updateInput("food", v)} />
      </ControlGroup>
      <ControlGroup label="Group Compatibility">
        <div className="grid grid-cols-2 gap-2">
          {styleOptions.map(([key, label]) => (
            <label key={key} className={`toggle ${inputs.groupStyle[key] ? "toggle-active" : ""}`}>
              <input type="checkbox" checked={inputs.groupStyle[key]} onChange={() => updateStyle(key)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </ControlGroup>
    </div>
  );

  return (
    <main className="min-h-screen bg-base-900 text-white">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="hero-gradient absolute inset-0" />
        <div className="hero-grid absolute inset-0" />
        <div className="hero-glow" />
        <div className="hero-glow-2" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="animate-fade-in">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">AI Weekend Travel Agent</p>
              <h1 className="mt-2 text-5xl font-black tracking-tight sm:text-6xl">
                S<span className="text-accent">A</span>N
              </h1>
              <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-white/40">
                Weekend plans for working professionals, friend groups, bikers, families, and travelers across India.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 animate-slide-up">
              <Metric label="Budget" value={`₹${inputs.budget.toLocaleString("en-IN")}`} />
              <Metric label="Start" value={inputs.startCity} />
              <Metric label="Office Out" value={inputs.officeEndTime} />
              <Metric label="Deadline" value={inputs.returnDeadline} />
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Toggle */}
      <button
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-accent px-5 py-3.5 text-sm font-black text-base-900 shadow-glow-lg lg:hidden transition-transform hover:scale-105 active:scale-95"
        onClick={() => setShowDrawer(true)}
      >
        ⚙ Customize
      </button>

      {/* Mobile Drawer */}
      <div className={`drawer-overlay ${showDrawer ? "drawer-overlay-open" : ""} lg:hidden`} onClick={() => setShowDrawer(false)} />
      <div className={`drawer-panel ${showDrawer ? "drawer-panel-open" : ""} lg:hidden`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black">SAN Inputs</h2>
          <button className="text-white/50 hover:text-white text-2xl leading-none" onClick={() => setShowDrawer(false)}>✕</button>
        </div>
        {inputsPanel}
      </div>

      {/* MAIN CONTENT */}
      <section className="mx-auto max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[340px_1fr] lg:px-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block h-fit glass-accent rounded-2xl p-5 sticky top-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black">SAN Inputs</h2>
            <span className="rounded-full bg-accent/10 border border-accent/20 px-3 py-1 text-xs font-bold text-accent">No login</span>
          </div>
          {inputsPanel}
        </aside>

        {/* Right Content */}
        <div className="space-y-6 mt-6 lg:mt-0">
          {/* Worth-It Pick + Budget */}
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="glass-strong rounded-2xl p-5 animate-fade-in">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-accent">Worth It Pick</p>
                  <h2 className="mt-2 text-3xl font-black">{selected.name}</h2>
                  <p className="mt-1 font-semibold text-white/50">{selected.headline}</p>
                </div>
                <ScoreRing score={selected.score} />
              </div>
              <RouteVisual destination={selected} inputs={inputs} />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Insight label="Total Cost" value={`₹${selected.budget.totalPerPerson.toLocaleString("en-IN")}`} tone={selected.budget.remainingPerPerson >= 0 ? "good" : "warn"} />
                <Insight label="Budget Fit" value={selected.budgetFit} tone={selected.budgetFit === "Over budget" ? "bad" : "good"} />
                <Insight label="Return Risk" value={selected.returnPlan.riskLevel} tone={selected.returnPlan.riskLevel === "High" ? "bad" : selected.returnPlan.riskLevel === "Medium" ? "warn" : "good"} />
                <Insight label="Compatibility" value={selected.groupCompatibility.label} tone="good" />
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <h2 className="text-lg font-bold">Budget Optimizer</h2>
              <div className="mt-4 space-y-4">
                <BudgetBar label={`Travel (${selected.budget.transportLabel})`} value={selected.budget.travelPerPerson} max={inputs.budget} />
                <BudgetBar label="Hotel or camp" value={selected.budget.hotelPerPerson} max={inputs.budget} />
                <BudgetBar label="Food" value={selected.budget.foodPerPerson} max={inputs.budget} />
                <BudgetBar label="Activities" value={selected.budget.activityPerPerson} max={inputs.budget} />
                <BudgetBar label="Emergency margin" value={selected.budget.emergencyPerPerson} max={inputs.budget} />
              </div>
              <div className="mt-5 rounded-xl bg-white/4 border border-white/6 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-white/50">Remaining buffer</span>
                  <span className={`text-2xl font-black ${selected.budget.remainingPerPerson < 0 ? "text-red-400" : "text-accent"}`}>
                    ₹{selected.budget.remainingPerPerson.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* SAN Agent Briefing */}
          <section className="glass rounded-2xl p-5 border-amber-500/10 animate-slide-up">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-amber-400">SAN Agent</p>
                <h2 className="mt-2 text-2xl font-black">Decision Briefing</h2>
                <p className="mt-2 max-w-4xl text-sm font-medium leading-relaxed text-white/45">{agent.objective}</p>
              </div>
              <div className="agent-confidence">
                <span>Confidence</span>
                <strong>{agent.confidence}%</strong>
              </div>
            </div>
            <div className="mt-5 border-y border-white/6 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-white/30">Recommendation</p>
              <p className="mt-2 text-xl font-black">{agent.recommendedDestination}</p>
              <p className="mt-2 max-w-5xl text-sm font-medium leading-relaxed text-white/50">{agent.decisionMemo}</p>
            </div>
            <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white/35">Agent Actions</h3>
                <div className="mt-3 divide-y divide-white/5">
                  {agent.actions.map((a) => <AgentAction key={a.title} action={a} />)}
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white/35">Tool Trace</h3>
                  <div className="mt-3 divide-y divide-white/5">
                    {agent.toolTrace.map((s) => <AgentTrace key={s.tool} step={s} />)}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white/35">Before Booking</h3>
                  <div className="mt-3 space-y-2">
                    {agent.handoffQuestions.map((q) => <p key={q} className="agent-question">{q}</p>)}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Destination Ranking */}
          <section className="glass-strong rounded-2xl p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">AI Destination Ranking</h2>
                <p className="text-sm font-medium text-white/40">{plan.summary.underBudgetCount} under budget, {plan.summary.officeSafeCount} office-safe near {plan.summary.city}</p>
              </div>
              <p className="max-w-xl text-sm font-semibold text-accent/80">{plan.summary.topAdvice}</p>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {plan.destinations.map((dest) => {
                const vis = getTypeVisual(dest);
                return (
                  <button
                    key={dest.id}
                    className={`destination-card text-left ${selected.id === dest.id ? "destination-card-active" : ""}`}
                    onClick={() => setSelectedId(dest.id)}
                  >
                    <div className="absolute top-0 left-0 right-0 h-16 rounded-t-2xl opacity-60" style={{ background: vis.grad }} />
                    <div className="relative">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-xl">{vis.emoji}</span>
                          <p className="mt-1 text-base font-black">{dest.name}</p>
                          <p className="mt-1 text-sm font-medium text-white/40">{dest.headline}</p>
                        </div>
                        <span className="mini-score">{dest.score}</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-white/50">
                        <span>₹{dest.budget.totalPerPerson.toLocaleString("en-IN")}</span>
                        <span>{dest.distanceKm} km</span>
                        <span>Crowd {dest.crowd}/10</span>
                        <span>{dest.travelFatigue}</span>
                      </div>
                      <div className={`mt-3 rounded-lg px-3 py-2 text-xs font-black ${riskClass(dest.returnPlan.riskLevel)}`}>
                        {dest.travelRisk}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Itinerary + Weather/Stays */}
          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="glass-strong rounded-2xl p-5">
              <h2 className="text-lg font-bold">Auto Itinerary</h2>
              <div className="mt-5 space-y-3">
                {selected.itinerary.map((item) => (
                  <div key={`${item.time}-${item.title}`} className="itinerary-item">
                    <div className="itinerary-time">{item.time}</div>
                    <div>
                      <p className="font-black">{item.title}</p>
                      <p className="mt-1 text-sm font-medium text-white/45">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="glass rounded-2xl p-5">
                <h2 className="text-lg font-bold">Weather, Road & Return</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Signal label="Weather" value={selected.weather} detail={selected.weatherNote} />
                  <Signal label="Road" value={selected.road} detail={selected.roadNote} />
                  <Signal label="Buffer" valueText={`${selected.returnPlan.mondayBufferHours}hr`} detail={`Leave ${selected.returnPlan.sundayDeparture}; arrive ${selected.returnPlan.expectedArrival}.`} />
                </div>
              </div>
              <div className="glass rounded-2xl p-5">
                <h2 className="text-lg font-bold">Stays & Connector Slots</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {selected.stays.map((stay) => (
                    <div key={stay} className="rounded-xl border border-white/6 bg-white/3 p-3">
                      <p className="text-sm font-black">{stay}</p>
                      <p className="mt-2 text-xs font-medium text-white/35">Booking.com, Airbnb, Goibibo connector slot</p>
                    </div>
                  ))}
                </div>
                <a className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent/15 border border-accent/25 px-5 py-3 text-sm font-black text-accent hover:bg-accent/25 transition-colors" href={selected.mapUrl} target="_blank" rel="noreferrer">
                  Open Route Map →
                </a>
              </div>
            </div>
          </section>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center">
        <p className="text-xs font-semibold text-white/25">SAN — AI Weekend Travel Agent for India</p>
      </footer>
    </main>
  );
}

/* ── Components ── */

function Metric({ label, value }) {
  return (
    <div className="glass rounded-xl px-3.5 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</p>
      <p className="mt-1 font-black text-sm">{value}</p>
    </div>
  );
}

function ControlGroup({ label, children }) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-white/60">{label}</p>
      {children}
    </div>
  );
}

function SelectControl({ options, value, onChange }) {
  return (
    <select className="select-control" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => {
        const v = Array.isArray(o) ? o[0] : o;
        const l = Array.isArray(o) ? o[1] : o;
        return (
          <button key={v} className={`segmented-button ${value === v ? "segmented-button-active" : ""}`} onClick={() => onChange(v)}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

function ScoreRing({ score, size = 80 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? "#00d4aa" : score >= 55 ? "#f59e0b" : "#f87171";
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease-out" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-black">{score}</span>
      </div>
    </div>
  );
}

function RouteVisual({ destination, inputs }) {
  return (
    <div className="route-visual mt-5">
      <div className="route-skyline" />
      <div className="route-line">
        <span className="route-dot route-dot-start" />
        <span className="route-dot route-dot-end" />
      </div>
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex justify-between gap-3 text-sm font-black">
          <span>{inputs.startCity}</span>
          <span>{destination.name}</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="route-pill">{destination.distanceKm * 2} km round trip</div>
          <div className="route-pill">{destination.driveHours} hr one-way</div>
          <div className="route-pill">Return {destination.returnPlan.riskLevel}</div>
        </div>
      </div>
    </div>
  );
}

function Insight({ label, value, tone }) {
  return (
    <div className={`rounded-xl border p-3 ${toneClass(tone)}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function BudgetBar({ label, value, max }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-semibold text-white/45">{label}</span>
        <span className="font-bold">₹{Number(value).toLocaleString("en-IN")}</span>
      </div>
      <div className="budget-bar-track">
        <div className="budget-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AgentAction({ action }) {
  return (
    <div className="agent-row">
      <span className={`agent-state ${action.state === "watch" ? "agent-state-watch" : ""}`}>{action.state}</span>
      <div>
        <p className="font-black">{action.title}</p>
        <p className="mt-1 text-sm font-medium leading-relaxed text-white/45">{action.detail}</p>
      </div>
    </div>
  );
}

function AgentTrace({ step }) {
  return (
    <div className="py-3">
      <p className="text-xs font-black uppercase tracking-wider text-amber-400">{step.tool.replaceAll("_", " ")}</p>
      <p className="mt-1 text-sm font-medium leading-relaxed text-white/45">{step.result}</p>
    </div>
  );
}

function Signal({ label, value, valueText, detail }) {
  const displayVal = valueText || `${value}/100`;
  const numVal = value ?? 0;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (numVal / 100) * circ;
  const color = numVal >= 80 ? "#00d4aa" : numVal >= 60 ? "#f59e0b" : "#f87171";
  return (
    <div className="rounded-xl border border-white/6 bg-white/3 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">{label}</p>
      {value != null && (
        <div className="flex justify-center my-2">
          <div className="relative" style={{ width: 64, height: 64 }}>
            <svg width={64} height={64} className="-rotate-90">
              <circle cx={32} cy={32} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
              <circle cx={32} cy={32} r={r} fill="none" stroke={color} strokeWidth="3"
                strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s ease-out" }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-black">{numVal}</span>
            </div>
          </div>
        </div>
      )}
      {valueText && !value && <p className="mt-2 text-xl font-black text-center">{valueText}</p>}
      <p className="mt-2 text-xs font-medium text-white/40 leading-relaxed">{detail}</p>
    </div>
  );
}

function toneClass(tone) {
  if (tone === "bad") return "border-red-500/25 bg-red-500/8 text-red-300";
  if (tone === "warn") return "border-amber-500/25 bg-amber-500/8 text-amber-300";
  return "border-accent/25 bg-accent/8 text-accent-light";
}

function riskClass(risk) {
  if (risk === "High") return "bg-red-500/10 text-red-400 border border-red-500/20";
  if (risk === "Medium") return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
  return "bg-accent/10 text-accent border border-accent/20";
}
