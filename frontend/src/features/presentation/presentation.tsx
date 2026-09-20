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
import { presentationMedia, presentationAppUrl } from "./presentation-media";
import { backendExample, presentationDate } from "./backend-example";
import { backendSteps, backendBriefings } from "./presentation-backend";
import "./presentation.css";

function subscribeMotion(listener: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
function readMotionPreference() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
function serverMotionPreference() { return false; }

function FinBot({ className = "" }: { className?: string }) {
  return <span className={`pc-bot ${className}`}><Image src={presentationMedia.finbot} unoptimized loading="eager" alt="FinBot, our hand-drawn orange robot" width={445} height={473} /></span>;
}

function Sample({ children = "Sample data" }: { children?: React.ReactNode }) {
  return <span className="pc-sample"><span aria-hidden="true" />{children}</span>;
}

function ProductImage({ name, alt, className = "" }: { name: "overview" | "dining"; alt: string; className?: string }) {
  return <div className={`pc-product ${className}`}>
    <div className="pc-window" aria-hidden="true"><i /><i /><i /><span>hokieWallet / {name === "overview" ? "overview" : name}</span></div>
    <Image src={presentationMedia[name]} unoptimized loading="eager" alt={alt} width={1280} height={720} />
  </div>;
}

function Intro() {
  return <div className="pc-intro pc-enter">
    <div className="pc-intro-copy">
      <p className="pc-kicker">For the days between dining halls & deadlines</p>
      <h1>Make your<br />dining money<br /><em>last.</em></h1>
      <p className="pc-lede">A student money guide.<br />Built by Hokies, for Hokies.</p>
      <div className="pc-team"><span>sudo win</span><p>Carlos · Neha · Grant · Bilguun</p></div>
    </div>
    <div className="pc-intro-art">
      <div className="pc-photo"><Image src={presentationMedia.campus} unoptimized loading="eager" alt="Origami dining at Virginia Tech" fill sizes="(max-width: 700px) 90vw, 45vw" /><span>A familiar place. A better plan.</span></div>
      <div className="pc-balance-note pc-rise"><Wallet size={24} /><span>Campus funds</span><strong>{formatMoney(demoData.walletBalanceCents)}</strong><Sample /></div>
      <FinBot className="pc-intro-bot" />
      <span className="pc-handwritten">Meet your money’s<br />new study buddy.</span>
    </div>
  </div>;
}

function Problem() {
  return <div className="pc-problem pc-enter">
    <div className="pc-problem-copy"><p className="pc-kicker">The gap between a balance and a decision</p><h1>“Will my dining<br />money last?”</h1><p className="pc-lede">Which benefit should cover lunch?<br />What cash should I protect for later?</p></div>
    <div className="pc-receipt-scene">
      <div className="pc-receipt"><span className="pc-kicker">Your campus balance</span><strong>{formatMoney(demoData.walletBalanceCents)}</strong><div className="pc-receipt-rule" /><span>Recent activity</span>{demoData.recentTransactions.slice(0, 2).map(t => <p key={t.id}><span>{t.name}</span><span>{formatMoney(t.amountCents)}</span></p>)}<small>Historical preview · Separate example transactions</small><Sample /></div>
      <div className="pc-question-note"><Utensils /><p>Use a swipe, an exchange,<br />or dining dollars?</p><ArrowDown aria-hidden="true" /></div>
      <div className="pc-question-note pc-question-second"><CircleDollarSign /><p>Will this purchase<br />delay my savings goal?</p></div>
    </div>
    <p className="pc-footnote">VT provides balances, transaction history, a dining-dollar calculator, and financial coaching. Our focus is bringing everyday decisions together.</p>
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
      <div className="pc-overview-details"><div className="pc-focus-tabs" aria-label="Dashboard detail">{overviewDetails.map((detail, i) => <button key={detail.title} aria-pressed={focus === i} onClick={() => setFocus(i)}><span>0{i + 1}</span>{detail.title}</button>)}</div><div className="pc-detail-copy" aria-live="polite" aria-atomic="true"><strong>{detail.value}</strong><p>{detail.text}</p></div><a className="pc-text-link" href={presentationAppUrl} target="_blank" rel="noreferrer">Explore the actual dashboard <ArrowRight size={16} /></a></div>
    </div>
  </div>;
}

function Chat({ seconds }: { seconds: number }) {
  const [selected, setReply] = useState<boolean | null>(null);
  const reply = selected ?? seconds >= 8;
  return <div className="pc-chat-scene pc-enter">
    <div className="pc-chat-copy"><p className="pc-kicker">Ask FinBot</p><h1>A place to ask.<br /><em>A place to return.</em></h1><p className="pc-lede">Your questions, with context.<br />Your conversations, kept together.</p><p className="pc-chat-connection">Connected mode sends supported questions to the backend Coach for a Planner comparison. Hosted verification remains pending.</p><div className="pc-chat-features"><span><MessageCircle />Saved conversations</span><span><FileText />Room to explain</span></div><FinBot /></div>
    <div className="pc-chat-demo"><div className="pc-chat-top"><span><Sparkles size={19} /> FinBot</span><Sample>Scripted example</Sample></div><div className="pc-chat-body" aria-live="polite" aria-atomic="false"><div className="pc-chat-user">{demoChatExamples[2].question}</div>{reply ? <div className="pc-chat-reply pc-rise"><span className="pc-avatar"><Sparkles size={18} /></span><p>{demoChatExamples[2].answer}</p></div> : <div className="pc-chat-placeholder"><MessageCircle size={34} /><p>A simpler starting point<br />for a complicated question.</p></div>}</div><button className="pc-action pc-chat-action" onClick={() => setReply(!reply)}>{reply ? "Replay the question" : "Show FinBot’s example reply"}{reply ? <RotateCcw size={17} /> : <ArrowRight size={17} />}</button><a className="pc-chat-footer" href={`${presentationAppUrl}#finbot`} target="_blank" rel="noreferrer">Open the full chat experience <ArrowRight size={15} /></a></div>
  </div>;
}

function Accessibility() {
  const [size, setSize] = useState(100);
  const [palette, setPalette] = useState("plum");
  const [reading, setReading] = useState(false);
  const [speechStatus, setSpeechStatus] = useState("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const cancelReading = useCallback(() => {
    const utterance = utteranceRef.current;
    if (!utterance) return;
    utteranceRef.current = null;
    // Intentional stops must not surface as browser audio failures.
    utterance.onend = null;
    utterance.onerror = null;
    window.speechSynthesis.cancel();
  }, []);
  useEffect(() => cancelReading, [cancelReading]);
  const read = () => {
    if (!("speechSynthesis" in window)) { setSpeechStatus("Read aloud is unavailable in this browser."); return; }
    if (reading) { cancelReading(); setReading(false); setSpeechStatus(""); return; }
    const utterance = new SpeechSynthesisUtterance(`Sample savings goal. Emergency fund. ${formatMoney(demoData.savingsGoal.savedCents)} of ${formatMoney(demoData.savingsGoal.targetCents)}. Savings are already included in bank cash.`);
    utteranceRef.current = utterance;
    utterance.onend = () => { utteranceRef.current = null; setReading(false); };
    utterance.onerror = () => { utteranceRef.current = null; setReading(false); setSpeechStatus("Audio stopped or unavailable. The same information is visible on screen."); };
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
  return <div className="pc-dining-scene pc-enter"><div className="pc-heading-row"><div><p className="pc-kicker">Dining planner</p><h1>From a balance<br /><em>to a week of meals.</em></h1></div><button className="pc-action" onClick={() => setShowWeek(!showWeek)}>{showWeek ? "Back to the inputs" : "Reveal the sample week"}{showWeek ? <ArrowLeft size={17} /> : <ArrowRight size={17} />}</button></div><div className="pc-dining-content" key={String(showWeek)}>{!showWeek ? <div className="pc-dining-inputs"><ProductImage name="dining" alt="The dining planner form asks for plan type, campus balances, weeks left, and dietary preferences." /><div className="pc-dining-recipe"><span className="pc-kicker">A separate dining example</span><strong>One week.<br />Your existing benefits.</strong><dl><div><dt>Meal plan</dt><dd>Unlimited</dd></div><div><dt>Dining dollars</dt><dd>$225</dd></div><div><dt>Weeks left</dt><dd>15</dd></div><div><dt>Preference</dt><dd>Vegetarian</dd></div></dl><Sample>Synthetic profile</Sample></div></div> : <div className="pc-meal-week"><div className="pc-week-summary"><Utensils size={24} /><p>Use included swipes.<br /><strong>Keep dining dollars for flexibility.</strong></p><Sample>Illustrative week</Sample></div><div className="pc-meal-days">{sampleDiningPlan.days.slice(0, 5).map(day => <div className="pc-meal-day" key={day.day}><h2>{day.day.slice(0, 3)}</h2>{day.meals.map(meal => <div className="pc-meal" key={meal.label} data-exchange={meal.payment === "meal_exchange"}><span>{meal.label}</span><strong>{meal.venue}</strong><small>{meal.payment === "meal_exchange" ? "Meal exchange" : "Included swipe"}</small></div>)}</div>)}</div><p className="pc-footnote">Five-day preview of the seven-day sample. Estimated prices; current menus, hours, and eligibility must be checked.</p></div>}</div><div className="pc-dining-method" aria-label="Dining backend workflow"><span>Student inputs</span><ArrowRight aria-hidden="true" /><span>AI meal suggestions</span><ArrowRight aria-hidden="true" /><span>Server checks costs</span><ArrowRight aria-hidden="true" /><span>Weekly calendar</span></div><p className="pc-footnote">OpenRouter or VT ARC, selected on the server. This separate dining workflow uses estimated meal prices.</p></div>;
}

function Backend({ seconds }: { seconds: number }) {
  const [selected, setStep] = useState<number | null>(null);
  const step = selected ?? Math.min(3, Math.floor(seconds / 5));
  const current = backendSteps[step] ?? backendSteps[0];
  return <div className="pc-backend-scene pc-enter">
    <div className="pc-heading-row"><div><p className="pc-kicker">Grant + Bilguun · The backend we built</p><h1>How the backend<br /><em>connects</em></h1></div><span className="pc-implementation">Frontend connection implemented<br /><b>Hosted verification pending</b></span></div>
    <ol className="pc-request-steps" aria-label="Backend request flow">{backendSteps.map((item, i) => <li key={item.label}><button aria-pressed={step === i} onClick={() => setStep(i)}><span>0{i + 1}</span>{item.label}</button>{i < backendSteps.length - 1 && <ArrowRight aria-hidden="true" />}</li>)}</ol>
    <div className="pc-request-story">
      <div className="pc-request-copy" key={step} aria-live="polite" aria-atomic="true"><span className="pc-kicker">Step {step + 1} · {current.label}</span><h2>{current.title}</h2><p>{current.description}</p><div className="pc-request-benefit"><ShieldCheck size={21} /><strong>{current.outcome}</strong></div></div>
      <aside className="pc-request-sources" aria-label="Backend data sources"><p className="pc-kicker">What the API brings together</p><div><CircleDollarSign /><span><strong>Nessie</strong><small>Sandbox bank cash & purchases</small></span></div><div><Utensils /><span><strong>Student inputs</strong><small>Campus balances, bills & goals</small></span></div><div><Layers /><span><strong>Supabase</strong><small>Guest-owned plans & revisions</small></span></div><p>The API returns structured results for the screen to display.</p></aside>
    </div>
    <p className="pc-footnote">{current.note} This animation explains the connection without making API calls.</p>
  </div>;
}

const agentStages = [
  { label: "Understand", title: "“What would a $150 purchase change?”", detail: "The Coach uses OpenRouter or VT ARC to extract the amount, date, and selected goal from a supported question." },
  { label: "Discover", title: "Coach discovers Planner through ANS", detail: "GoDaddy ANS finds the configured Planner endpoint, so the Coach knows where to send the comparison request." },
  { label: "Authenticate", title: "A signed request connects the agents", detail: "The Planner checks the signature and guest identity, then loads that student’s plan. Goal funding requires the student’s selection." },
  { label: "Compare", title: "See the cost beyond the price tag", detail: "The planning engine checks bills, cash timing, and goals. This synthetic Laptop example moves completion seven days later." },
  { label: "Explain", title: "Understand the trade-off before buying", detail: "The Coach formats the Planner’s validated numbers into an explanation. Catch-up funding needs checking. The student chooses whether to save." },
] as const;

function PurchaseComparison() {
  const { response, impact, purchaseCents } = backendExample;
  return <div className="pc-comparison pc-rise">
    <div className="pc-comparison-context"><span className="pc-kicker">Independent Laptop goal example</span><p><strong>{formatMoney(purchaseCents, 0)} purchase</strong><span>{formatMoney(response.funding.discretionaryCents, 0)} discretionary + {formatMoney(response.funding.goalCents, 0)} from the student-selected goal</span></p></div>
    <div className="pc-comparison-dates">
      <div><span>Goal before purchase</span><strong>{presentationDate(impact.originalDate)}</strong><small>Original completion date</small></div>
      <div className="pc-delay"><ArrowRight /><strong>+{impact.delayDays} days</strong><span>Effect of this purchase</span></div>
      <div><span>Goal after purchase</span><strong>{presentationDate(impact.revisedDate)}</strong><small>Revised completion date</small></div>
    </div>
    <div className="pc-comparison-recovery"><ShieldCheck size={20} /><p>Catch-up alternatives: <strong>{formatMoney(impact.nextWeekExtraCents, 0)} once</strong> or <strong>{formatMoney(impact.remainingWeeklyExtraCents)} extra per week for 8 weeks</strong>.<span>Affordability has not been checked. This preview changes no saved plan.</span></p></div>
  </div>;
}

function Agents({ seconds }: { seconds: number }) {
  const [selected, setStep] = useState<number | null>(null);
  const step = selected ?? Math.min(4, Math.floor(seconds / 7));
  const stage = agentStages[step] ?? agentStages[0];
  return <div className="pc-agents-scene pc-enter">
    <div className="pc-heading-row"><div><p className="pc-kicker">Bilguun · Coach + Planner</p><h1>How Coach and Planner<br /><em>work together</em></h1></div><Sample>{step >= 3 ? "Synthetic backend example" : "Illustrated message flow"}</Sample></div>
    {step >= 3 ? <PurchaseComparison /> : <div className="pc-agent-diagram" data-step={step}>
      <div className={`pc-agent-node pc-coach ${step === 0 ? "pc-agent-active" : ""}`}><FinBot /><strong>Coach</strong><span>AI interprets the question</span><small>OpenRouter or VT ARC<br />Chosen in backend configuration</small></div>
      <div className="pc-agent-path"><div className={`pc-discovery ${step === 1 ? "pc-agent-active" : ""}`}><Globe2 size={22} /><span>GoDaddy ANS</span><small>Discover planner identity</small></div><div className="pc-message-track"><span className="pc-message-dot" key={step} /><ArrowRight /><span>Signed purchase request</span></div><div className="pc-return-track"><ArrowLeft /><span>Validated amounts & dates</span></div></div>
      <div className={`pc-agent-node pc-planner ${step === 2 ? "pc-agent-active" : ""}`}><span className="pc-planner-icon"><Layers size={46} /></span><strong>Planner</strong><span>Code calculates cash flow & goal dates</span><small>Checks bills, buffer & goal funding</small></div>
    </div>}
    <div className="pc-agent-explainer"><div className="pc-stage-picker" aria-label="Agent flow steps">{agentStages.map((stage, i) => <button key={stage.label} onClick={() => setStep(i)} aria-pressed={step === i} aria-label={`${i + 1}. ${stage.label}`}>{i + 1}</button>)}</div><div className="pc-stage-explanation" aria-live="polite" aria-atomic="true"><strong>{stage.title}</strong><p>{stage.detail}</p></div><button className="pc-round-button" aria-label={step === 4 ? "Replay agent flow" : "Next agent flow step"} onClick={() => setStep((step + 1) % agentStages.length)}>{step === 4 ? <RotateCcw /> : <ArrowRight />}</button></div>
    <p className="pc-footnote">Synthetic contract example, not a live agent call or transaction. The signed remote flow and hosted end-to-end connection still need verification.</p>
  </div>;
}

function Closing() {
  return <div className="pc-closing pc-enter">
    <div className="pc-closing-top"><div><p className="pc-kicker">Why it matters for Hokies</p><h1>Use your benefits.<br /><em>Protect your goals.</em></h1><p className="pc-lede">Choose lunch. Understand a purchase. Plan for next week.</p></div><FinBot /></div>
    <div className="pc-challenges">
      <div><span>Capital One</span><strong>Best Use of Nessie</strong><p>Read-only sandbox balances and purchases give the plan banking context.</p><small>Know what cash your plan starts with.</small></div>
      <div><span>GoDaddy</span><strong>Best Use of ANS</strong><p>Planner discovery is verified. Signed Coach-to-Planner requests are implemented for spending comparisons.</p><small>See how spending affects your goal.</small></div>
      <div><span>UI/UX · Ut Prosim</span><strong>Built for more Hokies</strong><p>Adjustable text, color choices, reduced motion, and read-aloud make planning easier to access.</p><small>One place to understand your next decision.</small></div>
    </div>
    <div className="pc-closing-bottom"><span>sudo win · Carlos & Neha: frontend · Grant & Bilguun: backend</span><a className="pc-action" href={presentationAppUrl} target="_blank" rel="noreferrer">Explore Hokie Wallet <ArrowRight size={18} /></a></div>
  </div>;
}

function Scene({ id, seconds }: { id: PresentationSceneId; seconds: number }) {
  switch (id) {
    case "intro": return <Intro />;
    case "problem": return <Problem />;
    case "overview": return <Overview seconds={seconds} />;
    case "finbot": return <Chat seconds={seconds} />;
    case "accessibility": return <Accessibility />;
    case "dining": return <Dining seconds={seconds} />;
    case "backend": return <Backend seconds={seconds} />;
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
  const briefing = backendBriefings[scene.id];

  useEffect(() => {
    for (const src of Object.values(presentationMedia)) {
      const image = new window.Image();
      image.src = src;
    }
  }, []);

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
    <header className="pc-header"><a className="pc-brand" href={presentationAppUrl} target="_blank" rel="noreferrer"><Wallet size={24} /><span>hokie<span>Wallet</span></span></a><span className="pc-event">VTHacks 14 <span>/</span> sudo win</span><div className="pc-scene-label"><span>{scene.speaker}</span><span>{String(playback.index + 1).padStart(2, "0")} / 09</span></div></header>
    <main id="pitch-scene" className="pc-stage" tabIndex={-1} aria-label={`${scene.title} Presented by ${scene.speaker}`}><Scene key={scene.id} id={scene.id} seconds={playback.elapsed - scene.startsAt} /></main>
    <div className="pc-sr-only" aria-live="polite" aria-atomic="true">Scene {playback.index + 1}: {scene.title} Speaker: {scene.speaker}.</div>
    {controls ? <footer className="pc-controls"><div className="pc-control-main"><div className="pc-navigation"><button className="pc-icon-button" aria-label="Previous scene" disabled={playback.index === 0} onClick={() => seek(playback.index - 1)}><ChevronLeft /></button><button className="pc-icon-button" aria-label="Next scene" disabled={playback.index === presentationScenes.length - 1} onClick={() => seek(playback.index + 1)}><ChevronRight /></button><button className="pc-play" onClick={togglePlayback}>{playback.running ? <Pause size={15} /> : <Play size={15} />}{playback.running ? "Pause" : playback.elapsed === 0 ? "Start 4-minute talk" : playback.elapsed === 240 ? "Replay talk" : "Resume talk"}</button><span className="pc-timer" aria-label={`${formatPresentationTime(playback.elapsed)} elapsed of 4 minutes`}>{formatPresentationTime(playback.elapsed)}<span> / 4:00</span></span></div><nav className="pc-dots" aria-label="Presentation scenes">{presentationScenes.map((item, i) => <button key={item.id} aria-label={`${i + 1}. ${item.title} ${item.speaker}`} aria-current={playback.index === i ? "step" : undefined} title={item.title} onClick={() => seek(i)}><span /></button>)}</nav><div className="pc-utilities"><button className="pc-icon-button" ref={notesButtonRef} aria-label="Open speaker notes" title="Speaker notes (N)" onClick={openNotes}><BookOpen size={18} /></button><button className="pc-icon-button" aria-label="Toggle reduced motion" aria-pressed={effectiveReduced} title={effectiveReduced ? "Motion reduced — turn animations on" : "Reduce motion"} onClick={() => setReduced(!effectiveReduced)}><Eye size={18} /><span className="pc-utility-text">{reduced === null ? effectiveReduced ? "System: reduced" : "System" : effectiveReduced ? "Reduced" : "Motion on"}</span></button><button className="pc-icon-button" aria-label="Toggle fullscreen" title="Fullscreen (F)" onClick={() => void fullscreen()}><Maximize2 size={18} /></button><button className="pc-icon-button" aria-label="Hide presentation controls" title="Hide controls (H)" onClick={() => setControls(false)}><EyeOff size={18} /></button></div></div><div className="pc-progress" role="progressbar" aria-label="Presentation time" aria-valuemin={0} aria-valuemax={totalPresentationSeconds} aria-valuenow={Math.floor(playback.elapsed)}><span style={{ width: `${playback.elapsed / totalPresentationSeconds * 100}%` }} /></div></footer> : <button className="pc-show-controls" onClick={() => setControls(true)}><Eye size={15} /> Show controls</button>}
    {status && <div className="pc-status" role="status">{status}<button onClick={() => setStatus("")} aria-label="Dismiss message"><X size={16} /></button></div>}
    <dialog className="pc-notes" ref={dialogRef} onClose={() => { setNotesOpen(false); notesButtonRef.current?.focus(); }} aria-labelledby="pc-notes-title"><div className="pc-notes-heading"><div><p className="pc-kicker">Presenter notes · Playback paused</p><h2 id="pc-notes-title">{scene.speaker} · {formatPresentationTime(scene.startsAt)}–{formatPresentationTime(scene.startsAt + scene.duration)}</h2></div><button className="pc-icon-button" aria-label="Close speaker notes" autoFocus={notesOpen} onClick={closeNotes}><X /></button></div><h3>{scene.title}</h3><p className="pc-notes-script">{scene.notes}</p><div className="pc-notes-next"><span>Up next</span><strong>{nextScene ? `${nextScene.speaker} · ${nextScene.title}` : "Thank the judges. Open the product for questions."}</strong></div>{briefing && <details className="pc-backend-notes"><summary>Backend explanation for judges’ questions</summary>{briefing.map(item => <section key={item.question}><h4>{item.question}</h4><p>{item.answer}</p></section>)}</details>}<details><summary>Keyboard controls & sources</summary><p>← / → or Space: navigate · P: run / pause · N: notes · F: fullscreen · H: hide controls · Home / End: first / last scene. Text fields and the text-size slider keep their normal keyboard controls. N or Escape closes notes.</p><ul>{sourceLinks.map(source => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer">{source.label}</a><p>{source.description}</p></li>)}</ul><p>UI screenshots: team frontend, merged in 0c04e56. FinBot artwork and Origami photo: team. HokieBird photo in screenshots: Virginia Tech. The current script is also in docs/presentation/speaker-notes.md. The purchase comparison reproduces a synthetic backend contract example; it makes no live API request.</p></details></dialog>
  </div>;
}
