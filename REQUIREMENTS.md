# Auto Applier — Requirements

## Problem

I apply to a lot of job openings, and most of them use web forms (Greenhouse, Lever,
Ashby, company career pages, Google Forms, etc.). I have to type the same details into
every form again and again.

## Goal

A browser extension where I save all my details once, and every time I click the
extension icon it automatically fills the job application form on the current page.

## Functional requirements

### 1. Save my details (profile)
- An options page where I can enter and edit my details, grouped into sections:
  - **Personal** — first / middle / last / full / preferred name, email, phone, date of birth, gender, pronouns
  - **Address** — address lines, city, state, postal code, country, current location
  - **Links** — LinkedIn, GitHub, portfolio / website, Twitter / X, other link
  - **Work** — current company, current title, years of experience, current salary, expected salary, notice period / availability, skills, summary / about me
  - **Education** — university, degree, major, graduation year, GPA
  - **Eligibility & other** — work authorization, visa sponsorship, willingness to relocate, how I heard about the job, ethnicity, veteran status, disability status
- **Add more fields to any section**: a "+ Add field" button (or "+ Add link" in Links) adds a
  field with my own name and value, e.g. LeetCode, Kaggle or Passport number. The field name is used to match form
  questions (comma-separated names allow several).
- **Multiple work experiences**: Work has a list of jobs (company, title, location, start, end, "I currently work
  here", description) that I can add to, remove and reorder, most recent first. The first job counts as the current one.
- **Multiple education entries**: Education has a list of entries (level, school / college, degree / course,
  field of study / stream, board / university, grade, start, end), e.g. B.Tech, PU / 12th and 10th.
  Levels: Postgraduate, Undergraduate, Diploma, PU / 12th, 10th / SSLC, Other.
- **Custom answers**: my own question → answer pairs for questions that come up often
  (e.g. "why do you want to work here", "notice period"). Each entry has comma-separated
  keywords to match against the question, and the answer to fill.
- **Resume upload**: store my resume file once so it can be attached to resume / CV upload fields.
- Details are saved locally in the browser (`chrome.storage.local`) — never sent anywhere.
- **Export / import** the profile as a JSON file for backup or moving to another browser.

### 1a. Fill details from my resume (first-time setup)
- A "Quick start" upload on the options page: upload a resume (PDF, DOCX or TXT) and the
  profile fields are filled in automatically, so I don't have to type everything the first time.
- Text is extracted in the browser (PDF via bundled pdf.js, DOCX via built-in unzip).
- **AI parsing (optional):** if I add a Groq API key in settings, the resume text is sent to Groq
  (default model `openai/gpt-oss-120b`, changeable) to pick out the fields. This handles unusual layouts much better.
  - Model is picked from a dropdown. It's loaded live from Groq for the saved key (speech, text-to-speech, guard and
    small-context models are hidden). A **Recommended** group lists models tested on resume extraction:
    `openai/gpt-oss-120b` (best accuracy, default), `openai/gpt-oss-20b` (faster), `qwen/qwen3.8-27b` (fastest).
    A short note under the dropdown describes the selected model.
  - The model is told to use only what's written in the resume and not to guess. Questions a resume can't answer
    (work authorization, sponsorship, demographics, etc.) are never asked of it.
  - The built-in parser fills any fields the AI leaves out, and takes over completely if the AI request fails.
  - The API key is stored only in the browser, kept separate from the data passed into web pages, and left out of exports.
- Without a key, parsing is fully local and the resume never leaves the computer.
- Extracts, where present:
  - **Contact** — name (first / middle / last / full), email, phone, location (city, state, country)
  - **Links** — LinkedIn, GitHub, Twitter / X, portfolio / website, including links hidden behind clickable icons in PDFs
  - **Summary** and **Skills** sections
  - **Experience** — current title and company (from the first entry), total years of experience
    calculated from the date ranges (overlapping jobs counted once, "Present" = today)
  - **Education** — university, degree, major, graduation year, GPA / CGPA / percentage
- Only fills empty fields by default; an option replaces existing values.
- Fields filled from the resume are highlighted so I can review them before clicking Save.
- The uploaded file is also saved as my resume for upload fields.
- Old `.doc` files and scanned (image-only) PDFs aren't supported.

### 2. Fill the form with one click
- Clicking the extension icon fills the form on the current tab immediately.
- Keyboard shortcut as an alternative (default `Alt+Shift+F`).
- If no details are saved yet, clicking the icon opens the options page instead.
- Supports text inputs, email / tel / url / number inputs, textareas, dropdowns (`<select>`),
  radio button groups (e.g. Yes / No questions) and resume file uploads.
- Works inside embedded iframes (e.g. Greenhouse / Lever forms embedded on company sites).
- Works with React / Vue / Angular based forms (fires the proper `input` / `change` events so the
  site registers the value).

### 3. Field detection
- Identify what each field is asking using, in order of reliability:
  1. the `autocomplete` attribute (`given-name`, `email`, `tel`, …)
  2. the field's label, `aria-label`, `aria-labelledby`, placeholder, `name` and `id`
  3. the surrounding text of the field's container (for forms with poor markup)
- Match against keywords for each profile field; the most specific (longest) keyword match wins
  (so "First name" goes to first name, not full name).
- Derive missing values: full name from first + last, or first / last from full name.
- **Repeated sections**: when a form has several job or education blocks, the 1st "Company" field gets job 1,
  the 2nd gets job 2, and so on. Dates are filled as typed, or converted for month / date pickers.
  A current job's end date is filled as "Present".
- **School levels**: questions that name a level ("12th percentage", "PU college name", "SSLC board") get that
  level's entry. Degree questions without a level use the degree entries.

### 4. Safety & feedback
- By default only fill **empty** fields — never overwrite something already typed.
  A setting allows overwriting.
- Never touch password, hidden, disabled or read-only fields, and never submit the form.
- Briefly highlight the fields that were filled.
- Show how many fields were filled (badge on the icon + a small toast on the page).

## Non-functional requirements
- Chrome / Edge / Brave (Chromium) extension, Manifest V3, plain JavaScript — no build step.
- Load as an unpacked extension.
- No external servers, analytics or network requests, except the optional Groq call when parsing a resume with an API key set.

## Known limitations (out of scope for v1)
- Custom JavaScript dropdowns that aren't real `<select>` elements (e.g. react-select, Workday pickers).
- Fields inside closed shadow DOM.
- Clicking a form's "Add another" button to create more job / education blocks (it fills the blocks already on the page).
- Captchas and account sign-up / login steps.
