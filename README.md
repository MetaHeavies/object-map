# Object Map

Create an object model of your project that your coding agent maintains as it builds.

As coding agents grow more capable, maintaining visibility into what is actually being built becomes increasingly difficult. Domain logic, data structures, and feature choices quickly get fragmented across long chat histories, PRDs, pull requests, and generated code. When you hand an agent a prompt and say "build this," it is easy to lose track of your system's core primitives.

Object Map gives you and your coding agent a shared, continuously updated single source of truth. Your agent reads the repository — routes, forms, schemas, services, tests — and records the core building blocks of your product: objects, attributes, relationships, actions, and states. The model it keeps is [Object-Oriented UX](https://alistapart.com/article/object-oriented-ux/) (OOUX), Sophia Prater's method for describing a product as the things its users recognize, rather than as the screens they pass through.

Instead of digging through chat logs or reading thousands of lines of generated code, you get a visual canvas to inspect, refine, and discuss your product structure directly with your agent.

![The Bookshelf demo: five object columns — Book, Author, Member, Loan, Hold — with colour-coded attributes, relationships, actions and states](docs/canvas.png)

## Core Concepts

Object Map describes your product as the set of things it is made of, laid out side by side so you can read the whole product at once. Each object is one thing your users recognize, and carries five kinds of structure:

- **Object**: A core noun in your product that users recognize and interact with (e.g., Book, Author, Member).
- **Attributes**: Properties that describe the object (e.g., Title, ISBN, Publish Date).
- **Relationships**: Directional connections between objects (e.g., a Book is Written by an Author).
- **Actions**: Operations users can perform on or with the object (e.g., Borrow, Renew, Archive).
- **States**: Lifecycle stages an object moves through (e.g., Available, On Loan, Overdue).

Concepts present in your brief but not yet implemented in code remain on the map as unbuilt items, allowing you to design the product before writing code.

## What the Map Is For

- **OOUX without the workshop.** Object-oriented UX starts with a workshop: a room, sticky notes, one pass at the object model. An agent changes the product faster than a workshop can repeat. This builds the model from the repository instead, and keeps it there.
- **What the product is, not what the code says.** Implementation churns. The set of things your product is made of changes slowly. The map holds that set, so you can check what exists without reading the code that builds it.
- **Structural mistakes are visible.** The map shows one concept stored under two names, an object nobody can act on, a relationship whose label says nothing. A diff does not show these. Columns do.
- **One set of names for you and your agent.** You both work from the same objects and the same words for them. What you correct on the map is still correct in the next session.
- **Objects you have not built yet.** An object you described but never implemented stays on the map, marked as unbuilt. It is not lost between conversations.

## Quick Start

### 1. Install

Requires Node 22.12 or newer. Extract the skill anywhere, then point the installer at your repository:

```bash
curl -L https://github.com/MetaHeavies/object-map/releases/latest/download/object-map-skill.tgz | tar xz
node object-map/scripts/install.mjs /absolute/path/to/your/repository
```

### 2. Launch the Canvas

Start the local server:

```bash
cd /absolute/path/to/your/repository
node .agents/skills/object-map/scripts/serve.mjs
```

### 3. Prompt Your Agent

Once installed, share this prompt with your agent:

> Run Object Map on this repository. Inspect the implementation, populate the map, and report any missing concepts or ambiguities.

For a new project without existing code, point the agent at your spec or product brief. The agent will map your intended architecture side-by-side with your code as you build.

## System Requirements & Integration

- **Language Agnostic**: Your agent reads your code; Object Map never parses or runs it. Your product can be written in Python, Ruby, Go, PHP, TypeScript, or any other stack.
- **Node Runtime**: Node is only required locally on your machine to run the CLI and canvas server. It adds no dependencies to your project's `package.json` or build process.
- **Agent Support**: Configures hooks automatically for Claude Code and Codex (use `--hosts=claude` or `--hosts=codex` to specify one). For other agents, standard instructions are added to `AGENTS.md`.

## What Gets Added to Your Project

Installation adds local configuration and agent instructions without altering your application code:

| Path | Purpose |
| --- | --- |
| `.object-map/` | Saved map data, canvas layout, and local settings |
| `.agents/skills/object-map/` | Skill instructions, helper scripts, and canvas interface |
| `.claude/skills/object-map/` | Claude Code skill integration |
| `AGENTS.md`, `CLAUDE.md` | Instruction blocks appended for agent context |
| `.claude/settings.json`, `.codex/hooks.json` | Hooks for automatic map synchronization |

To uninstall, delete these directories and remove the marked blocks from your markdown and settings files.

## Demo Mode

To test Object Map without modifying a project:

```bash
node .agents/skills/object-map/scripts/serve.mjs --demo
```

This launches a pre-populated example library project ("Bookshelf") in a temporary directory so you can explore the canvas risk-free.

## Canvas Controls

- **Focus View**: Click an object header to isolate its connections. Click the background or press Escape to reset.
- **Edit & Rename**: Double-click any label or press F2 to edit.
- **Add Elements**: Click + at the bottom of a column to add attributes, relationships, actions, or states. To draft a whole object before building it, ask your agent to add it — it stays on the map as unbuilt until code exists.
- **Refactor**: Promote an attribute into its own object or demote an object back to an attribute using the item menu.
- **Shortcuts**: Cmd/Ctrl + Z (Undo), Shift + Cmd/Ctrl + Z (Redo), F (Fit map to screen), Cmd/Ctrl + K (Search objects).

Edits save automatically to `.object-map/map.json`. The canvas updates live when your coding agent modifies the structure.

## How It Stays Current

The map is a plain JSON file in your repository, `.object-map/map.json`, which your agent reads and writes through the installed skill. Keeping it accurate is not left to the agent's memory. Installation registers three **hooks** — short commands your agent host runs by itself at fixed points in a session, configured in `.claude/settings.json` and `.codex/hooks.json`:

- **SessionStart**: Fires when a session begins. Puts the current map in front of your agent, so it starts from your model and your names instead of re-deriving them from the code.
- **UserPromptSubmit**: Fires on every prompt you send. Re-supplies the map so it stays in context through a long session.
- **Stop**: Fires when your agent finishes a turn. It compares what moved: if implementation files changed and the map did not, it names those files and asks for the model to be reconciled. One reminder at most, and silence when nothing changed.

You and your agent can both be working at once. Saves are revision-checked, so a write from a stale copy is rejected rather than overwriting newer work.

Hooks keep the map in the conversation. They cannot prove it is correct — that judgement is what the canvas is for, and it is why the install prompt asks your agent to report what it was unsure about.

## Development

To contribute to Object Map or build from source:

```bash
npm install
npm run dev
```

The dev server runs on http://127.0.0.1:5173. To test against the included fixture project, run `npm run atlas` (http://127.0.0.1:4318).

### Testing & Packaging

```bash
npm test
npm run build
npm run package:skill
```

## License

MIT. See [LICENSE](LICENSE).
