# Mastra CodeMap

Interactive source code architecture documentation for the [Mastra AI Agent framework](https://github.com/mastra-ai/mastra).

**Live Demo → [mastra-codemap.itmirror.top](https://mastra-codemap.itmirror.top/)**

## What is this

A static site that visualizes Mastra's internal architecture through interactive diagrams, module dependency graphs, data flow walkthroughs, and documented design decisions. Built to help contributors and users understand how the framework works under the hood.

## Getting Started

```bash
pnpm install
pnpm dev
```

Dev server runs at `http://localhost:4321`.

## Pages

- `/` — Landing page with 8 core module cards + architecture overview
- `/modules` — Module details with Mermaid dependency graphs
- `/dataflow` — Full `agent.generate()` execution path, step-by-step scroll highlighting
- `/decisions` — 5 architecture design decisions (what was chosen, what was rejected, the trade-offs)
- `/quickstart` — Quick start guide

## Tech Stack

| Category   | Technology                   | Version |
| ---------- | ---------------------------- | ------- |
| Framework  | Astro                        | 5.18    |
| UI         | React                        | 19.2    |
| Styling    | Tailwind CSS                 | 4.3     |
| Animation  | Framer Motion                | 12      |
| Diagrams   | Mermaid                      | 11.16   |
| Components | Radix UI (Collapsible, Tabs) | —       |
| Icons      | Lucide React                 | —       |
| Language   | TypeScript                   | 5.9     |
| Package Mgr | pnpm                        | 10+     |
| Runtime    | Node                         | 24      |

## Build & Deploy

```bash
pnpm build     # runs content-check + astro build
pnpm preview   # preview locally
```

### Content Check

The build script runs `content-check` before Astro build to validate:
- Core and secondary module data integrity
- Design decision entries
- Mermaid diagram syntax

### Deployment

Hosted on **EdgeOne Pages**. Pushing to `main` triggers automatic deployment — no manual scripts needed.

EdgeOne build config:

| Setting       | Value          |
| ------------- | -------------- |
| Build command | `pnpm build`  |
| Output dir    | `dist`         |
| Node version  | 24             |
| Install cmd   | `pnpm install` |
| Framework     | Astro          |

## Generation

Generated with **Doubao-Seed-Evolving** via Claude Code from the Mastra source repository.
