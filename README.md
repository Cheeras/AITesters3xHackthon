# TraceQA — AI Test Case Generator

Generate deterministic, traceable QA test cases from Jira stories, GitHub issues, and pasted requirements — powered by Groq (LLaMA 3).

---

## 🚀 Live Demo

**👉 [https://ai-testers3x-hackthon-two.vercel.app](https://ai-testers3x-hackthon-two.vercel.app)**

---

## 📋 Problem Statement

QA engineers spend significant time manually interpreting requirements and translating them into test cases. This process is error-prone, time-consuming, and often leads to:

- **Inconsistent coverage** — different QA engineers interpret the same requirement differently
- **Missed scenarios** — edge cases, boundary conditions, and negative scenarios get overlooked
- **Bias and assumptions** — testers inadvertently add behavior not present in the original requirement
- **Format inconsistencies** — test cases end up in different formats, making reporting and traceability difficult

Manual test case creation simply doesn't scale with modern CI/CD pipelines.

---

## 💡 Solution

**TraceQA** solves this by providing an intelligent AI-powered interface that:

1. **Accepts requirements from multiple sources** — Jira Cloud issues, GitHub issues, or pasted text
2. **Normalizes the input** — extracts meaningful content from each source
3. **Generates structured test cases** — uses Groq (LLaMA 3.3 70B) with strict anti-hallucination instructions
4. **Prevents invention** — when requirements are ambiguous, it asks clarification questions instead of guessing
5. **Exports to CSV** — ready for Jira-style import or test management tools

### Key principles

- **Traceable** — every test step links back to the source requirement
- **Deterministic** — same input always produces the same output
- **No assumptions** — never invents features, APIs, or behavior not in the source

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript |
| **UI** | React 19, plain responsive CSS |
| **AI / LLM** | Groq API — LLaMA 3.3 70B (mixtral-8x7b-32768) |
| **API Integration** | Jira Cloud REST API v3, GitHub REST API |
| **Structured Output** | Zod validation schemas |
| **Testing** | Vitest (unit + adapter tests) |
| **Deployment** | Vercel (serverless Node.js) |

---

## 🧪 How to Run

### Prerequisites

- Node.js 20+ and npm
- A Groq API key (free at [console.groq.com](https://console.groq.com))
- (Optional) Jira Cloud credentials for Jira integration
- (Optional) GitHub personal access token for private repo access

### 1. Clone the repository

```bash
git clone https://github.com/Cheeras/AITesters3xHackthon.git
cd AITesters3xHackthon
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the project root:

```env
# Required
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Optional — for Jira integration
JIRA_URL=https://your-domain.atlassian.net/
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token

# Optional — for GitHub private repo access
GIT_HUB_API_TOKEN=your_github_pat
```

### 4. Run the development server

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 5. Run tests

```bash
npm test
```

### 6. Build for production

```bash
npm run build
```

---

## 🖼️ Screenshots

### Home Page

![TraceQA - AI Test Case Generator](https://ai-testers3x-hackthon-two.vercel.app)

*The main interface showing the source selector (Jira, GitHub, Paste text) and the settings sidebar on the left with connection status and LLM provider configuration.*

### Generated Test Cases

After pasting a requirement or entering a Jira/GitHub issue, the app generates structured test cases in a table format with columns for Scenario, TID, Test Data, Description, PreCondition, Test Steps, Expected Results, Priority, and more. Results can be downloaded as a CSV file.

### Settings Sidebar

The left sidebar provides:
- **LLM Provider** — Select between Groq (mixtral-8x7b-32768)
- **Connection Testing** — Test all service connections (Groq, Jira, GitHub) to verify they're reachable before generating

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate/route.ts     — Main generation API (GET config, POST generate)
│   │   └── settings/verify/route.ts — Connection verification API
│   ├── globals.css               — Global styles
│   ├── layout.tsx                — Root layout
│   └── page.tsx                  — Entry page
├── components/
│   ├── Generator.tsx             — Main generator UI component
│   └── Settings.tsx              — Left sidebar settings panel
└── lib/
    ├── csv.ts                    — CSV export utilities
    ├── types.ts                  — Shared TypeScript types
    ├── validation.ts             — Zod schemas for AI output
    ├── csv.test.ts
    ├── validation.test.ts
    ├── generation/
    │   ├── openai.ts             — Groq API client & generation logic
    │   └── prompt.ts             — System prompt & instructions
    └── sources/
        ├── index.ts              — Source resolver
        ├── github.ts             — GitHub issue fetcher
        ├── jira.ts               — Jira issue fetcher
        ├── text.ts               — Pasted text parser
        └── sources.test.ts
```

---

## 🔗 Links

- **Live App**: [https://ai-testers3x-hackthon-two.vercel.app](https://ai-testers3x-hackthon-two.vercel.app)
- **GitHub Repo**: [https://github.com/Cheeras/AITesters3xHackthon](https://github.com/Cheeras/AITesters3xHackthon)
- **Groq Console**: [https://console.groq.com](https://console.groq.com)

## Project structure

```text
src/
├── app/
│   ├── api/generate/route.ts   # configuration status and unified generation API
│   ├── globals.css             # responsive visual design
│   ├── layout.tsx
│   └── page.tsx
├── components/Generator.tsx    # source input, states, results, and CSV download
└── lib/
    ├── generation/             # prompt policy and OpenAI integration
    ├── sources/                # Jira, GitHub, PDF/TXT, and pasted-text adapters
    ├── csv.ts                  # exact deterministic CSV serializer
    ├── types.ts
    └── validation.ts
```

## Local setup

### Prerequisites

- Node.js 20.9 or newer
- npm
- An OpenAI API key
- Optional Jira Cloud and GitHub credentials

### Install and configure

```bash
npm install
```

Copy `.env.example` to `.env.local`, then provide the integrations you want to use:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.4-mini

JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-jira-email
JIRA_API_TOKEN=your-jira-api-token

GITHUB_TOKEN=optional_github_token
```

All three Jira values are required for Jira input. A GitHub token is optional for public repositories and required for private repositories. Credentials remain server-side and are never returned to the browser.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful verification commands:

```bash
npm run typecheck
npm test
npm run build
```

## How to use

1. Select Jira, GitHub, PRD upload, or pasted text.
2. Enter the issue identifier, select a PDF/TXT file, or paste the complete requirement.
3. Select **Generate test cases**.
4. If clarification is requested, add those details to the source and generate again.
5. Review the resulting table and select **Download CSV**.

Uploads are limited to 5 MB and extracted requirements to 50,000 characters. PDF and TXT are supported in v1.

## Output contract

The exported CSV always uses this exact column order, including the deliberately repeated result headings:

```text
Scenario,TID,Test Data,TestCase Description,PreCondition,TestSteps,Expected Result,Actual Result,Steps to Execute,Expected Result,Actual Result,Status,Executed QA Name,Misc (Comments),Priority,Is Automated
```

- TIDs are assigned as `TC001`, `TC002`, and so on.
- Execution fields are blank and status defaults to `Not Executed`.
- Missing requirement details use exactly `Insufficient information to determine.`
- Any unavoidable inference is prefixed with `Inference (low confidence):`.
- Between one and ten unique cases are returned when supported by the source.

## Deploy to Vercel

1. Push the repository to GitHub.
2. Import the repository into Vercel as a Next.js project.
3. Add the required environment variables in **Project Settings → Environment Variables**.
4. Deploy and verify every configured source type.

No custom build command is required. Add the live deployment URL here after deployment:

```text
https://your-project.vercel.app
```

## Screenshots

After deploying, capture and add the following judge-facing screenshots:

```text
docs/screenshots/generator.png
docs/screenshots/generated-test-cases.png
docs/screenshots/clarification.png
```

## Security and limitations

- Secrets are read only from server environment variables.
- Source content is treated as untrusted product data and cannot override the generation policy.
- Upstream authentication failures and rate limits are returned as safe user-facing errors.
- V1 does not include DOCX/OCR, test history, editing, user accounts, or direct Xray/Zephyr import.

## License

Add the license appropriate for your submission before publishing the repository.
