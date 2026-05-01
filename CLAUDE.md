# Kids Story App — workshop project

A personalized 4-page bedtime story generator for kids. This CLAUDE.md is the brief — when this session starts, **read this end-to-end before doing anything**, then load the 10 milestones as a TodoWrite list and begin at milestone 1.

## Product brief

A public website (no login) where a parent or child enters:
- **Kid's name** (e.g. "Maya")
- **Theme** (one of: animals, dinosaurs, space, magic)
- **Length** (one of: short, medium, long — roughly mapping to ~2 / ~4 / ~6 pages)

The site calls an LLM via OpenRouter, generates a personalized story starring that child, and renders it page-by-page in a friendly storybook UI. Optionally generates illustrations via LumenPro.

### Flow
1. **Input form** — name + theme picker + length picker
2. **API call** — `/api/generate-story` POSTs to OpenRouter with a prompt
3. **Output** — paginated story view with Previous/Next navigation
4. **Deployed** — live on Vercel under a public URL

## The 10 milestones (treat as TodoWrite list)

1. **CLAUDE.md setup** — read this file, confirm understanding with the user
2. **Plan mode** — propose architecture & file plan before coding (use ExitPlanMode)
3. **Create repo + git init** — `git init` inside this directory
4. **Vibecode the parent storytelling app** — scaffold Next.js + Tailwind, build the form, the API route, and the story view
5. **Connect APIs — LumenPro + OpenRouter** — wire OpenRouter for text, LumenPro for images (user has 2,100 LumenPro credits + an OpenRouter key)
6. **Push to GitHub** — create remote repo via `gh` CLI and push
7. **Deploy to Vercel** — link Vercel to the GitHub repo, set env vars, deploy
8. **Re-edit and push again** — iterate based on the live deploy (typos, layout, prompt tweaks)
9. **Check deployment** — visit the live URL, run a real story generation end-to-end
10. **Create README** — write a project README explaining what the app does and how to run it locally

### Discipline rule
**If any milestone hits 5 minutes, defer the polish and move on.** Ship over perfect.

## Tech stack (mirror the Storista project)

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS 4**
- Scaffold with: `npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --eslint --use-npm --no-turbopack --no-git`
- Font: **Lora** via `next/font/google` (warm serif for storybook feel)
- API routes in `app/api/`
- Components in `app/components/`

## Hard-won lessons from the Storista build (apply these)

### OpenRouter
- **Use ONLY `:free` models** — the user does NOT want any paid charges. Recommended: **`openai/gpt-oss-120b:free`**.
- **Add a safety guard** at the top of the API route:
  ```ts
  const MODEL = "openai/gpt-oss-120b:free";
  if (!MODEL.endsWith(":free")) {
    throw new Error("Refusing to start: model is not :free");
  }
  ```
- **`max_tokens: 3000`** — `gpt-oss` models burn tokens on internal reasoning. 1500 isn't enough for a 4-page story.
- **`response_format: { type: "json_object" }`** — keeps the output parseable.
- Free models intermittently rate-limit upstream. A fallback chain (try model A → B → C) is nice-to-have if time allows.

### LumenPro for images
- LumenPro is image-generation. The user has 2,100 credits.
- **Check first whether LumenPro has a REST API** (not just MCP). If MCP-only, skip image gen for now and ship text-only — don't get stuck.
- If REST API exists: prompt it with `"soft watercolor children's book illustration, warm pastel colors, hand-painted style, no text"` style instructions to get a storybook look.

### Validation & rate limiting
- Validate `name` (trim, length 1-50, no weird chars)
- Validate `theme` against the enum
- Validate `length` against the enum
- In-memory IP-based rate limit: **5 stories per IP per hour** — `lib/rate-limit.ts` pattern.

### Env vars
- `.env.local` for secrets (gitignored — `.env*` is in default `.gitignore`)
- `.env.example` committed as a template — add `!.env.example` to `.gitignore` to allow it
- Required: `OPENROUTER_API_KEY`. Optionally: `LUMENPRO_API_KEY` if image gen is wired.

### Browser preview workflow
- Use `preview_start` (not raw `npm run dev`) for the dev server — config in `.claude/launch.json`
- After every edit, verify with `preview_screenshot` or `preview_inspect`
- **If CSS edits don't appear:** `rm -rf .next` and restart preview. Turbopack can cache stale CSS across restarts.

### UX patterns from Storista that worked well
- Storybook palette: cream background `#fbf3e0`, warm brown text `#3a2818`, amber/terracotta accents
- Lora serif font set on body via `--font-lora` CSS variable
- Story view with "Page X of Y", "← Previous" / "Next →" buttons, "Write another story" on last page
- "▶ Read to me" button using browser `window.speechSynthesis` (free, no API needed)

## User context

- **GitHub:** login `t000081-git`, display name `t000081-charles`, SSH key at `~/.ssh/id_ed25519`
- **Machine:** MacBook Air M5 (arm64), Homebrew at `/opt/homebrew`
- **Familiarity:** Has built multiple Next.js + Tailwind projects; comfortable with the stack
- **Working style:** Run commands without asking permission for routine/reversible work. Confirm before destructive or external-effect actions (force push, deploys to production, sending messages).
- **Cost preference:** Zero spend. Free tier or browser-native APIs only.

## Where to start

After reading this file, your first response should be:
1. Acknowledge you've read the brief
2. Load the 10 milestones into a TodoWrite list (mark milestone 1 as in-progress)
3. Confirm a few quick questions with the user:
   - Project name to use in `package.json` (suggest `kids-story-app`)
   - Whether to attempt LumenPro image integration in milestone 5, or stay text-only
   - Whether they have a GitHub repo name in mind for milestone 6
4. Then move to milestone 2 — propose the architecture in plan mode.
