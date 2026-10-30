# Snippd

A terminal-first snippet manager for saving, searching, and reusing code snippets without leaving the command line. Snippd stores snippets locally in SQLite, supports tags and full-text search, and opens your preferred editor for creating and editing snippet content.

---

## Features

- **Save snippets** with a title, file extension, and optional tags
- **Full-text search** across titles, code bodies, and extensions (SQLite FTS5)
- **Filter and browse** by extension or tag
- **Interactive snippet picker** — copy, view, edit, or delete from the terminal
- **Persistent editor config** via `~/.snippd/config.json`
- **Local-first storage** — all data stays on your machine under `~/.snippd/`

---

## Requirements

- **Node.js** 18+ (recommended)
- Separate GUI/interactive and terminal/TUI editor configuration for `save` and edit flows
- **Windows / macOS / Linux** supported

---

## Installation

### Clone and install dependencies

```bash
git clone <your-repo-url>
cd Snippd
npm install
```

### Run locally (development)

```bash
npm run dev -- <command>
```

Examples:

```bash
npm run dev -- save my-snippet -e ts
npm run dev -- save --file ./src/debounce.ts ../notes/uuid.ts
npm run dev -- list
npm run dev -- search react
```

> **Note:** A global `snippd` binary is not yet published. Use `npm run dev --` or link the project globally with `npm link` during development.

---

## First-time setup

### 1. Initialize editor config

Snippd opens snippets in an external editor. Configure it once in `~/.snippd/config.json`:

```bash
npm run dev -- config init
```

### 2. Set your editor

Set the JSON keys directly:

```powershell
npm run dev -- config set SNIPPD_GUI '"C:\Program Files\Microsoft VS Code\Code.exe" --wait'
npm run dev -- config set SNIPPD_TUI 'nvim'
npm run dev -- config set CURRENT_EDITOR SNIPPD_GUI
```

Or edit `~/.snippd/config.json` directly:

```json
{
  "SNIPPD_GUI": "\"C:\\Program Files\\Microsoft VS Code\\Code.exe\" --wait",
  "SNIPPD_TUI": "nvim",
  "CURRENT_EDITOR": "SNIPPD_GUI"
}
```

### 3. Verify setup

```bash
npm run dev -- doctor
npm run dev -- config show
```

---

## Editor configuration

### Config file location

| File | Purpose |
|------|---------|
| `~/.snippd/config.json` | Persistent editor settings |
| `~/.snippd/snippd.db` | Snippet database (SQLite) |

### Config fields

| JSON field | Maps to | Description |
|------------|---------|-------------|
| `SNIPPD_GUI` | GUI/interactive editor | VS Code, Cursor, or Neovim; GUI commands should use `--wait` |
| `SNIPPD_TUI` | Terminal/TUI editor | Vim, Neovim, Nano, or another terminal editor |
| `CURRENT_EDITOR` | Active editor mode | `SNIPPD_GUI` or `SNIPPD_TUI`; selects which configured editor Snippd uses |
| `OLLAMA_API_URL` | Ollama base URL | Defaults to `http://localhost:11434` when unset |
| `OLLAMA_MODEL` | Embedding model name | Required for `ai` search (e.g. `nomic-embed-text`) |

Snippd reads these values only from `~/.snippd/config.json`. `CURRENT_EDITOR` starts empty; setting the first `SNIPPD_GUI` or `SNIPPD_TUI` path selects that mode automatically. You can change the active mode at any time by setting `CURRENT_EDITOR` to `SNIPPD_GUI` or `SNIPPD_TUI`. For older config files without `CURRENT_EDITOR`, Snippd keeps the previous behavior of preferring a configured GUI editor, then a TUI editor.

### Important notes (Windows)

- Do **not** use PowerShell's `&` operator inside the config value — store the command string only.
- GUI editors **must include `--wait`** or Snippd will continue before you finish editing.
- Paths with spaces (e.g. `Microsoft VS Code`) must be quoted inside the JSON string.
- Short names like `code` often fail because Node cannot spawn `.cmd` shims directly — use the `.exe` path.

---

## Commands

### Snippet commands

| Command | Description |
|---------|-------------|
| `save [title]` | Save a new snippet in your editor, or one snippet per file with `--file` |
| `search <query>` | Full-text search snippets by title, code, or extension |
| `ai <query>` | Semantic search via local Ollama embeddings + sqlite-vec |
| `ai reindex` | Rebuild the embedding index (required after model changes) |
| `list` | List all snippets with an interactive picker |
| `delete [title]` | Delete a snippet by exact title, or list all if no title given |
| `recent` | Show snippets by last-edited time; search title, tags, content, or extension (read-only table) |
| `exts` | Browse snippets grouped by file extension |

#### `save` options

| Option | Description |
|--------|-------------|
| `-e, --ext <ext>` | File extension for syntax highlighting (default: `txt`). Ignored with `--file`. |
| `-t, --tags <tags...>` | One or more tags to attach to the snippet. With `--file`, the same tags apply to every file. |
| `-f, --file <paths...>` | Save each file as its own snippet. Relative paths are resolved from the current directory. The title is the filename without its extension, and the extension comes from the filename. Up to 200 files. |

```bash
npm run dev -- save docker-compose -e yml -t devops docker
npm run dev -- save --file ./src/debounce.ts ../notes/uuid.ts -t util
```

#### `list` options

| Option | Description |
|--------|-------------|
| `-l, --ext <ext...>` | Filter by one or more extensions |
| `-t, --tags <tags...>` | Filter by one or more tags |

```bash
npm run dev -- list --ext ts js --tags react
```

#### `recent` options

| Option | Description |
|--------|-------------|
| `--limit [number]` | Max snippets to show (default: `30`) |

```bash
npm run dev -- recent --limit 10
```

#### `exts` options

| Option | Description |
|--------|-------------|
| `-l, --ext <ext...>` | Jump directly to snippets for specific extensions |

```bash
npm run dev -- exts
npm run dev -- exts --ext ts py
```

---

#### `ai` (semantic search)

Requires [Ollama](https://ollama.com/download) running locally and an embedding model:

```bash
ollama pull nomic-embed-text
npm run dev -- config set OLLAMA_MODEL nomic-embed-text
npm run dev -- ai reindex
npm run dev -- ai "debounce helper for typescript"
npm run dev -- ai "retry with backoff" --limit 5
```

Vectors are stored in a sqlite-vec `vec0` table (`float32`). Import/export merges snippet data only — run `ai reindex` after importing a backup.

### Interactive snippet actions

When you pick a snippet from `list`, `search`, `ai`, or `exts`, you can:

| Action | Description |
|--------|-------------|
| **Copy to clipboard** | Copy snippet body to the system clipboard |
| **View Snippet** | Open snippet in your editor (read-only in practice) |
| **Edit Snippet** | Open in editor and save changes back to the database |
| **Delete Snippet** | Remove the snippet permanently |
| **Go Back** | Return to the previous menu (e.g. extension picker) |
| **Cancel** | Exit without further action |

---

### Config commands

| Command | Description |
|---------|-------------|
| `config show` | Show config file path, effective editor, and active settings |
| `config init` | Create `~/.snippd/config.json` with a default template |
| `config set <key> <value>` | Set `CURRENT_EDITOR`, `SNIPPD_GUI`, `SNIPPD_TUI`, `OLLAMA_API_URL`, or `OLLAMA_MODEL` |
| `config setup` | Print editor setup instructions |

```bash
npm run dev -- config init
npm run dev -- config set SNIPPD_GUI '"C:\Program Files\Microsoft VS Code\Code.exe" --wait'
npm run dev -- config set SNIPPD_TUI 'nvim'
npm run dev -- config set CURRENT_EDITOR SNIPPD_GUI
npm run dev -- config show
npm run dev -- config setup
```

---

### Utility commands

| Command | Description |
|---------|-------------|
| `doctor` | Check editor config, Ollama, sqlite-vec, and embedding index coverage. |

```bash
npm run dev -- doctor
```

---

## Data model

Each snippet has:

| Field | Description |
|-------|-------------|
| `id` | Auto-increment primary key |
| `title` | Unique human-readable name |
| `snippet` | Code/content body |
| `extension` | Language extension (e.g. `ts`, `py`, `sh`) |
| `tags` | Optional labels (many-to-many) |
| `created_at` / `updated_at` | Timestamps |

Titles must be **unique**. Duplicate titles on `save` will error.

---

## Project structure

```
Snippd/
├── db/
│   ├── connection.ts      # SQLite connection (~/.snippd/snippd.db)
│   ├── schema.ts          # Tables, FTS5 index, triggers
│   └── queries/           # Prepared statements (snippets, tags)
├── src/
│   ├── index.ts           # CLI entry point
│   ├── commands/          # Commander command definitions
│   ├── config/            # JSON editor configuration
│   ├── types/             # Shared TypeScript types
│   └── utils/             # Editor, table rendering, helpers
└── package.json
```

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js (ES modules, TypeScript) |
| CLI | Commander |
| Prompts | @inquirer/prompts |
| Editor integration | @inquirer/external-editor |
| Database | better-sqlite3 + FTS5 |
| Styling | chalk |
| Clipboard | clipboardy |

---

## Development

```bash
# Install dependencies
npm install

# Run the CLI
npm run dev -- <command>

# Typecheck (requires tsc)
npx tsc --noEmit
```

Editor settings are stored only in `~/.snippd/config.json` under `SNIPPD_GUI`, `SNIPPD_TUI`, and `CURRENT_EDITOR`.

---

## Known limitations

- **Delete by title only** — must match the exact title string; no interactive delete flow when title is omitted (lists only).
- **Export / import** — `snippd export [file]` backups the DB; `snippd import <file>` **merges** into the live DB (insert new titles, newer `updated_at` wins, tags unioned).
- **No global install script yet** — use `npm run dev --` or `npm link`.
- **Web UI planned** — `list` mentions a future UI; not implemented yet.
- **Windows editor setup** requires extra care (full `.exe` path, `--wait` flag).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `LaunchEditorError: spawn ... ENOENT` | Use full `.exe` path on Windows; avoid `code` CLI shims |
| Editor opens but Snippd returns immediately | Add `--wait` to your editor command |
| Config not picked up | Run `config show`; ensure `config.json` exists and paths are valid JSON |
| Duplicate title error | Pick a different title or delete the existing snippet first |
| Empty snippet rejected | Snippd validates content is non-empty before saving |

Run `doctor` for a quick diagnostic summary.

---

## License

ISC
