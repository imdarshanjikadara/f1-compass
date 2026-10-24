# F-1 Compass — OPT & STEM OPT Deadline Tracker

**F-1 Compass** is a free, privacy-first web application designed to help F-1 international students in the United States calmly and accurately track their **Post-Completion OPT** and **24-Month STEM OPT** filing windows, **DSO I-20 recommendation cutoffs**, **60-day grace periods**, and **unemployment day limits**.

Built with love for F-1 students by **[Darshan Jikadara](https://www.linkedin.com/in/imdarshanjikadara/)**.

---

## Table of Contents

1. [Why F-1 Compass Exists](#1-why-f-1-compass-exists)
2. [Core Principles & Architecture](#2-core-principles--architecture)
3. [Features From A to Z](#3-features-from-a-to-z)
4. [The 6 Built-In Immigration Date Rules (Exact Formulas)](#4-the-6-built-in-immigration-date-rules-exact-formulas)
5. [Real Deadline Arbitrator & Priority Banner Logic](#5-real-deadline-arbitrator--priority-banner-logic)
6. [Tech Stack](#6-tech-stack)
7. [Project Structure](#7-project-structure)
8. [Local Development & Setup](#8-local-development--setup)
9. [API Endpoints Reference](#9-api-endpoints-reference)
10. [Local Storage & Privacy Architecture](#10-local-storage--privacy-architecture)
11. [Pushing This Project to GitHub](#11-pushing-this-project-to-github)
12. [Legal Disclaimer](#12-legal-disclaimer)
13. [Author & License](#13-author--license)

---

## 1. Why F-1 Compass Exists

Every year, hundreds of thousands of F-1 international students navigate overlapping USCIS and SEVIS rules when applying for Post-Completion Optional Practical Training (OPT) and the 24-Month STEM OPT Extension. Common pitfalls include:

- **The 30-Day DSO I-20 Trap**: Assuming you have until 60 days after graduation to file Form I-765, without realizing that USCIS **must** receive your application within **30 days** of the date your DSO issues your OPT recommendation I-20—whichever date comes first.
- **The 60-Day STEM I-20 Rule vs. EAD Expiration**: Filing a STEM OPT extension before your OPT EAD card expires, or within 60 days of the STEM I-20 recommendation date—whichever comes first.
- **CIP Code Confusion**: Assuming a major title (such as *"Data Science"* or *"Business Analytics"*) automatically qualifies or disqualifies a degree for STEM OPT, when only the exact **6-digit DHS CIP code printed on Page 1 of Form I-20** matters.
- **Unemployment Day Tracking**: Losing track of the **90-day** unemployment cap during initial Post-Completion OPT or the **150-day** aggregate cap across Initial OPT + STEM OPT.

**F-1 Compass** solves this by requiring only **one date to start** (your Form I-20 Program End Date) and turning complex overlapping immigration rules into a clear, visual timeline, actionable checklist, and calendar reminders.

---

## 2. Core Principles & Architecture

1. **100% Deterministic Date Math**:
   Every single date, countdown, filing window, grace period, and unemployment count is calculated strictly by deterministic TypeScript functions (`src/utils/dateRules.ts`) in local calendar time (`YYYY-MM-DD`). AI is **never** used to compute or alter any date or deadline.
2. **100% Browser-Local Privacy**:
   All personal dates, degree details, employment intervals, and checklist checkmarks are saved exclusively in your browser's `localStorage` (`f1_compass_state_v1`). Users can clear their data at any time via the two-step **"Reset my data"** action.
3. **Smart Hybrid Mode (Zero-Token Core + Custom Q&A Fallback)**:
   - **My Checklist**: Runs 100% on the built-in deterministic checklist engine (`src/utils/checklistRules.ts`), dynamically tailoring every step to your degree level (`Bachelor's`, `Master's`, `PhD`), STEM status, and entered I-20/EAD dates with **0 API calls**.
   - **Ask About Your Timeline**: Clicking any of the **4 Starter Prompt buttons** or asking an out-of-scope question (H-1B, Cap-Gap, international travel, visa stamping, CPT, RFEs, or legal advice) is answered 100% deterministically in `0ms` using **0 API tokens**. The Gemini API (`@google/genai`) is only called when a student manually types a custom question into the text box, with automatic multi-model fallback and a deterministic rule-bound backup if the API is busy.

---

## 3. Features From A to Z

### A. One-Screen Progressive Onboarding (`OnboardingForm.tsx`)
- **Minimal Friction**: Start with just your **Program End Date** (from Page 1 of Form I-20), **Degree Level** (`Bachelor's`, `Master's`, `PhD`), and **STEM Designation** (`Yes`, `No`, `Not sure`).
- **Progressive Optional Dates**: Add or clear your **OPT Recommendation I-20 Issue Date**, **OPT EAD Start & End Dates** (auto-suggests a 1-year EAD end date when start date is entered), and **STEM OPT I-20 Issue Date** as you receive them.
- **Smart Field Visibility**: Automatically hides STEM OPT date inputs if the student selects **No** (Non-STEM), while displaying a helpful conditional STEM timeline if the student selects **Not sure**.
- **Real-Time Validation**: Warns if an OPT I-20 issue date is more than 90 days before the program end date, or if an EAD end date precedes the EAD start date.

### B. Intelligent "Next Step" Priority Banner (`App.tsx`)
- Dynamically highlights the single most urgent action at the top of the workspace:
  - **Filing Window Closed (`>60` days past Program End Date with no EAD)**: Displays a high-visibility red alert banner advising immediate contact with the school's DSO.
  - **OPT Window Open & No OPT I-20 Entered Yet**: Prompts **"Request your OPT recommendation from your DSO"** as the primary headline, while showing the final USCIS filing cutoff (`Program End Date + 60 days`) as a secondary reference line directly below.
  - **OPT I-20 Entered**: Promotes the winning **Real Deadline** (comparing the 30-day I-20 rule against the 60-day post-completion cutoff) with a live day countdown.
  - **Active OPT with STEM Degree & EAD Expiring**: Highlights the STEM OPT extension filing window and Real Deadline.

### C. "Real Deadline" Callout Cards (`TimelineView.tsx`)
- Side-by-side comparison cards for **Post-Completion OPT** and **24-Month STEM OPT** that explicitly show:
  - The **Winning Rule** (e.g., `OPT I-20 Issue Date + 30 Days` vs. `Program End Date + 60 Days`).
  - The **Compared Cutoff** that came later, explaining in plain English why the earlier date governs when USCIS must receive Form I-765.
  - Quick CTA buttons to enter missing I-20 or EAD dates directly from the timeline.

### D. Visual Milestone Timeline & Category Filters (`TimelineView.tsx`)
- Chronological timeline cards color-coded by urgency:
  - **Urgent (`≤ 14` days remaining)** — Red badge & border accent
  - **Due Soon (`15–30` days remaining)** — Amber badge & border accent
  - **Upcoming / Open Now** — Teal badge & border accent
  - **Passed / Window Closed** — Muted slate badge
- Filter milestones by category: **All Milestones**, **Post-Completion OPT**, **24-Month STEM OPT**, or **Grace Period**.
- **Day 59 / Day 60 Filing Warning**: Automatically surfaces a warning if today is 59 or 60 days after the Program End Date and no EAD card has been entered.

### E. Calendar Exports (`.ics` & Google Calendar) (`calendarExport.ts`)
- **Export All (`.ics`)**: Downloads a standard iCalendar file (`f1-compass-deadlines.ics`) compatible with Apple Calendar, Outlook, and Google Calendar containing all calculated milestones and a 7-day advance reminder alarm (`-P7D`).
- **Per-Milestone Actions**: Every milestone card includes one-click buttons to open a pre-filled **Google Calendar** event in a new tab or download an individual `.ics` file.

### F. Interactive Action Checklist (`MyChecklistView.tsx`)
- Deterministic step-by-step checklist grouped across 4 phases:
  1. **Phase 1: Pre-Completion & OPT I-20 Request**
  2. **Phase 2: Form I-765 USCIS Filing**
  3. **Phase 3: Active Post-Completion OPT & Reporting**
  4. **Phase 4: 24-Month STEM OPT Extension** (automatically hidden for Non-STEM students)
- Check off completed steps with a live progress bar (`X/Y completed`).
- **Rule-Bound Personalization**: Automatically tailors step titles, instructions, and *"Why this matters"* notes to your degree level (`Bachelor's`, `Master's`, `PhD`), STEM status, and current stage with zero API latency.

### G. Unemployment Day Counter (`UnemploymentTracker.tsx`)
- Supports both **Initial Post-Completion OPT (90-day cap)** and **Active STEM OPT (150-day aggregate cap)**.
- Two seamless tracking modes:
  1. **Manual Slider / Number Input**: Quickly adjust total unemployment days used (`0` to `150+`).
  2. **Calculate from Employment Dates**: Add multiple employment start/end intervals (or check *"Current job"*) to automatically compute exact calendar gaps between jobs within your active EAD window.
- Visual progress bar with color-coded safety thresholds (`Within Safe Allowance`, `Approaching Cap`, `Limit Reached / Exceeded`).

### H. CIP Code & STEM Verification Guide (`CipCodeGuide.tsx` & `cipData.ts`)
- Explains step-by-step where to find the 6-digit CIP code on **Page 1 of Form I-20** under *"Program of Study"*.
- Emphasizes that **majors with the same name can have different CIP codes at different universities**, and only the exact 6-digit code on Form I-20 determines eligibility.
- Direct links to:
  - **[Official DHS STEM Designated Degree Program List (PDF)](https://www.ice.gov/sites/default/files/documents/stem-list.pdf)**
  - **[NCES CIP 2020 Code Directory (`y=56`)](https://nces.ed.gov/ipeds/cipcode/default.aspx?y=56)**
- Searchable reference directory of common CIP series (`11.xxxx`, `14.xxxx`, `15.xxxx`, `26.xxxx`, `27.xxxx`, `30.xxxx`, `40.xxxx`, `45.0603`, `52.13xx`, `52.0201`), displayed as **stacked cards on mobile (`<768px`)** and a **structured table on desktop (`≥768px`)**.

### I. Rule-Grounded Timeline Q&A (`TimelineChatPanel.tsx`)
- Starter prompts for common deadline questions (*"What happens if I file on day 59?"*, *"How many unemployment days do I have left?"*, *"What is my Real Deadline and why?"*).
- Deterministic out-of-scope guardrail that declines questions on H-1B, Cap-Gap, international travel/visas, CPT, RFEs, or legal advice and directs students to their DSO or an immigration attorney.
- Accessible via the side column on desktop (`≥1024px`), the **Ask Q&A** navigation tab, or a compact floating icon button on mobile.

### J. Responsive Layout & Theme Support (`360px` to `1440px+`)
- **Desktop (`≥1024px`)**: Full inline navigation bar, primary **Edit Dates / View Timeline** button, **Light / Dark Mode** toggle, and a gear menu containing **Reset my data** (with two-step confirmation).
- **Mobile & Tablet (`<1024px`)**: Compact header with logo, sun/moon theme icon button, and hamburger menu opening a slide-in drawer with all 5 sections, **Edit Dates**, and **Reset my data**.
- **Zero Horizontal Overflow**: Engineered to fit cleanly down to `360px` screen width with wrapping profile chips, equal-width tab switchers, and stacked mobile cards.

---

## 4. The 6 Built-In Immigration Date Rules (Exact Formulas)

All rules are implemented in `src/utils/dateRules.ts`:

| Rule # | Milestone / Rule Name | Exact Formula | Description |
| :--- | :--- | :--- | :--- |
| **Rule 1** | **OPT Filing Window Opens** | `Program End Date − 90 calendar days` | Earliest date USCIS can receive your Post-Completion OPT Form I-765. |
| **Rule 2** | **OPT Final USCIS Cutoff** | `Program End Date + 60 calendar days` | Latest date USCIS can receive your Post-Completion OPT Form I-765 (end of 60-day grace period). |
| **Rule 3** | **OPT 30-Day DSO I-20 Rule** | `min(OPT I-20 Issue Date + 30 days, Program End Date + 60 days)` | USCIS must receive Form I-765 within 30 days of the DSO's OPT recommendation on Form I-20 **and** before the 60-day post-completion cutoff. **Whichever date comes earlier is your Real Deadline.** |
| **Rule 4** | **60-Day Post-Completion Grace Period** | `Program End Date` to `Program End Date + 60 calendar days` | Latest permissible requested OPT start date and final day to depart the U.S., transfer SEVIS, or change status if not filing for OPT. |
| **Rule 5** | **24-Month STEM OPT Extension Window** | Opens: `OPT EAD End Date − 90 days`<br>Real Deadline: `min(STEM I-20 Issue Date + 60 days, OPT EAD End Date)` | USCIS must receive the STEM OPT Form I-765 up to 90 days before the initial OPT EAD expires, **before** the EAD expires, and within **60 days** of the DSO's STEM I-20 recommendation. *(Hidden if `stemStatus === 'no'`)* |
| **Rule 6** | **Unemployment Day Limits** | Initial OPT: **90 days max**<br>Active STEM OPT: **150 days aggregate max** | Cumulative calendar days without qualifying employment during the active EAD validity window (`max(EAD Start Date, Today)` to `min(EAD End Date, Today)`). |

---

## 5. Real Deadline Arbitrator & Priority Banner Logic

When a student enters both a **Program End Date** and an **OPT Recommendation I-20 Issue Date**, F-1 Compass computes:
- $\text{Cutoff}_{30} = \text{OPT I-20 Issue Date} + 30\text{ days}$
- $\text{Cutoff}_{60} = \text{Program End Date} + 60\text{ days}$
- $\text{Real Deadline} = \min(\text{Cutoff}_{30}, \text{Cutoff}_{60})$

For example, if a student's Program End Date was 20 days ago (`Cutoff_60` is in 40 days), and their DSO issued their OPT I-20 **25 days ago** (`Cutoff_30` is in **5 days**), F-1 Compass flags **5 days left** as the **Real Deadline** and warns that waiting until the 60-day grace period end would result in an automatic USCIS rejection under the 30-day I-20 rule.

---

## 6. Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), Lucide React Icons
- **Backend (Full-Stack Dev & Production Server)**: Node.js, Express (`server.ts`), Vite Middleware (in development), Static SPA serving (in production)
- **AI SDK (Optional Backend Routes)**: `@google/genai` (used exclusively for optional checklist copy personalization and rule-grounded Q&A in `server.ts`)
- **Build & Tooling**: Vite 8, `tsx`, TypeScript (`tsc --noEmit`)

---

## 7. Project Structure

```text
f1-compass/
├── public/
│   ├── favicon.svg                  # F-1 Compass vector icon
│   └── og-preview.svg               # 1200x630 Open Graph social share preview card
├── src/
│   ├── components/
│   │   ├── CipCodeGuide.tsx         # Searchable CIP code guide, DHS PDF & NCES 2020 links
│   │   ├── MyChecklistView.tsx      # 4-phase interactive checklist with progress tracking
│   │   ├── OnboardingForm.tsx       # One-screen date setup & validation form
│   │   ├── TimelineChatPanel.tsx    # Rule-grounded Q&A panel & mobile floating button
│   │   ├── TimelineView.tsx         # Real Deadline cards, milestone filters, & .ics export
│   │   └── UnemploymentTracker.tsx  # 90d/150d unemployment slider & employment gap calculator
│   ├── data/
│   │   └── cipData.ts               # Curated CIP code reference series & STEM notes
│   ├── utils/
│   │   ├── calendarExport.ts        # RFC 5545 .ics file generator & Google Calendar URLs
│   │   ├── dateRules.ts             # Pure deterministic 6-rule immigration date engine
│   │   └── storage.ts               # Browser localStorage load/save/reset helpers
│   ├── App.tsx                      # Main layout, responsive header, hamburger drawer, banner
│   ├── index.css                    # Tailwind CSS v4 imports, custom fonts, & theme variables
│   ├── main.tsx                     # React 19 root mount
│   └── types.ts                     # Shared TypeScript interfaces and types
├── .env.example                     # Example environment variables template
├── .gitignore                       # Git ignore rules
├── index.html                       # Entry HTML with SEO, Open Graph, Twitter cards, & fonts
├── LICENSE                          # MIT License
├── metadata.json                    # Application metadata
├── package.json                     # Dependencies and npm scripts
├── README.md                        # Complete project documentation
├── server.ts                        # Express server + Vite middleware + API routes
├── tsconfig.json                    # TypeScript configuration
└── vite.config.ts                   # Vite bundler configuration
```

---

## 8. Local Development & Setup

### Prerequisites
- **Node.js** `v18+` (or `v20+` recommended)
- **npm** (or `bun` / `pnpm`)

### Step 1: Clone the Repository
```bash
git clone https://github.com/<your-github-username>/f1-compass.git
cd f1-compass
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and optionally add your Gemini API key if you want to enable the **Ask Q&A** and **Personalize Checklist Copy** backend endpoints:
```env
GEMINI_API_KEY="your_actual_api_key_here"
PORT=3000
```
*(Note: The entire timeline calculator, Real Deadline engine, checklist, CIP code guide, calendar export, and unemployment tracker work 100% offline in the browser even without an API key.)*

### Step 4: Start the Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### Step 5: Type-Check & Build for Production
```bash
# Run TypeScript compiler check
npm run lint

# Build production bundle into dist/
npm run build

# Start production server
npm start
```

---

## 9. API Endpoints Reference

The Express server (`server.ts`) exposes two JSON endpoints:

### 1. `POST /api/checklist/generate`
Tailors checklist step titles and plain-English descriptions to the student's degree level and stage while keeping all due dates locked to the deterministic engine.
- **Request Body**:
  ```json
  {
    "degreeLevel": "masters",
    "stemStatus": "yes",
    "hasOptI20": false,
    "hasEad": false,
    "hasStemI20": false,
    "usedUnemploymentDays": 0,
    "maxAllowedUnemploymentDays": 90,
    "slots": [
      {
        "stepKey": "opt-request-i20",
        "phase": "Phase 1: Pre-Completion & OPT I-20 Request",
        "dueDateFormatted": "Feb 15, 2026",
        "countdownText": "12 days left",
        "ruleCitation": "Rule 1 (Program End Date - 90 days)",
        "title": "Request OPT Recommendation I-20 from DSO"
      }
    ]
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "items": [
      {
        "stepKey": "opt-request-i20",
        "title": "Request Master's OPT I-20 from Your DSO",
        "instruction": "...",
        "whyThisMatters": "..."
      }
    ]
  }
  ```

### 2. `POST /api/chat/ask`
Answers student questions strictly using their entered dates and the 6 built-in rules, or flags out-of-scope legal/immigration topics.
- **Request Body**:
  ```json
  {
    "question": "What is my Real Deadline and why?",
    "timelineContext": { ... }
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "answer": "Your Real Deadline for USCIS to receive Form I-765 is ...",
    "isOutOfScope": false
  }
  ```

---

## 10. Local Storage & Privacy Architecture

- **Storage Key**: `f1_compass_state_v1`
- **Theme Key**: `f1_compass_theme` (`light` | `dark`)
- **What Is Stored Locally**:
  - `profile`: Student name (optional), degree level, STEM status, I-20 and EAD dates, employment intervals, and unemployment tracking mode.
  - `checklistCompleted`: Map of completed checklist item keys.
  - `personalizedChecklist`: Cached personalized descriptions (invalidated automatically if profile dates change).
  - `chatMessages`: Local Q&A conversation history.
- **One-Click Data Erasure**: Selecting **Reset my data** (available in the header gear menu on desktop, the hamburger menu on mobile/tablet, and the setup form footer) clears `f1_compass_state_v1` after a confirmation step.

---

## 11. Pushing This Project to GitHub

Run these commands from the project root directory to push your repository to GitHub:

```bash
# 1. Initialize Git repository (if not already initialized)
git init

# 2. Stage all project files (.gitignore automatically excludes node_modules, dist, .env, and .aistudio)
git add .

# 3. Create your initial commit
git commit -m "Initial commit: F-1 Compass OPT & STEM OPT Deadline Tracker"

# 4. Rename the default branch to main
git branch -M main

# 5. Add your GitHub repository remote URL
git remote add origin https://github.com/<your-github-username>/<your-repo-name>.git

# 6. Push to GitHub
git push -u origin main
```

---

## 12. Legal Disclaimer

> **Planning tool only, not legal advice.**
> F-1 Compass is an independent educational planning tool and is **not** affiliated with USCIS, DHS, ICE, SEVP, or any university. Immigration regulations and institutional procedures change frequently. Always confirm your exact filing windows, CIP code eligibility, SEVIS reporting requirements, and work authorization dates directly with your school's **Designated School Official (DSO)**, official **[USCIS](https://www.uscis.gov/) / [Study in the States](https://studyinthestates.dhs.gov/)** guidance, or a qualified immigration attorney.

---

## 13. Author & License

- **Created by**: **[Darshan Jikadara](https://www.linkedin.com/in/imdarshanjikadara/)** — Built with love for F-1 students.
- **License**: Released under the [MIT License](./LICENSE).
