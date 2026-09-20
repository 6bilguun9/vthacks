"use client";

import Image from "next/image";
import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import {
  ArrowDown, ArrowLeft, ArrowRight, AudioLines, BookOpen, Check, ChevronLeft,
  ChevronRight, CircleDollarSign, Eye, EyeOff, FileText, Globe2, Layers,
  Maximize2, MessageCircle, Pause, Play, RotateCcw, ShieldCheck, Sparkles,
  Utensils, Wallet, X,
} from "lucide-react";
import { demoData, demoSummary, demoChatExamples, formatMoney } from "../dashboard/demo-data";
import { sampleDiningPlan } from "../dining/sample";
import { presentationScenes, sourceLinks, totalPresentationSeconds, type PresentationSceneId } from "./presentation-content";
import { initialPlayback, playbackReducer, formatPresentationTime } from "./playback";
import "./presentation.css";

function subscribeMotion(listener: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
function readMotionPreference() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
function serverMotionPreference() { return false; }

function FinBot({ className = "" }: { className?: string }) {
  return <span className={`pc-bot ${className}`}><Image src="/finbot/team-logo.png" alt="FinBot, our hand-drawn orange robot" width={445} height={473} /></span>;
}

function Sample({ children = "Sample data" }: { children?: React.ReactNode }) {
  return <span className="pc-sample"><span aria-hidden="true" />{children}</span>;
}

function ProductImage({ name, alt, className = "" }: { name: string; alt: string; className?: string }) {
  return <div className={`pc-product ${className}`}>
    <div className="pc-window" aria-hidden="true"><i /><i /><i /><span>hokieWallet / {name === "overview" ? "overview" : name}</span></div>
    <Image src={`/presentation/${name}.png`} alt={alt} width={1280} height={720} priority={name === "overview"} />
  </div>;
}

function Intro() {
  return <div className="pc-intro pc-enter">
    <div className="pc-intro-copy">
      <p className="pc-kicker">For the days between dining halls & deadlines</p>
      <h1>Make your<br />dining money<br /><em>last.</em></h1>
      <p className="pc-lede">A student money guide.<br />Built by Hokies, for Hokies.</p>
      <div className="pc-team"><span>sudoWin</span><p>Carlos · Neha · Grant · Bilguun</p></div>
    </div>
    <div className="pc-intro-art">
      <div className="pc-photo"><Image src="/campus/origami.png" alt="Origami dining at Virginia Tech" fill sizes="(max-width: 700px) 90vw, 45vw" priority /><span>A familiar place. A better plan.</span></div>
      <div className="pc-balance-note pc-rise"><Wallet size={24} /><span>Campus funds</span><strong>{formatMoney(demoData.walletBalanceCents)}</strong><Sample /></div>
      <FinBot className="pc-intro-bot" />
      <span className="pc-handwritten">Meet your money’s<br />new study buddy.</span>
    </div>
  </div>;
}

function Problem() {
  return <div className="pc-problem pc-enter">
    <div className="pc-problem-copy"><p className="pc-kicker">The gap between a balance and a decision</p><h1>“Will my dining<br />money last?”</h1><p className="pc-lede">Knowing what is left is a start.<br />Knowing what to do next is the goal.</p></div>
    <div className="pc-receipt-scene">
      <div className="pc-receipt"><span className="pc-kicker">Your campus balance</span><strong>{formatMoney(demoData.walletBalanceCents)}</strong><div className="pc-receipt-rule" /><span>Recent activity</span>{demoData.recentTransactions.slice(0, 2).map(t => <p key={t.id}><span>{t.name}</span><span>{formatMoney(t.amountCents)}</span></p>)}<small>Historical preview · Separate example transactions</small><Sample /></div>
      <div className="pc-question-note"><Utensils /><p>Which meals should I<br />use my plan for?</p><ArrowDown aria-hidden="true" /></div>
      <div className="pc-question-note pc-question-second"><CircleDollarSign /><p>What about my<br />other expenses?</p></div>
    </div>
    <p className="pc-footnote">VT already provides balances, transaction history, and financial wellness resources. We bring the next decision into focus.</p>
  </div>;
}

const overviewDetails = [
  { title: "The whole picture", value: "Three views. One starting point.", text: "Bank cash, campus funds, and monthly spending — together, with clear boundaries." },
  { title: "Campus funds", value: formatMoney(demoData.walletBalanceCents), text: "Restricted campus funds stay separate from the cash in your bank account." },
  { title: "Savings", value: `${formatMoney(demoData.savingsGoal.savedCents, 0)} toward ${formatMoney(demoData.savingsGoal.targetCents, 0)}`, text: "Money assigned to a goal is already included in bank cash. It is never counted twice." },
] as const;

function Overview({ seconds }: { seconds: number }) {
  const [selected, setFocus] = useState<number | null>(null);
  const focus = selected ?? Math.min(2, Math.floor(seconds / 8));
  const detail = overviewDetails[focus] ?? overviewDetails[0];
  return <div className="pc-overview pc-enter">
    <div className="pc-heading-row"><div><p className="pc-kicker">Overview · Activity · Savings</p><h1>See your money<br /><em>in context.</em></h1></div><Sample /></div>
    <div className="pc-overview-grid">
      <div className="pc-product-crop" data-focus={focus}><ProductImage name="overview" alt="Actual Hokie Wallet dashboard, showing bank cash of $1,250.42, restricted campus funds of $347.80, and spending of $289.34." /></div>
      <div className="pc-overview-details"><div className="pc-focus-tabs" aria-label="Dashboard detail">{overviewDetails.map((detail, i) => <button key={detail.title} aria-pressed={focus === i} onClick={() => setFocus(i)}><span>0{i + 1}</span>{detail.title}</button>)}</div><div className="pc-detail-copy" aria-live="polite" aria-atomic="true"><strong>{detail.value}</strong><p>{detail.text}</p></div><a className="pc-text-link" href="/" target="_blank" rel="noreferrer">Explore the actual dashboard <ArrowRight size={16} /></a></div>
    </div>
  </div>;
}

function Chat({ seconds }: { seconds: number }) {
  const [selected, setReply] = useState<boolean | null>(null);
  const reply = selected ?? seconds >= 8;
  return <div className="pc-chat-scene pc-enter">
    <div className="pc-chat-copy"><p className="pc-kicker">Ask FinBot</p><h1>A place to ask.<br /><em>A place to return.</em></h1><p className="pc-lede">Your questions, with context.<br />Your conversations, kept together.</p><div className="pc-chat-features"><span><MessageCircle />Saved conversations</span><span><FileText />Room to explain</span></div><FinBot /></div>
    <div className="pc-chat-demo"><div className="pc-chat-top"><span><Sparkles size={19} /> FinBot</span><Sample>Scripted example</Sample></div><div className="pc-chat-body" aria-live="polite" aria-atomic="false"><div className="pc-chat-user">{demoChatExamples[2].question}</div>{reply ? <div className="pc-chat-reply pc-rise"><span className="pc-avatar"><Sparkles size={18} /></span><p>{demoChatExamples[2].answer}</p></div> : <div className="pc-chat-placeholder"><MessageCircle size={34} /><p>A simpler starting point<br />for a complicated question.</p></div>}</div><button className="pc-action pc-chat-action" onClick={() => setReply(!reply)}>{reply ? "Replay the question" : "Show FinBot’s example reply"}{reply ? <RotateCcw size={17} /> : <ArrowRight size={17} />}</button><a className="pc-chat-footer" href="/#finbot" target="_blank" rel="noreferrer">Open the full chat experience <ArrowRight size={15} /></a></div>
  </div>;
}

function Accessibility() {
  const [size, setSize] = useState(100);
  const [palette, setPalette] = useState("plum");
  const [reading, setReading] = useState(false);
  const [speechStatus, setSpeechStatus] = useState("");
  useEffect(() => () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);
  const read = () => {
    if (!("speechSynthesis" in window)) { setSpeechStatus("Read aloud is unavailable in this browser."); return; }
    if (reading) { window.speechSynthesis.cancel(); setReading(false); return; }
    const utterance = new SpeechSynthesisUtterance(`Sample savings goal. Emergency fund. ${formatMoney(demoData.savingsGoal.savedCents)} of ${formatMoney(demoData.savingsGoal.targetCents)}. Savings are already included in bank cash.`);
    utterance.onend = () => setReading(false);
    utterance.onerror = () => { setReading(false); setSpeechStatus("Audio stopped or unavailable. The same information is visible on screen."); };
    window.speechSynthesis.speak(utterance); setReading(true); setSpeechStatus("");
  };
  return <div className="pc-access-scene pc-enter"><div className="pc-heading-row"><div><p className="pc-kicker">Comfort is part of the experience</p><h1>Your wallet.<br /><em>Your way to use it.</em></h1></div><p className="pc-side-note">Try these controls.<br />See the difference.</p></div>
    <div className="pc-access-grid"><div className="pc-access-controls"><label htmlFor="pc-type-size"><span>Text size</span><strong>{size}%</strong></label><input id="pc-type-size" type="range" min="100" max="140" step="5" value={size} onChange={e => setSize(Number(e.target.value))} /><div className="pc-range-labels"><span>Standard</span><span>Larger</span></div><fieldset><legend>Palette</legend><div className="pc-palettes">{[{ id: "plum", label: "Plum and orange" }, { id: "ocean", label: "Ocean blue and gold" }, { id: "forest", label: "Forest green and violet" }].map(p => <button key={p.id} className={`pc-palette pc-palette-${p.id}`} aria-label={p.label} aria-pressed={palette === p.id} onClick={() => setPalette(p.id)}><i /><i />{palette === p.id && <Check size={16} />}</button>)}</div></fieldset><button className="pc-audio" onClick={read}><AudioLines />{reading ? "Stop reading" : "Listen to this example"}</button><p className="pc-speech-status" role="status">{speechStatus}</p><p className="pc-control-caption">Interactive presentation example.<br />Your app preferences stay as they are.</p></div>
      <div className="pc-access-example" data-palette={palette} style={{ "--example-scale": size / 100 } as CSSProperties}><Sample /><span className="pc-access-icon"><Wallet size={28} /></span><p>Emergency fund</p><strong>{formatMoney(demoData.savingsGoal.savedCents, 0)}<small> / {formatMoney(demoData.savingsGoal.targetCents, 0)}</small></strong><div className="pc-goal-track" role="img" aria-label="70 percent of savings target allocated"><span style={{ width: `${demoSummary.savingsPercent}%` }} /></div><p className="pc-goal-context">Savings are already included<br />in bank cash.</p></div>
      <div className="pc-access-other"><Globe2 size={32} /><strong>10 language choices.</strong><p>Core interface labels.<br />The same tools in dining.</p><span>Text · Color · Motion · Audio</span></div>
    </div></div>;
}

function Dining({ seconds }: { seconds: number }) {
  const [selected, setShowWeek] = useState<boolean | null>(null);
  const showWeek = selected ?? seconds >= 12;
  return <div className="pc-dining-scene pc-enter"><div className="pc-heading-row"><div><p className="pc-kicker">Dining planner</p><h1>From a balance<br /><em>to a week of meals.</em></h1></div><button className="pc-action" onClick={() => setShowWeek(!showWeek)}>{showWeek ? "Back to the inputs" : "Reveal the sample week"}{showWeek ? <ArrowLeft size={17} /> : <ArrowRight size={17} />}</button></div><div className="pc-dining-content" key={String(showWeek)}>{!showWeek ? <div className="pc-dining-inputs"><ProductImage name="dining" alt="The dining planner form asks for plan type, campus balances, weeks left, and dietary preferences." /><div className="pc-dining-recipe"><span className="pc-kicker">A separate dining example</span><strong>One week.<br />Your existing benefits.</strong><dl><div><dt>Meal plan</dt><dd>Unlimited</dd></div><div><dt>Dining dollars</dt><dd>$225</dd></div><div><dt>Weeks left</dt><dd>15</dd></div><div><dt>Preference</dt><dd>Vegetarian</dd></div></dl><Sample>Synthetic profile</Sample></div></div> : <div className="pc-meal-week"><div className="pc-week-summary"><Utensils size={24} /><p>Use included swipes.<br /><strong>Keep dining dollars for flexibility.</strong></p><Sample>Illustrative week</Sample></div><div className="pc-meal-days">{sampleDiningPlan.days.slice(0, 5).map(day => <div className="pc-meal-day" key={day.day}><h2>{day.day.slice(0, 3)}</h2>{day.meals.map(meal => <div className="pc-meal" key={meal.label} data-exchange={meal.payment === "meal_exchange"}><span>{meal.label}</span><strong>{meal.venue}</strong><small>{meal.payment === "meal_exchange" ? "Meal exchange" : "Included swipe"}</small></div>)}</div>)}</div><p className="pc-footnote">Five-day preview of the seven-day sample. Estimated prices; current menus, hours, and eligibility must be checked.</p></div>}</div></div>;
}

function Backend() {
  return <div className="pc-backend-scene pc-enter"><div className="pc-heading-row"><div><p className="pc-kicker">How the backend connects</p><h1>The plan<br /><em>behind the screen.</em></h1></div><span className="pc-implementation">Backend workflows implemented<br /><b>Frontend connection in progress</b></span></div><div className="pc-backend-flow"><div className="pc-input-stack"><div><CircleDollarSign /><span>Nessie sandbox<small>Banking context</small></span></div><div><Utensils /><span>Student input<small>Restricted campus balances</small></span></div><div><Layers /><span>Supabase<small>Saved guest state & plans</small></span></div></div><span className="pc-flow-arrow"><ArrowRight /></span><div className="pc-api"><span className="pc-api-icon"><ShieldCheck size={34} /></span><p>Hokie Wallet API</p><strong>Validate.<br />Calculate.<br />Explain.</strong><span>Amounts & identities checked</span></div><div className="pc-pending-connection"><span /><small>Authenticated<br />connection next</small></div><div className="pc-mini-ui"><Wallet /><strong>One student<br />experience.</strong><div><span>Overview</span><span>FinBot</span><span>Dining</span></div><Sample>Current UI uses samples</Sample></div></div><p className="pc-footnote">Dining uses a separate VT ARC planning workflow. This diagram illustrates the architecture; it does not perform network requests.</p></div>;
}

const agentStages = [
  { label: "Understand", title: "A money question becomes a request.", detail: "VT ARC parses a supported intent for the coach.", node: 0 },
  { label: "Discover", title: "Coach finds the right planner.", detail: "GoDaddy ANS resolves the configured planner identity.", node: 1 },
  { label: "Authenticate", title: "The request carries a signature.", detail: "The planner verifies the signed message before processing.", node: 2 },
  { label: "Compare", title: "The math has a dedicated owner.", detail: "Deterministic calculations compare cash flow and savings before and after a purchase.", node: 3 },
  { label: "Explain", title: "A trade-off comes back in plain language.", detail: "The coach explains the comparison. Previewing never changes the saved plan.", node: 4 },
] as const;

function Agents({ seconds }: { seconds: number }) {
  const [selected, setStep] = useState<number | null>(null);
  const step = selected ?? Math.min(4, Math.floor(seconds / 7));
  const stage = agentStages[step] ?? agentStages[0];
  return <div className="pc-agents-scene pc-enter"><div className="pc-heading-row"><div><p className="pc-kicker">Coach ↔ Planner</p><h1>Two agents.<br /><em>One clearer trade-off.</em></h1></div><Sample>Illustrated message flow</Sample></div><div className="pc-agent-diagram" data-step={step}><div className={`pc-agent-node pc-coach ${step === 0 || step === 4 ? "pc-agent-active" : ""}`}><FinBot /><strong>Coach</strong><span>Understands & explains</span></div><div className="pc-agent-path"><div className={`pc-discovery ${step === 1 ? "pc-agent-active" : ""}`}><Globe2 size={22} /><span>GoDaddy ANS</span><small>Discover planner identity</small></div><div className="pc-message-track"><span className="pc-message-dot" key={step} /><ArrowRight /><span>Signed request</span></div><div className="pc-return-track"><ArrowLeft /><span>Before / after comparison</span></div></div><div className={`pc-agent-node pc-planner ${step === 2 || step === 3 ? "pc-agent-active" : ""}`}><span className="pc-planner-icon"><Layers size={46} /></span><strong>Planner</strong><span>Calculates the comparison</span><small>Preview only · No saved-plan changes</small></div></div><div className="pc-agent-explainer"><div className="pc-stage-picker" aria-label="Agent flow steps">{agentStages.map((stage, i) => <button key={stage.label} onClick={() => setStep(i)} aria-pressed={step === i} aria-label={`${i + 1}. ${stage.label}`}>{i + 1}</button>)}</div><div className="pc-stage-explanation" aria-live="polite" aria-atomic="true"><strong>{stage.title}</strong><p>{stage.detail}</p></div><button className="pc-round-button" aria-label={step === 4 ? "Replay agent flow" : "Next agent flow step"} onClick={() => setStep((step + 1) % agentStages.length)}>{step === 4 ? <RotateCcw /> : <ArrowRight />}</button></div><p className="pc-footnote">Implemented backend path. Live ANS verification remains pending; fallback resolution is explicitly labeled.</p></div>;
}

function Closing() {
  return <div className="pc-closing pc-enter"><div className="pc-closing-top"><div><p className="pc-kicker">Money. Meals. A little more peace of mind.</p><h1>Spend with a plan<br /><em>for tomorrow.</em></h1><p className="pc-lede">Hokie Wallet helps make the next decision clearer.</p></div><FinBot /></div><div className="pc-challenges"><div><span>01 / Financial context</span><strong>Capital One</strong><p>Nessie sandbox banking</p></div><div><span>02 / Agent discovery</span><strong>GoDaddy</strong><p>ANS between coach & planner</p></div><div><span>03 / Student experience</span><strong>Deloitte + Databricks</strong><p>Campus dining planning</p></div></div><div className="pc-closing-bottom"><span>Built by Carlos, Neha, Grant & Bilguun.</span><a className="pc-action" href="/" target="_blank" rel="noreferrer">Explore Hokie Wallet <ArrowRight size={18} /></a></div></div>;
}

function Scene({ id, seconds }: { id: PresentationSceneId; seconds: number }) {
  switch (id) {
    case "intro": return <Intro />;
    case "problem": return <Problem />;
    case "overview": return <Overview seconds={seconds} />;
    case "finbot": return <Chat seconds={seconds} />;
    case "accessibility": return <Accessibility />;
    case "dining": return <Dining seconds={seconds} />;
    case "backend": return <Backend />;
    case "agents": return <Agents seconds={seconds} />;
    case "closing": return <Closing />;
  }
}

export function Presentation() {
  const [playback, dispatch] = useReducer(playbackReducer, initialPlayback);
  const [reduced, setReduced] = useState<boolean | null>(null);
  const systemReduced = useSyncExternalStore(subscribeMotion, readMotionPreference, serverMotionPreference);
  const effectiveReduced = reduced ?? systemReduced;
  const [controls, setControls] = useState(true);
  const [status, setStatus] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const notesButtonRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const scene = presentationScenes[playback.index] ?? presentationScenes[0];
  const nextScene = presentationScenes[playback.index + 1];

  useEffect(() => {
    if (window.matchMedia("(max-width: 900px), (max-height: 619px)").matches) {
      rootRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [scene.id]);

  useEffect(() => {
    if (!playback.running) return;
    const timer = window.setInterval(() => dispatch({ type: "tick", now: performance.now() }), 100);
    return () => window.clearInterval(timer);
  }, [playback.running]);

  const togglePlayback = useCallback(() => dispatch({ type: playback.running ? "pause" : "play", now: performance.now() }), [playback.running]);
  const fullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (rootRef.current?.requestFullscreen) await rootRef.current.requestFullscreen();
      else setStatus("Fullscreen is unavailable here. You can expand the browser window instead.");
    } catch { setStatus("Fullscreen could not open in this browser. You can expand the window instead."); }
  }, []);
  const openNotes = useCallback(() => {
    dispatch({ type: "pause", now: performance.now() });
    dialogRef.current?.showModal(); setNotesOpen(true);
  }, []);
  const closeNotes = useCallback(() => { dialogRef.current?.close(); }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (dialogRef.current?.open) {
        if (event.key.toLowerCase() === "n") { event.preventDefault(); closeNotes(); }
        return;
      }
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === " " && target.closest("button, a, summary")) return;
      switch (event.key.toLowerCase()) {
        case "arrowright": case " ": event.preventDefault(); dispatch({ type: "seek", index: playback.index + 1 }); break;
        case "arrowleft": event.preventDefault(); dispatch({ type: "seek", index: playback.index - 1 }); break;
        case "home": event.preventDefault(); dispatch({ type: "seek", index: 0 }); break;
        case "end": event.preventDefault(); dispatch({ type: "seek", index: presentationScenes.length - 1 }); break;
        case "p": event.preventDefault(); togglePlayback(); break;
        case "n": event.preventDefault(); openNotes(); break;
        case "f": event.preventDefault(); void fullscreen(); break;
        case "h": event.preventDefault(); setControls(current => !current); break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [playback.index, togglePlayback, openNotes, closeNotes, fullscreen]);

  // Keep a button that initiated navigation usable without retaining a detached focus target.
  const seek = (index: number) => dispatch({ type: "seek", index });
  return <div ref={rootRef} className="pitch" data-reduced={reduced ?? "system"} data-scene={scene.id} data-controls={controls}>
    <a className="pc-skip" href="#pitch-scene">Skip presentation controls</a>
    <header className="pc-header"><a className="pc-brand" href="/" target="_blank" rel="noreferrer"><Wallet size={24} /><span>hokie<span>Wallet</span></span></a><span className="pc-event">VTHacks 14 <span>/</span> sudoWin</span><div className="pc-scene-label"><span>{scene.speaker}</span><span>{String(playback.index + 1).padStart(2, "0")} / 09</span></div></header>
    <main id="pitch-scene" className="pc-stage" tabIndex={-1} aria-label={`${scene.title} Presented by ${scene.speaker}`}><Scene key={scene.id} id={scene.id} seconds={playback.elapsed - scene.startsAt} /></main>
    <div className="pc-sr-only" aria-live="polite" aria-atomic="true">Scene {playback.index + 1}: {scene.title} Speaker: {scene.speaker}.</div>
    {controls ? <footer className="pc-controls"><div className="pc-control-main"><div className="pc-navigation"><button className="pc-icon-button" aria-label="Previous scene" disabled={playback.index === 0} onClick={() => seek(playback.index - 1)}><ChevronLeft /></button><button className="pc-icon-button" aria-label="Next scene" disabled={playback.index === presentationScenes.length - 1} onClick={() => seek(playback.index + 1)}><ChevronRight /></button><button className="pc-play" onClick={togglePlayback}>{playback.running ? <Pause size={15} /> : <Play size={15} />}{playback.running ? "Pause" : playback.elapsed === 0 ? "Start 4-minute talk" : playback.elapsed === 240 ? "Replay talk" : "Resume talk"}</button><span className="pc-timer" aria-label={`${formatPresentationTime(playback.elapsed)} elapsed of 4 minutes`}>{formatPresentationTime(playback.elapsed)}<span> / 4:00</span></span></div><nav className="pc-dots" aria-label="Presentation scenes">{presentationScenes.map((item, i) => <button key={item.id} aria-label={`${i + 1}. ${item.title} ${item.speaker}`} aria-current={playback.index === i ? "step" : undefined} title={item.title} onClick={() => seek(i)}><span /></button>)}</nav><div className="pc-utilities"><button className="pc-icon-button" ref={notesButtonRef} aria-label="Open speaker notes" title="Speaker notes (N)" onClick={openNotes}><BookOpen size={18} /></button><button className="pc-icon-button" aria-label="Toggle reduced motion" aria-pressed={effectiveReduced} title={effectiveReduced ? "Motion reduced — turn animations on" : "Reduce motion"} onClick={() => setReduced(!effectiveReduced)}><Eye size={18} /><span className="pc-utility-text">{reduced === null ? effectiveReduced ? "System: reduced" : "System" : effectiveReduced ? "Reduced" : "Motion on"}</span></button><button className="pc-icon-button" aria-label="Toggle fullscreen" title="Fullscreen (F)" onClick={() => void fullscreen()}><Maximize2 size={18} /></button><button className="pc-icon-button" aria-label="Hide presentation controls" title="Hide controls (H)" onClick={() => setControls(false)}><EyeOff size={18} /></button></div></div><div className="pc-progress" role="progressbar" aria-label="Presentation time" aria-valuemin={0} aria-valuemax={totalPresentationSeconds} aria-valuenow={Math.floor(playback.elapsed)}><span style={{ width: `${playback.elapsed / totalPresentationSeconds * 100}%` }} /></div></footer> : <button className="pc-show-controls" onClick={() => setControls(true)}><Eye size={15} /> Show controls</button>}
    {status && <div className="pc-status" role="status">{status}<button onClick={() => setStatus("")} aria-label="Dismiss message"><X size={16} /></button></div>}
    <dialog className="pc-notes" ref={dialogRef} onClose={() => { setNotesOpen(false); notesButtonRef.current?.focus(); }} aria-labelledby="pc-notes-title"><div className="pc-notes-heading"><div><p className="pc-kicker">Presenter notes · Playback paused</p><h2 id="pc-notes-title">{scene.speaker} · {formatPresentationTime(scene.startsAt)}–{formatPresentationTime(scene.startsAt + scene.duration)}</h2></div><button className="pc-icon-button" aria-label="Close speaker notes" autoFocus={notesOpen} onClick={closeNotes}><X /></button></div><h3>{scene.title}</h3><p className="pc-notes-script">{scene.notes}</p><div className="pc-notes-next"><span>Up next</span><strong>{nextScene ? `${nextScene.speaker} · ${nextScene.title}` : "Thank the judges. Open the product for questions."}</strong></div><details><summary>Keyboard controls & sources</summary><p>← / → or Space: navigate · P: run / pause · N: notes · F: fullscreen · H: hide controls · Home / End: first / last scene. Text fields and the text-size slider keep their normal keyboard controls. N or Escape closes notes.</p><ul>{sourceLinks.map(source => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer">{source.label}</a><p>{source.description}</p></li>)}</ul><p>UI screenshots: team frontend, merged in 0c04e56. FinBot artwork and Origami photo: team. HokieBird photo in screenshots: Virginia Tech. The exact 499-word script is also in docs/presentation/speaker-notes.md.</p></details></dialog>
  </div>;
}
