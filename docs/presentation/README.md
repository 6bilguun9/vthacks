# Hokie Wallet presentation

With the frontend running, open <http://localhost:3000/present> for the animated browser presentation. It opens in the audience view, with nine scenes and a four-minute (240-second) timeline. Product screenshots and illustrated flows support the same story as the existing deck.

Speaker notes are presenter-only material, hidden from the default audience view. The notes dialog includes the speaking script and source links. Opening it pauses playback; close it before sharing the presentation screen.

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
npx next start --port 3001
```

Then open <http://localhost:3001/present>. Click **Start 4-minute talk** for timed scene changes and reveals, or use the arrows to advance at your own pace. Manual navigation pauses the timer. The dashboard, FinBot, meal week, and agent stages also have clickable controls for questions after the talk.

## Speaker timing

The script targets four minutes, with one minute per teammate:

| Speaker | Time | Content |
| --- | --- | --- |
| Carlos | 0:00–1:00 | Purpose, student problem, dashboard |
| Neha | 1:00–2:00 | FinBot and accessibility |
| Grant | 2:00–3:00 | Dining planner and backend connection |
| Bilguun | 3:00–4:00 | Agent communication and challenge alignment |

`speaker-notes.md` contains the same speaking script for rehearsal. The browser presentation preserves all 499 words exactly. The script leaves space for natural pauses at roughly 125 words per minute. Practice the handoffs with a timer.

## Images and integration status

The product images are screenshots of the actual UI using sample data. The backend and agent animations illustrate the implemented architecture; they do not perform live requests. Screenshot and asset credits are in `frontend/public/presentation/README.md` from the repository root.

FinBot still uses scripted replies, the frontend’s authenticated backend connection is pending, and live ANS execution still needs verification. Update those statements only after verifying the connected flow.

## PowerPoint fallback

`Hokie_Wallet_Four_Minute_Pitch.pptx` remains available as a fallback. Open it in PowerPoint or import it into Google Slides. Its nine slides include the same speaker notes and source citations, with editable diagrams and text.

The deck follows the requested four-minute duration. The [organizer guide](https://vthacks.com/guide) currently lists three minutes to present and one minute for questions, while [Devpost](https://vthacks-14.devpost.com/) describes four minutes. Confirm the allotted speaking time with the judges.
