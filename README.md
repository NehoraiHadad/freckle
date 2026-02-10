# Freckle | נמ״ש

> **נמ״ש** בעברית. **Freckle** in English.
> Centralized product management console.

---

## What Is This

A centralized management console that connects to all products via standardized Admin APIs. Each product exposes its own REST endpoints following a shared contract. Freckle consumes them all from one interface.

```
┌──────────────────────────────────┐
│        Freckle | נמ״ש            │
│    One dashboard, all products   │
└──────┬────────┬────────┬─────────┘
       │ REST   │ REST   │ REST
       ▼        ▼        ▼
  ┌────────┐ ┌────────┐ ┌────────┐
  │Product │ │Product │ │Product │
  │Admin   │ │Admin   │ │Admin   │
  │API     │ │API     │ │API     │
  └────────┘ └────────┘ └────────┘
```

## Project Structure

```
freckle/
├── README.md              ← You are here
├── build-freckle-prompt.md ← SEND THIS to build the Freckle console itself
├── build-prompt.md        ← SEND THIS to build Admin API on a product (team-driven)
├── prompt.md              ← Detailed task description (single agent, referenced by build-prompt)
├── docs/
│   ├── standard.md        ← Freckle Admin API Standard v1.1 (the contract)
│   ├── checklist.md       ← Compliance checklist
│   ├── examples/
│   │   └── curl-examples.sh
│   └── planning/          ← Full planning documentation (10 files, ~6,700 lines)
│       ├── vision.md          ← Product vision, scope, success criteria
│       ├── architecture.md    ← System design + Mermaid diagrams
│       ├── tech-stack.md      ← Technology decisions with rationale
│       ├── ui-plan.md         ← Pages, navigation, ASCII wireframes
│       ├── components.md      ← Core components with TypeScript interfaces
│       ├── data-model.md      ← SQLite schema, tables, encrypted keys
│       ├── api-client.md      ← Generic API client + caching + error handling
│       ├── roadmap.md         ← 5-phase development plan
│       ├── brainstorm.md      ← Ideas, integrations, challenges
│       └── implementation-guide.md  ← Copy-paste starter code (Next.js, Express, FastAPI, Flask)
└── src/                   ← Future: the Freckle console application
```

## How to Use

### Adding Admin API to a Product (Team Build)

1. Open a new Claude Code session at the product's root directory
2. Replace `{{PRODUCT_NAME}}` in `build-prompt.md` with the product name
3. Send the contents of `build-prompt.md` as the task
4. Claude will create a team of agents, read the standard, and build everything

### Adding Admin API to a Product (Solo Agent)

1. Open the product's codebase with a coding agent
2. Send the contents of `prompt.md` as the task
3. Append the contents of `docs/standard.md` below the `---STANDARD---` marker
4. The agent will analyze the codebase, design endpoints, and implement

### Verifying Compliance

Use `docs/checklist.md` to verify a product's Admin API follows the standard.

### Testing Endpoints

See `docs/examples/curl-examples.sh` for example requests and expected responses.

## Products

| Product | Status | Admin API | Stack |
|---------|--------|-----------|-------|
| story-creator | Active | Partial (existing `/api/v1/admin/*`) | Next.js + Firebase |
| podcasto | Planned | - | - |
| CoverBuddy | Planned | - | - |
| ai-graphic-designer | Planned | - | - |
| telegraph | Planned | - | - |
| auto-video-generator | Planned | - | - |

## Versioning

The standard version is tracked in `docs/standard.md`. When updating:
- Bump the version
- Document changes in the changelog section
- Ensure backward compatibility (additive changes only)
