# Auto Applier

A Chrome / Edge extension that fills job application forms with your saved details in one click.
See [REQUIREMENTS.md](REQUIREMENTS.md) for the full spec.

## Install
1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and pick this folder.
4. Pin the extension to the toolbar. The details page opens on first install.

## Use
- **Save details:** right-click the icon → **Options**. Fill in what you want and click **Save** (or `Ctrl+S`).
  - **Shortcut:** use **Upload resume** at the top. It fills most fields from your PDF / DOCX resume.
    Check the fields outlined in green, add anything missing, then Save.
  - **Better parsing:** paste a Groq API key (free at console.groq.com/keys) under **AI resume parsing** and Save.
    Uploaded resumes are then read by an AI model. Without a key, the built-in parser runs locally.
- **Fill a form:** open the application page and click the icon, or press `Alt+Shift+F`.
  The badge shows how many fields were filled, and they're briefly outlined in green.
  Check the form before you submit. The extension never submits anything.
- **More fields:** "+ Add field" in any section (e.g. LeetCode under Links). Work and Education take
  multiple entries (jobs; degree, PU / 12th, 10th), filled into forms in order.
- **Custom answers:** for repeated questions, add keywords (e.g. `why do you want, why join`) and your answer.
- **Backup:** Settings → Backup. Export / Import saves your profile and resume as a JSON file.

## Test forms
Sample application forms for trying the extension live in `test-site/`. Serve them locally:

```
python -m http.server 8765 --bind 127.0.0.1 --directory test-site
```

Then open http://localhost:8765. Each form has a **Fill report** panel (bottom-left) showing what was filled and what was missed.

| Page | Tests |
|---|---|
| Careers page form | Labels, resume upload, two job sections, education, Yes/No radios, dropdowns, EEO questions |
| Campus hiring portal | Table layout without `<label>`s, 10th / PU / degree rows, CTC, notice period, date of birth |
| React form | React-controlled inputs (shows what React state actually received) |
| Embedded form | Form in a cross-origin iframe (localhost ↔ 127.0.0.1) |

## Files
| File | Purpose |
|---|---|
| `manifest.json` | Extension manifest (MV3) |
| `background.js` | Handles icon click / shortcut, injects the filler into all frames |
| `fields.js` | Profile field definitions and matching keywords. Add keywords here to improve matching |
| `filler.js` | Detects form fields and fills them |
| `options.html/.css/.js` | Page where you edit your details |
| `resume-parser.js` | Extracts text from PDF / DOCX / TXT resumes and picks out profile fields (built-in rules, or Groq AI when a key is set) |
| `lib/pdf.min.js`, `lib/pdf.worker.min.js` | Mozilla pdf.js 3.11.174 (Apache-2.0), bundled for PDF text extraction |
