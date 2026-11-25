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
  Team API headers, release asset names, log names, and API or analytics hosts.

#### Text for the agents (do not edit it by hand)

The agents must call the app MyBot, but leave "OpenBot" as upstream wrote it in the text that the
agents read: system prompt (`developer-instructions.ts`), tool descriptions and results, turn notes
(`delivery-content.ts`), messaging prompts, `setting-links.ts` and `resources/managed-skills/**`.
Some of it is a marker that the code reads back from stored prompts (`HANDOFF_START`,
`TEAMMATE_HEADER`), and editing hundreds of lines would conflict on every sync.

`src/backend/mybot-brand.ts` renames it on the way to the provider instead:
- `brandProviderDrivers` (called once in `provider-drivers.ts`) makes every provider client rename
  each `request`, `respond` and `notify` that it sends.
- The local MCP bridge (`local-mcp-bridge.ts`) renames the server instructions, tool descriptions
  and tool results.
- `ManagedSkillService` (`src/main/managed-skill-service.ts`) renames the skills that it writes.
- `mybotBrand` keeps identifiers, paths (`~/OpenBot/...`), file and asset names (`OpenBot.exe`,
  `OpenBot-<version>-...`), headers (`X-OpenBot-...`) and the lowercase `openbot.*` tool names. It
  makes "an OpenBot" into "a MyBot", and it leaves `OPENBOT_COMMIT_TRAILER` exact.

On each sync:
- Check that these three hooks are still in place.
- When upstream adds a new way to send text to a model, route it through `mybotBrand` or
  `mybotBrandDeep`. Examples: a provider client that skips the drivers, a new MCP server of the app,
  a prompt written to a file, or a side model call.
- Run `bunx vitest run src/backend/mybot-brand.test.ts`.

### Step 2: hide links, purchases, prompts and ads

Keep these hidden. Look for new upstream UI of the same kind and hide it too:
- The Help menu shows only What's new: no changelog, guides, Discord, problem report or feedback links.
  There is also no changelog button in the What's new dialog.
- The rail logo is not a link.
- The GitHub star prompt and the social follow prompt are off.
- Upstream promotional cards and dialogs are removed completely, not only dismissed. They are not
  rendered at all. This includes the sidebar "MyBot for mobile" card (`SidebarMobileAppCard`) and the
  "Pull up a chair." community card (`SidebarCommunityCard`, Discord and X) in `WorkspaceSidebar.tsx`
  and `WebWorkspace.tsx`. When upstream adds a new announcement, promo, community or "get the app"
  card, popup or dialog, remove its render site in the same way and leave a `MyBot:` comment.
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

### Webhook server (MyBot's own)

The app itself takes the deliveries of webhook triggers. Upstream's path (Signal relay at
`signal.openbot.run`, routes registered with the upstream account service) needs sign-in, which MyBot
does not have. Keep it this way on each sync:
- `LocalWebhookServer` (`src/main/local-webhook-server.ts`) is the `HostWebhookRelay` in
  `application-services.ts`, in place of upstream's `WebhookRelay`. `webhook-relay.ts` stays unused and
  unchanged.
- The signature headers are `x-mybot-timestamp`, `x-mybot-delivery-id` and `x-mybot-signature`
  (`src/backend/mybot-webhook-headers.ts`), plus the Standard Webhooks and Svix headers. The listener
  refuses `x-openbot-*`. The agent tool (`webhook-routine-tool.ts`) and the curl example
  (`RoutineWebhookTrigger.tsx`) name the MyBot headers and `MYBOT_WEBHOOK_SECRET`. Leave the
  `x-openbot-*` constants in `@openbot/contracts/signal-protocol/webhook-route` alone: the relay reads them.
- The settings are in `<userData>/mybot-webhook-server.json`. The panel is in Server settings > Routines
  (`ServerWebhookServerPanel.tsx`), through the `webhookServer` IPC group (`ipc-webhook-server.ts`).
- The webhook trigger is offered in `workflow-model.ts` and `AgentRoutinesSettings.tsx`. When upstream
  changes how a route gets its URL or how a delivery reaches `HostEventsService.receive`, update the
  listener. When upstream adds a new header set, add it to the listener too.
- Run `bun scripts/local-webhook-e2e.ts` (real HTTP against the listener and a real workflow; it writes
  `.openbot-build/local-webhook-e2e/report.json`) and `bunx vitest run src/main/ipc/webhook-server-settings.test.ts`
  (the renderer-to-main payload check).

### Folders and install names (already MyBot)

- `productName` is `MyBot` in `package.json` and `electron-builder.yml`. This sets the install folder,
  `MyBot.exe`/`MyBot.app` and the release file names. The Linux server path is `/opt/MyBot`.
- MyBot installs and runs side by side with OpenBot. Its IDs are MyBot IDs on every platform:
  - `appId` in `electron-builder.yml` is `app.mybot.desktop`: the macOS bundle ID, the Windows
    AppUserModelId (`src/main/index.ts`) and the NSIS registry GUID, so the MyBot installer does not
    uninstall OpenBot. `build/installer.nsh` (`myBotAdoptOpenBotIdInstall`) takes over the MyBot
    installs registered under the old ID; that old ID stays only there.
  - The macOS IDs that derive from it are `app.mybot.*`: `PACKAGED_BUNDLE_IDENTIFIER`, the ShipIt label,
    the host LaunchAgent/LaunchDaemon plists and labels, and the host package and code signing IDs.
  - Linux: `desktopName` is `mybot.desktop`, and `linux-desktop-entry.ts` writes `mybot.desktop`
    with `StartupWMClass=mybot` and removes the `openbot.desktop` of an earlier MyBot build. The
    autostart entry is `mybot.desktop`.
  - When upstream adds a new `app.openbot.*` ID or an `openbot.desktop` file name, use `app.mybot.*`
    or `mybot.desktop`. The Linux executable stays `openbot` (`/opt/MyBot/app/openbot`, the
    AppArmor profiles and the hosting scripts use it), and so does the `openbot` server command.
- The data folders are `<appData>/MyBot` (userData) and `~/MyBot` (agent workspaces), separate from
  OpenBot. `src/main/app-folders.ts` never moves or reads the `OpenBot` folders. It only finishes a
  path rewrite that an earlier build left pending.
- The local account is `local@mybot.local` (`LOCAL_ACCOUNT_USER` in `central-auth-manager.ts`).
- The only link scheme is `mybot://`. Nothing uses `openbot://`: not the system registration
  (`electron-builder.yml`, `build/installer.nsh`, `linux-desktop-entry.ts`, `setAsDefaultProtocolClient`),
  not the parsers (`deep-link-router.ts`, the `*-links.ts` and `mobile-connect.ts` in `@openbot/contracts`,
  the mobile app), and not the links the code makes (invitations, MCP OAuth return, live activity,
  company sign-in). Replace each new upstream `openbot://`, `"openbot:"` protocol check,
  `x-scheme-handler/openbot` or `setAsDefaultProtocolClient("openbot")` with `mybot`
  (`APP_LINK_SCHEME`). The `"openbot:"` prefixes that are not a link scheme (vault logins, Discord
  custom IDs, performance marks, local storage keys) stay.
- When upstream adds a new literal `"OpenBot"` folder path, or a `/opt/OpenBot` or `.config/OpenBot`
  path, use `appWorkspaceRoot()` or `appDataFolderName()` from `app-folders.ts`, or the `MyBot` path.
- Keep the `~/OpenBot/...` prefixes in `workspace-paths.ts` and `attachment-gateway.ts`. Older
  messages use them.
- Do not change the upstream release asset names (`OpenBot-<version>-...`) in the hosting scripts.
  They name files of the upstream releases.

### Do not rename

Each of these is a data or wire contract. A rename silently breaks data, links or connections:
- `openbot.db`, and the file names in `userData` (`openbot-*.json`)
- Team API headers and wire names
- `@openbot/*` workspace packages: renaming them gives a merge conflict on every upstream sync
- service hosts: `api`, `signal` and `analytics` under `.openbot.run`

### Check

After a sync, run:
- `bun run typecheck:node`
- `bun run typecheck:renderer`
- `bun run i18n:check`
- `bunx biome check` on the changed files
- `bunx vitest run src/backend/mybot-brand.test.ts`
- `graphify update .`
