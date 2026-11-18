## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

## MyBot fork: rules for every upstream sync

This repository is a fork of `nightly-labs/openbot`, shipped as **MyBot**. Each time you bring code
from the upstream fork into this repository (merge, rebase, cherry-pick or a sync PR), do these
two steps on the incoming code **before** you merge it into `main`:

1. Thay đổi tên thương hiệu "OpenBot" thành "MyBot".
2. Ẩn những đường link dẫn đến "https://github.com/nightly-labs/openbot" hoặc "https://openbot.run/"
   hoặc pricing, mua bán sub, popup vote hoặc quảng cáo.

Do the sync on a branch, never directly on `main`. Every fork change has a `MyBot:` comment. Run
`rg -n "MyBot:"` to find them, and check that each one is still in place after the merge.

### Step 1: brand name

- Change user-visible text only:
  - every locale in `packages/i18n/src/messages/**`
  - the What's new notes in `src/renderer/src/features/updates/whats-new*`
  - HTML `<title>`s, notification titles and window titles
  - the visible names in `electron-builder.yml`: shortcut, uninstall name, DMG title, macOS usage descriptions
- Replace `OpenBot` only where no letter, digit, `_` or `@` comes before it. This leaves keys such as
  `island.action.answerInOpenBot` unchanged.
- Delete the keys that the hidden UI no longer uses from all locales, then run `bun run i18n:check`.
- Do not rename these (see "Do not rename" below): identifiers, `@openbot/*` packages, `openbot.db`,
  `openbot://`, Team API headers, release asset names, log names, and API or analytics hosts.

### Step 2: hide links, purchases, prompts and ads

Keep these hidden. Look for new upstream UI of the same kind and hide it too:
- The Help menu shows only What's new: no changelog, guides, Discord, problem report or feedback links.
  There is also no changelog button in the What's new dialog.
- The rail logo is not a link.
- The GitHub star prompt and the social follow prompt are off.
- Billing: the Settings tab, plans, license and Stripe checkout are hidden. `hostedServersAvailable` is
  always `false`, so the hosted pricing page, the "See plans" upsells and the storage offer never show.
- The onboarding has no Terms/Privacy notice.
- The Slack and Discord connectors are not in `connector-registry.ts`. They use the upstream `@OpenBot`
  apps.
- Startup and recovery dialogs have no download, guide or previous-release links.
- Analytics and failure reports to `analytics.openbot.run` are off:
  - `analyticsEnabled` in `src/main/application-services.ts`
  - `shouldEnableDesktopAnalytics` and `configureWeb` in `src/renderer/src/analytics.ts`
  - `configureDesktopReports` in `src/renderer/src/error-reports.ts`
  - the CSP `connect-src`
  Only a development capture URL can turn them on. The app has no analytics switch in Settings and no
  analytics question in the onboarding. When upstream adds a telemetry endpoint or a new event
  sender, turn it off too.
- Automatic updates are off (`APP_UPDATES_DISABLED` in `src/main/application-services.ts` and
  `src/main/newer-database-recovery.ts`). The upstream release feed would replace MyBot.

### Folders and install names (already MyBot)

- `productName` is `MyBot` in `package.json` and `electron-builder.yml`. This sets the install folder,
  `MyBot.exe`/`MyBot.app` and the release file names. The Linux server path is `/opt/MyBot`.
- The data folders are `<appData>/MyBot` (userData) and `~/MyBot` (agent workspaces).
  `src/main/app-folders.ts` moves the `OpenBot` folders once, with one `rename`. When the move fails,
  the app keeps the old folder. After a move, it rewrites the absolute paths in `openbot.db` and in
  the local server databases, and it moves the agents' Claude Code project folders.
- When upstream adds a new literal `"OpenBot"` folder path, or a `/opt/OpenBot` or `.config/OpenBot`
  path, use `appWorkspaceRoot()` or `appDataFolderName()` from `app-folders.ts`, or the `MyBot` path.
- Keep the `~/OpenBot/...` prefixes in `workspace-paths.ts` and `attachment-gateway.ts`. Older
  messages use them.
- Do not change the upstream release asset names (`OpenBot-<version>-...`) in the hosting scripts.
  They name files of the upstream releases.

### Do not rename

Each of these is a data or wire contract. A rename silently breaks data, links or connections:
- `openbot.db`, and the file names in `userData` (`openbot-*.json`)
- `openbot://`: invitation links, MCP OAuth callbacks, and mobile connect
- Team API headers and wire names
- `@openbot/*` workspace packages: renaming them gives a merge conflict on every upstream sync
- service hosts: `api`, `signal` and `analytics` under `.openbot.run`

### Check

After a sync, run:
- `bun run typecheck:node`
- `bun run typecheck:renderer`
- `bun run i18n:check`
- `bunx biome check` on the changed files
- `graphify update .`
