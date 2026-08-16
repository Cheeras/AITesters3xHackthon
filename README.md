# TraceQA — AI Test Case Generator

TraceQA is a lightweight web application that converts Jira stories, GitHub issues, PDF/TXT product documents, and pasted requirements into deterministic, traceable QA test cases. It generates only behavior supported by the supplied source and exports the result in the required Jira-style CSV schema.

## Problem

QA engineers spend significant time interpreting requirements and translating them into consistent positive, negative, boundary, edge, functional, and supported non-functional coverage. Manual preparation can miss cases and can introduce assumptions that are not present in the source.

## Solution

TraceQA provides one responsive interface for four requirement sources:

- Jira Cloud issue key
- GitHub issue URL or `owner/repository#123`
- PDF or TXT upload
- Pasted PRD, user story, or acceptance criteria

The server normalizes the source, sends it to OpenAI with strict anti-hallucination instructions, validates the structured response, and assigns deterministic test IDs. When the source is too ambiguous to support useful deterministic coverage, the application presents focused clarification questions instead of manufacturing behavior.

## Tech stack

- Next.js App Router, React, and TypeScript
- Plain responsive CSS with no UI framework
- OpenAI Responses API with Zod structured-output validation
- Jira Cloud REST API and GitHub REST API
- `pdf-parse` for server-side PDF extraction
- Vitest for unit and adapter tests
- Vercel-compatible Node.js route handler

The project intentionally has no database, authentication layer, state library, or background worker. Requirements and generated cases are not persisted by the application.

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
