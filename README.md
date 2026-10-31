# Snippd

A local-first snippet manager for saving, organizing, searching, and reusing code snippets. Snippd provides an interactive CLI and a local web UI, stores its library in SQLite, and can optionally find snippets by meaning with local Ollama embeddings.

---

## Features

- **Save snippets** from your configured editor or directly from files, with extensions and tags
- **Search snippets** by title and content, or narrow by extension, tags, or containers
- **Find recently edited snippets** ordered by last edit, with text matching across title, tags, content, and extension
- **Organize snippets** with tags and named containers
- **Manage snippets interactively** — copy, view, edit, and delete from the CLI
- **Search by meaning** with optional local Ollama embeddings and sqlite-vec
- **Browse and manage your library** in a local web UI
- **Back up and merge** your library between devices
- **Local-first storage** — snippets and configuration are stored on your machine under `~/.snippd/`

---

## Requirements

- **Node.js** 18 or newer
- A GUI/interactive editor, a terminal/TUI editor, or both for saving and editing snippets
- Ollama and a local embedding model only if you want semantic search

---

## Installation

### Install from the npm registry

Snippd is published as the `snippd` package. Install it globally with your preferred package manager:

```sh
npm install --global snippd
```

```sh
# Yarn Classic (v1)
yarn global add snippd
```

```sh
pnpm add --global snippd
```

Yarn 2 and newer do not support global installs. If you use a newer Yarn release, use npm or pnpm for a global installation.

### Install from source (development)

```bash
git clone <repository-url>
cd Snippd
npm install
npm run dev -- <command>
```

For example, `npm run dev -- doctor` runs the CLI from the source checkout.

---

## First-time setup

### 1. Initialize configuration

Snippd opens snippets in an external editor. Configure it once in `~/.snippd/config.json`:

```bash
snippd config init
```

### 2. Configure your editor

Set an editor path directly:

```powershell
snippd config set SNIPPD_GUI "C:\Program Files\Microsoft VS Code\Code.exe --wait"
snippd config set SNIPPD_TUI "nvim --wait"
snippd config set CURRENT_EDITOR SNIPPD_GUI
```

Or use the interactive editor manager:

```sh
snippd config editor
```

**Windows:** For GUI editors, use the full path to the editor executable (usually a `.exe`), not a `cmd` or `.bat` shim. Snippd starts editor processes directly rather than through a shell, so shims may not launch. Quote paths containing spaces and include `--wait` for GUI editors so Snippd waits until you close the snippet.

The first configured editor mode is selected automatically. Set `CURRENT_EDITOR` to `SNIPPD_GUI` or `SNIPPD_TUI` to switch modes. Use `snippd config show` to inspect the effective configuration.

### 3. Check your setup

```bash
snippd doctor
```

`doctor` reports the config file, effective editor, Ollama status, embedding model, and embedding-index coverage.

### 4. Save your first snippet

```sh
snippd save "parse-data.ts" -t node,csv
```

Snippd opens your configured editor; enter the code, then save and close it. Titles must be unique. You can also save existing files with `snippd save --file <paths...>`.

### 5. Search your snippets

```sh
snippd search "csv parser"
```

Search checks snippet titles and code by default. Use `--title`, `--content`, `--ext`, or `--tags` to choose a field, or `--container` to find containers by name or description.

### 6. Organize snippets with containers

Containers group snippets without duplicating them:

```sh
snippd container create "data-tools" -d "CSV and data utilities"
snippd container add "data-tools" "parse-data"
```

Use the snippet's saved title when adding it to a container; the extension is not required.

### 7. Optional: set up AI search

Install and start [Ollama](https://ollama.com/download), then pull an embedding-capable model:

```sh
ollama pull <model-name>
snippd config set OLLAMA_MODEL <model-name>
snippd ai reindex
snippd ai "code that parses CSV rows"
```

`OLLAMA_API_URL` defaults to `http://localhost:11434`; set it only if your Ollama server uses a different address. `OLLAMA_MODEL` must name an installed embedding model. Ollama must be running when generating embeddings or searching.

### 8. Open the web UI

```sh
snippd ui
```

Open the local address printed in the terminal (by default `http://127.0.0.1:8000`). Keep the command running while using the UI; press Ctrl+C to stop the server. The UI and CLI share the same local database.

In the web UI's Search page, select **Containers** to show matching containers instead of snippets.

---

## Configuration

The configuration file and SQLite database are stored under `~/.snippd/`.

| Config key | Purpose |
|------------|---------|
| `SNIPPD_GUI` | Command or executable path for a GUI/interactive editor. GUI editors should use `--wait`. |
| `SNIPPD_TUI` | Command for a terminal editor such as `nvim`, `vim`, or `nano`. |
| `CURRENT_EDITOR` | Active mode: `SNIPPD_GUI` or `SNIPPD_TUI`. The first configured mode is selected automatically. |
| `EDITORS` | Saved editor aliases managed with `snippd config editor`. |
| `OLLAMA_API_URL` | Ollama server URL; defaults to `http://localhost:11434`. |
| `OLLAMA_MODEL` | Installed embedding model used by AI search. |

Use `snippd config init`, `snippd config show`, `snippd config set <key> <value>`, `snippd config editor`, and `snippd config setup` to manage configuration.

On Windows, configure the full path to a GUI editor executable (usually a `.exe`), rather than a `.cmd` or `.bat` shim. Snippd starts editor processes directly, not through a shell, so shims may not launch. Quote paths containing spaces and include `--wait` so Snippd waits until you close the editor.

---

## Commands

### Snippet commands

| Command | Description |
|---------|-------------|
| `save [title]` | Save a snippet in your editor, or save each file as a separate snippet with `--file` |
| `search <query>` | Search snippet titles/content or use `--container` to find containers |
| `recent` | Browse snippets ordered by last edit, with optional text matching |
| `list` | Browse snippets with optional extension, tag, and text filters |
| `view [title]` | Open a snippet in the configured editor |
| `edit [title]` | Edit snippet content or metadata |
| `copy [title]` | Copy snippet content to the clipboard |
| `delete [title]` | Delete a snippet, or use the interactive picker |
| `exts` | Browse snippets by file extension |
| `tags` | List, view, rename, or delete tags |
| `container` | Create, search, rename, update, and manage snippet containers |
| `ai <query>` | Find snippets by meaning using local Ollama embeddings |
| `ai choose` / `ai reindex` | Choose an embedding model or rebuild the embedding index |
| `export [path]` / `import <file>` | Back up the library or merge a backup into it |
| `config` | Configure editor and Ollama settings |
| `doctor` | Check editor, Ollama, model, and embedding-index setup |
| `ui` | Start the local web dashboard |

### `save` options

| Option | Description |
|--------|-------------|
| `-e, --ext <ext>` | File extension for syntax highlighting (default: `txt`). Ignored with `--file`. |
| `-t, --tags <tags...>` | One or more tags to attach to the snippet. With `--file`, the same tags apply to every file. |
| `-f, --file <paths...>` | Save each file as its own snippet. Relative paths are resolved from the current directory. The title is the filename without its extension, and the extension comes from the filename. Up to 200 files. |

```bash
snippd save docker-compose -e yml -t devops docker
snippd save --file ./src/parse-data.ts ../notes/uuid.ts -t util
```

With `--file`, each file becomes a snippet named after its filename; its extension is inferred from that filename, and any supplied tags apply to every saved file. Relative paths are resolved from the current directory. At most 200 files can be saved in one invocation.

### `search` options

| Option | Description |
|--------|-------------|
| `--title` | Search snippet titles only |
| `--content` | Search snippet content only |
| `--ext` | Search extensions only |
| `--tags` | Search tags only |
| `--container` | Search container names and descriptions; without snippet field filters, select a matching container to browse its snippets |

```sh
snippd search "retry logic"
snippd search "ts" --ext
snippd search "data-tools" --container
snippd search "api" --container --content
```

### `list` options

| Option | Description |
|--------|-------------|
| `-e, --ext <ext...>` | Filter by one or more extensions |
| `-t, --tags <tags...>` | Filter by one or more tags |
| `-s, --search <query>` | Match snippet titles and content |

```bash
snippd list --ext ts js --tags react
```

### `recent` options

| Option | Description |
|--------|-------------|
| `-l, --limit [number]` | Maximum snippets to show (default: `10`) |
| `-s, --search <query>` | Match title, tags, content, or extension |

```bash
snippd recent --limit 10
```

Recent results are ordered by `updated_at` (last edited), newest first. Text matching does not use embeddings.

### `exts` options

| Option | Description |
|--------|-------------|
| `-e, --ext <ext...>` | Jump directly to snippets for specific extensions |

```bash
snippd exts
snippd exts --ext ts py
```

### Containers and tags

Containers group related snippets without duplicating them. The `container` command supports:

```sh
snippd container create "data-tools" -d "CSV and data utilities"
snippd container add "data-tools" "parse-data"
snippd container show --search data
snippd container remove "data-tools" "parse-data"
snippd container rename "data-tools" "import-tools"
snippd container update "import-tools" -d "Import and parsing helpers"
snippd container del "import-tools"
```

Use the snippet's saved title when adding or removing it from a container; the extension is not required. `container show --search` matches container names and descriptions.

The `tags` command opens an interactive tag list. You can also use `snippd tags show`, `snippd tags view <tag>`, `snippd tags rename <old-name> <new-name>`, and `snippd tags delete <tag>`.

### `ai` (semantic search)

Requires [Ollama](https://ollama.com/download) running locally and an embedding model:

```bash
ollama pull <model-name>
snippd config set OLLAMA_MODEL <model-name>
snippd ai reindex
snippd ai "debounce helper for typescript"
snippd ai "retry with backoff" --limit 5
```

Use `snippd ai choose` to select an installed embedding model interactively. `snippd ai reindex` generates or rebuilds embeddings for the current snippets and model. Embeddings are not included in exported backups; reindex after importing if you use AI search.

### Interactive snippet actions

When you pick a snippet from commands such as `list`, `search`, `ai`, `recent`, or `exts`, you can:

| Action | Description |
|--------|-------------|
| **Copy to clipboard** | Copy snippet body to the system clipboard |
| **View Snippet** | Open snippet in your editor without saving changes |
| **Edit Snippet** | Open in editor and save changes back to the database |
| **Delete Snippet** | Remove the snippet permanently |
| **Go Back** | Return to the previous menu (e.g. extension picker) |
| **Cancel** | Exit without further action |

---

### Config commands

| Command | Description |
|---------|-------------|
| `config show` | Show config file path, effective editor, and active settings |
| `config init` | Create `~/.snippd/config.json` with default values |
| `config set <key> <value>` | Set editor or Ollama config values |
| `config editor` | Add, activate, or remove saved editor aliases |
| `config reset` | Clear configuration values |
| `config setup` | Print editor and Ollama setup instructions |

```bash
snippd config init
snippd config set SNIPPD_GUI '"C:\Program Files\Microsoft VS Code\Code.exe" --wait'
snippd config set SNIPPD_TUI nvim
snippd config set CURRENT_EDITOR SNIPPD_GUI
snippd config show
snippd config setup
```

---

### Utility commands

| Command | Description |
|---------|-------------|
| `doctor` | Check editor config, Ollama, sqlite-vec, and embedding index coverage. |

```bash
snippd doctor
```
## Development

```bash
# Install dependencies
npm install

# Run the CLI
npm run dev -- <command>

# Typecheck
npm run typecheck

# Build distributable
npm run build
```

The development CLI can be invoked with `npm run dev -- <command>`. Configuration and library data are stored under `~/.snippd/`.

## Backup and restore

`snippd export [path]` creates a portable SQLite database backup. If no path is provided, Snippd writes a dated backup under `~/.snippd/`.

`snippd import <file>` merges a Snippd backup into the current library:

- New snippet titles are inserted.
- For an existing title, the newer `updated_at` version supplies the snippet content.
- Tags and container relationships are merged.
- The embedding index is not imported; run `snippd ai reindex` to rebuild it.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `LaunchEditorError: spawn ... ENOENT` | On Windows, use the full editor `.exe` path instead of a `.cmd` or `.bat` shim |
| GUI editor opens but Snippd continues before it closes | Add `--wait` to the GUI editor command |
| Config not picked up | Run `snippd config show` and `snippd doctor`; check the configured executable path |
| Duplicate title error | Pick a different title or delete the existing snippet first |
| Empty snippet rejected | Snippd validates content is non-empty before saving |
| AI search cannot connect | Start Ollama and check `OLLAMA_API_URL` and `OLLAMA_MODEL` with `snippd doctor` |

Run `snippd doctor` for a diagnostic summary.

---

## License

ISC
