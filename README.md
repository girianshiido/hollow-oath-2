# Hollow Oath II

A new, standalone single-player tactical fantasy RPG. Entirely in English, designed for portrait phones from 320 px wide, with mouse and keyboard support. The first Hollow Oath and its saves remain separate.

Play: **https://girianshiido.github.io/hollow-oath-2/**

## The game

- Four initial heroes: Vanguard, Hexweaver, Nightblade and Oathkeeper, with distinct free automatic attacks and two special abilities each.
- Recruit one of the other three heroes after wave 4. Six duos, twelve starting orders. Companions inherit the leader's level and equipment ranks.
- Exactly 32 waves of 32 enemies, including the guardian: 1,024 enemies in the campaign. Groups of one to three arrive automatically.
- A shared focus target, enemy guards and healers, visible preparations, interruptions, shields, exposure, marks and elemental weaknesses. Both heroes keep attacking while abilities recover.
- Twelve illustrated regular monster families, each with idle and attack poses; eight boss designs, each with a second form. Chapter guardians transform at half HP, changing speed, attack and armor. Intermediate wardens use the chapter's first-form illustration.
- Four original battle environments, an illustrated title screen and dedicated app icon, all in the approved vivid manga direction.
- Eight original full-length music loops, victory/defeat stingers and nine sound effects. OGG with AAC/M4A fallback for iOS. See AUDIO.md.
- Permanent gold equipment upgrades and essence ability upgrades, available at camp after retreat, defeat and chapter breaks. No forced weapon-rank damage penalty. Earned gold, essence, XP and upgrades survive defeat.
- Four optional 32-enemy sanctuary trials, first-clear relics, an endless Abyss in 32-enemy depths, and deterministic daily UTC contracts with an archive date selector. These enemies do not count toward the campaign's 1,024.
- Abyss recovery between depths is limited to 35% of maximum HP/MP. Fallen heroes can recover at a completed depth. Rewards are secured immediately; retreat preserves them. A failed depth restarts at its first group.
- Up to 24 local adventures, versioned validated saves, automatic save and JSON export/import. Matching adventure IDs require confirmation before replacement. Milestones are calculated across retained adventures.
- Installable PWA with a unique `/hollow-oath-2/` identity, iOS instructions, complete offline caching and an explicit update action. No account, tracking, remote API or mandatory CDN.

## Controls

Tap an enemy or its name to focus the duo. Tap an ability to cast it; hold or right-click to inspect it while paused. Keys 1–4 activate abilities; Space opens pause. The camp button offers voluntary retreat. Combat pauses in menus, descriptions and background tabs; closing the game does not simulate offline combat.

Basic attacks are free. Special abilities spend mana, have individual cooldowns and are not automatically repeated. Sunder, Rime Lance, Deathmark and Dawn Verdict interrupt preparations. Mend automatically selects the living ally with the lowest HP percentage. A fallen ally stays down until a recovery point.

## Local development

Node.js 24 and pnpm 10:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm simulate
pnpm build
pnpm preview
```

Publish `dist/` on HTTPS. Relative build URLs support a repository subpath. GitHub Actions builds and deploys `main` using GitHub Pages; configure the repository's Pages source as GitHub Actions.

The build creates a content-addressed service worker. All public assets are precached before the new worker is installed. An update waits until the player chooses **Install update**. Only this game's caches in its own scope are removed. Local saves are never touched by the worker.

## Verification and limits

- Strict TypeScript compilation and engine tests cover wave counts, recruitment, combat, synergy, interruptions, transformation, economy, expedition progress, daily rules and save validation.
- Deterministic tactical simulations complete all twelve initial-class/companion orders. Their times describe an automated strategy, not expected human playtime or a guarantee of final balance.
- Browser checks covered selection, automatic combat, abilities, pause, retreat, purchases, importing a duo and a 320×568 four-button battle layout. Installation behavior, battery usage and performance still need checks on physical iPhone/Android hardware.
- Contracts use the device's UTC date without a server. Local progress and clocks are editable by a determined user; the game makes no anti-cheat claim.

## Project structure

`src/content.ts`: classes, skills, creatures and expedition definitions. `src/engine.ts`: DOM-free simulation. `src/renderer.ts`: bounded-DPR Canvas arena and short effects. `src/main.ts`: English screens and controls. `src/saves.ts`: validation and persistence. `src/audio.ts`: music and sound management. `src/pwa.ts`: installation and safe updates. Art and music provenance: ART.md and AUDIO.md.
