# Hokie Wallet presentation

The current animated presentation has nine scenes and a four-minute (240-second) timeline. It explains the Hokie student problem, shows the product, and illustrates the implemented backend and sponsor contributions. The browser presentation and portable HTML share the same current script. The team name is **sudo win**, lowercase with a space.

The [organizer guide](https://vthacks.com/guide) lists **three minutes to present and one minute for questions**. A separate three-minute script in [speaker-notes.md](speaker-notes.md#three-minute-rehearsal-script) uses the same nine scenes with manual advancement. Use that version for judging unless an organizer confirms four minutes of speaking time.

## Standalone presentation

From the repository root, export the presentation:

```bash
cd frontend
npm run presentation:export
```

Open `frontend/presentation-dist/Hokie_Wallet_Presentation.html` directly in a browser, or send that single file to a teammate. It embeds its images and fonts and does not need a running website or backend. External source links and links to the app still need their destinations to be available.

For development, the existing route remains available at <http://localhost:3000/present> with the frontend running. Both versions open in the audience view.

Speaker notes are presenter-only material, hidden from the default audience view. The notes dialog includes the speaking script and source links. Opening it pauses playback; close it before sharing the presentation screen.

For scenes 6–9, press **N** and expand **Backend explanation for judges’ questions** for plain-language answers about the API, data sources, AI provider, signed agent communication, and save behavior. These answers support Q&A and are not additional spoken script. Scene 7 automatically walks through Verify guest, Load context, Preview result, and Save revision; each stage is also clickable for rehearsal.

## Presentation controls

| Key | Action |
| --- | --- |
| Right arrow or Space | Next scene |
| Left arrow | Previous scene |
| P | Play or pause the automatic four-minute timeline |
| N | Open or close presenter notes; opening notes pauses playback |
| F | Toggle fullscreen |
| H | Hide or show controls |
| Home / End | First / last scene |

The reduced-motion toggle follows the system preference until the presenter overrides it. Use the visible controls or keyboard shortcuts to rehearse and present.

For a presentation without development controls, run the production frontend after building it:

```bash
cd frontend
npm run build
npx next start --port 3002
```

Then open <http://localhost:3002/present>. Port 3001 is reserved for the backend. Click **Start 4-minute talk** for timed scene changes and reveals, or use the arrows to advance at your own pace. Manual navigation pauses the timer. The dashboard, FinBot, meal week, backend steps, and agent stages also have clickable controls for questions after the talk.

## Speaker timing

The script targets four minutes, with one minute per teammate:

| Speaker | Time | Content |
| --- | --- | --- |
| Carlos | 0:00–1:00 | Purpose, student problem, dashboard |
| Neha | 1:00–2:00 | FinBot and accessibility |
| Grant | 2:00–3:00 | Dining planner and backend connection |
| Bilguun | 3:00–4:00 | Agent communication, purchase impact, and closing |

`speaker-notes.md` contains the same current speaking script for rehearsal: 478 words, or about 120 words per minute. The nine scene durations remain 15, 20, 25, 35, 25, 40, 20, 40, and 20 seconds. Practice the handoffs with a timer.

The three-minute version has 324 words and gives each speaker 45 seconds. Its manual scene targets are 12, 14, 19, 25, 20, 25, 20, 30, and 15 seconds. Leave automatic playback off and use a separate stopwatch for that version. Manual navigation also pauses the scene reveals, so the written rehearsal guide gives operator cues for showing the FinBot reply, sample meal week, backend steps, and final seven-day agent comparison. It also includes short answers to likely questions and a clear summary of verified integrations.

## Images and integration status

The product images are screenshots of the actual UI using sample data. The backend and agent animations illustrate the implemented architecture; they do not perform live requests. Screenshot and asset credits are in `frontend/public/presentation/README.md` from the repository root. The portable export embeds the image files instead of depending on a website image optimizer.

The agent replay uses a separate [synthetic contract fixture](https://github.com/6bilguun9/vthacks/blob/2bbffe8a62dfaba788d19f2e814c15501e312ece/contracts/examples/scenario-goal-delay.json): a $150 purchase uses $50 of discretionary money and $100 from the selected Laptop goal, moving projected completion from November 16 to November 23, 2026. This is a different profile from the dashboard and dining examples. It is not a live backend response or a saved purchase. The presentation displays supplied comparison values; financial calculations remain in the backend.

The backend connection scene explains four steps across its 20 seconds: **Verify guest → Load context → Preview result → Save revision**. The agent scene follows five responsibilities: **Parse the question → Discover the Planner → Authenticate the request → Calculate the comparison → Explain the result**. The AI structures a supported question; financial code owns the numbers and the Coach formats the explanation. Dining follows a separate suggestion-and-validation path, not the ANS Coach-to-Planner path.

The current backend supports VT ARC and OpenRouter with explicit server-side selection. ARC is the default; selecting OpenRouter does not enable automatic fallback between providers. This source support is separate from verifying a successful hosted provider request. Pinned implementation sources are available in the presenter notes.

The presentation uses scripted FinBot replies. The product's authenticated frontend connection is implemented, including plan previews and explicit saves, but the complete hosted guest flow still needs verification. A live read-only Nessie check retrieved two sandbox accounts and four purchases. A live ANS lookup resolved the Planner endpoint. These checks do not establish a successful full signed agent exchange, hosted student save, or live AI response. The latest ARC request returned 403, and no OpenRouter credential was configured. Keep those distinctions when answering questions.

## Student problem and sponsor fit

The problem is coordinating dining benefits, cash, and savings for everyday decisions. Virginia Tech already offers balances/history, dining calculators, and financial coaching; this prototype does not claim those resources are missing. Official VT sources and code evidence are available in the notes dialog.

The presentation connects concrete work to the [official sponsor categories](https://vthacks-14.devpost.com/). The current evidence supports these descriptions:

- **Capital One — Best Use of Nessie:** implemented read-only banking context with a verified sandbox retrieval.
- **GoDaddy — Best Use of ANS:** verified Planner discovery and an implemented signed, authenticated Coach-to-Planner path. The full remote invocation still needs a live check.
- **Deloitte × Databricks — AI Agent for the Virginia Tech Student Experience:** the student problem fits the theme, but the challenge requires the Databricks platform. We have no verified Databricks integration, so thematic fit does not establish eligibility. This distinction belongs in Q&A, not a claim of qualification in the spoken closing.

The presenters should describe what they built and verified. None of these descriptions guarantees prize eligibility or a judging result.

## PowerPoint fallback

`Hokie_Wallet_Four_Minute_Pitch.pptx` remains an earlier fallback. Open it in PowerPoint or import it into Google Slides. Its nine slides contain editable diagrams, text, and the previous speaker notes; the PowerPoint has not been updated with this revision’s script or synthetic agent comparison. Use the browser presentation or portable HTML for the current version.

The deck follows the requested four-minute duration. The [organizer guide](https://vthacks.com/guide) separates that slot into three minutes of presentation and one minute of questions, while [Devpost](https://vthacks-14.devpost.com/) describes four minutes. The manual three-minute script is ready for that format.
