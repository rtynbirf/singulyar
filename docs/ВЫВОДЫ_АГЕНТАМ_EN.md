# AGENTS' CONCLUSIONS — the wave's lessons register (error → root → fix → guard)

> **Status:** ✅ Current · **Introduced:** 2026-11-10 by the owner's order:
> «СДЕЛАЙ ВЫВОДЫ!!! И ЗАНЕСИ ВСЁ В РЕПО, ЧТОБ ОДНИМ АГЕНТАМ БЫЛО НЕ ПОВАДНО, А ДРУГИМ ПОЛЬЗА!!!!!»
> (MAKE THE CONCLUSIONS!!! AND PUT EVERYTHING INTO THE REPO, SO THAT SOME AGENTS DARE NOT REPEAT IT, AND OTHERS GAIN FROM IT!!!!!)
> **Source:** the «ЛКГ-1 + ПРАВДА-2» campaign and its tails (2026-11-09…10): rumu commits `b2d5f47` → `abd3ee7` → `0247fa1`, cell-swarm pins `015a4814` → `0786b7c`, foreign (parallel) moves `3b178e1` (W1) and `200c0f6` (wave ×9).
> **The lesson formula:** error → root → fix → guard. The guard is what makes a repetition either impossible or loud.
> RU original (source of truth): [ВЫВОДЫ_АГЕНТАМ.md](ВЫВОДЫ_АГЕНТАМ.md).

## Why this register exists (the double purpose)

For the one who erred or is tempted to repeat it — **DARE NOT**: every lesson here is named honestly, with its price (an extra loop, a re-push, a red run, the owner's nerves). After this register, repeating the same thing is no longer an "accident" but ignoring the written word; it is a red trail, and it stays in the journal.

For the one who works next — **GAIN**: every trick in the "fix" column was dug out of a live wave and is ready to be reused: step names, order, concrete sha anchors. Do not reinvent what has already been earned the hard way.

The register's rule: a lesson gets in if it (a) has already happened and cost time/a re-push/a red run and (b) generalizes to any future wave. Private typos are not recorded. New lessons are append-only at the end of their section.

---

## A. Environment and access

### L-1. A shell has no memory: export does not survive the next command

- **Error.** The token was exported `export GH_TOKEN=…` in one shell command; the next command went out without an `Authorization` header → GitHub answered `401 Bad credentials`. The "the token is dead" diagnosis proved wrong — the owner corrected: «ТОКЕН НЕ МёРТВ!!! НЕ ТУПИ=)» ("THE TOKEN ISN'T DEAD!!! DON'T BE DUMB=)").
- **Root.** Every shell command is a new session: environment variables do not live between calls. A missing header makes GitHub answer with the same 401 as for a revoked token — the code does not distinguish "no header" from "bad token".
- **Fix.** The token is inlined into EVERY command: `GH_TOKEN=… python3 script.py`. Scripts read `os.environ['GH_TOKEN']` at their own start. Never bet on an export.
- **Guard.** Before declaring "the token is dead" — prove that the request carried a header at all (a minimal GET with the same token). A diagnosis without an autopsy = a guess; in this wave it cost an extra loop and the owner's nerves.

## B. Git Data API (push without a local push chain)

### L-2. `parents` is the SHA of a COMMIT, not of a tree

- **Error.** The wave's first pusher assembled a commit passing the base **tree** SHA (`base_tree`) in `parents`. The Git Data API does not validate the parent as a commit and silently created an orphaned genealogy: 56 blobs and a tree hung without a commit; the landing had to be redone.
- **Root.** A mechanical confusion of the two SHAs the pusher holds at the same time: the tree (`base_tree`) is for building the new tree, the commit (HEAD) is for the lineage. The API trusts you and will not check.
- **Fix.** The pusher keeps the variables strictly apart: `base_tree` — only in the `/git/trees` call; `parent = HEAD` (the commit sha) — only in the `/git/commits` call; after landing `parent = commit['sha']`, `base_tree = commit['tree']['sha']` — the next commit stands on top of the landed one.
- **Guard.** Before the ref PATCH: `parents[0]` must be a sha obtained from `/git/commits/…`, not from `/git/trees/…`. Do not hand-clean orphaned objects — GC will collect them; but the fact goes into the wave journal (what orphaned, why, the harm assessment) — silent defects are forbidden.

### L-3. The local clone lags behind the live HEAD — STOP-HORN, not "I'll push through"

- **Error.** The first run of the tail pusher hit STOP-HORN: local HEAD ≠ live — our own commit, landed via the API, had not been pulled into the clone. Later the same horn honestly caught the foreign moves of parallel waves (`3b178e1`, `200c0f6`) that had landed in the House while this session was away.
- **Root.** A push through the Git Data API changes the repository on GitHub's side; the local clone does not learn it by itself. Pushing over an unverified divergence risks trampling foreign bytes (a violation of З.5).
- **Fix.** `git fetch origin rumu && git reset --hard FETCH_HEAD` — foreign bytes in full, ours get carried over; a divergence BEFORE the work is a reading of "the House lived without you", not an obstacle. The single-file latka pusher now compares the local and the live HEAD itself and stands as a horn.
- **Guard.** The order of every wave: CHECK → fetch+reset on divergence → CHECK → work → push → CHECK. Every horn goes into the wave's chronicle (З.6).

## C. Red runs — read them, do not silence them

### L-4. "ПИН УСТАРЕЛ" ("THE PIN IS STALE") — a red of the design gate, not of a defect

- **Error.** After every landing into `rumu` the `oracle-rumu` oracle turns red with "ПИН УСТАРЕЛ" (runs `42638053885`, `42638047456`). The temptation — "fix the CI" or mute the check.
- **Root.** It is designed so: the oracle compares `cell-swarm/swarm.json → cells[singulyar].pin` against the live HEAD of `rumu`. Any honest push into `rumu` MUST paint this run red until the pin is chased up. The red is the signal "the House has not caught up with itself yet", not an accident.
- **Fix.** A pin chase with a single-purpose commit (exactly one field changes, `cells[singulyar].pin`; the foreign bytes of `swarm.json` untouched; blob → tree → commit → ref), then an oracle re-run. The wave's tail: two chases `015a4814` (behind `abd3ee7`) and `0786b7c` (behind `0247fa1`) — both green on re-run.
- **Tail 2026-11-10 (a live case):** a re-run RIGHT after the chase reads stale data — the oracle takes the pin from `raw.githubusercontent.com`, which keeps the object for up to 300 s (`cache-control: max-age=300`); two attempts in a row went red on an already fresh pin. The order: chase → a ≈5 min pause → re-run; or an honest KNOWN_ISSUES entry instead of feverish re-runs.
- **Guard.** The clean-trail checklist (CANON §4): "after a push into rumu — chase the pin by a wave with the right, or leave a note to the owner". A red PIN not chased within the wave = an abandoned trail.

### L-5. An inherited red ≠ your red: the differential run

- **Error.** After the wave the takt-gate stood red on nine JS oracles (`s31_chuvstva/kodex/obereg/ruchki/slovo`, `nasled_logic`, `modules_logic`, `s33_fond_logic`, `svyazi_niti`; run `42638047437`). Two roads into the abyss: admit "our wave broke everything" (untrue) or sweep it under the carpet (forbidden).
- **Root.** The wave's base `6e753d0` was landed with `[skip ci]` — its reds only surfaced on the wave's first run. A red run by itself does not say WHO brought the red.
- **Fix.** The differential method: run all 44 oracles on the base and on the wave, compare the lists. Verdict: 9 reds inherited, 0 added, 2 cured (`s31_slog`, `test_цех_правды.mjs`). A KNOWN_ISSUES entry with the run and the list; later the House caught the reds up itself (`200c0f6`, "wave ×9") — the method proved out.
- **Guard.** The journal wording: "the red is inherited — proven by the base↔wave diff run, run so-and-so". Numbers are not named without a run.

### L-6. A fake green is the only unforgivable red

- **Error-temptation.** Any of: muting an oracle, `[skip ci]` on a wave that has reds, editing a test "to fit the answer", a temporarily raised threshold.
- **Root.** Fear of the red instead of respect for the signal.
- **Fix.** A red is either fixed or given a KNOWN_ISSUES entry (run, cause, tail owner) — both ways are honest. CANON §5: reds are interpreted through KNOWN_ISSUES, not through a fake green.
- **Guard.** A red with an entry and an owner is a healthy House. A green bought by muting is an accident postponed and hidden.

## D. House laws that burned people

### L-7. A manual number on a House face = a red CI, not "a trifle in the markup"

- **Error.** The "false number" class (КРУ F-019): 174 manual fallback numbers on the faces — takt/cache/counters hand-pressed into the footer, meta, JSON-LD, README. Every release was a chance to diverge from the registry.
- **Root.** The number does not live at its home: there is no single source of truth.
- **Fix.** The single source — `data/versions.json → счётчики` (definitions in `счётчики.словарь`, 8 lines). The faces read the mechanism: the `data-реестр=…` tags, `sg-registry` hands out the keys, the truth shop aligns the fallbacks (45 faces). The generation is honestly derived from `S15_CACHE` (v236→v237).
- **Guard.** T-071/T-072/T-073 (`test_лица_правды.mjs` 9/9) + the "Faces ≡ registry" step (`цех_правды.py` dry-run = «ДРЕЙФ НЕТ» / "NO DRIFT") in the takt-gate. A new House face is connected by a tag, not by hands.

### L-8. The offline core: a defect is not swallowed, activation asks the human

- **Error.** The worker activated an incomplete build (a mandatory file's failure was swallowed into null) and updated without asking (unconditional `skipWaiting`); the `S15_MAX=140` ceiling measured core+non-core together and cut ~33 of the oldest CORE files on the very first non-core put.
- **Root.** No smoke acceptance, no human consent, the ceiling counted the wrong thing.
- **Fix.** `S15_ЯДРО_ОБЯЗАТЕЛЬНОЕ` (11 files): a mandatory file's failure = a rejected installation — the worker does not stand up, last-known-good keeps serving; old caches are wiped ONLY after an honest acceptance of the new cache; activation = acceptance ∧ human consent (`S15_ВХОД_В_ТАКТ`, the UI ritual — wave W1); `S15_MAX` counts only the non-core.
- **Guard.** `test_sw15_приёмка.mjs` 6/6 (T-010/T-070). CANON §3: aggressive skipWaiting is forbidden. Any edit of `sw15.js` = an `S15_CACHE` bump — no exceptions.

## E. Artifacts and the clean trail

### L-9. A hung CLI tool and dirty names are a diagnosis, not a reason to fight

- **Error.** Repacking the package with the system `zip` went into many minutes of silence until a timeout; the package also contained a garbage directory `файлы/".github/` (a quote in the name — an artifact of someone's unpacking).
- **Root.** CLI tools with interactive waits are poorly scriptable; dirty names from foreign archives do not clean themselves.
- **Fix.** A rebuild in Python (`zipfile`, DEFLATED level 9, a filter for names with quotes/apostrophes/backticks): 66 entries, 0 garbage names, byte-identical.
- **Guard.** After any archive build — check the name list (garbage = 0) and compare against the source. Strange names are fixed BEFORE the landing, not after.

### L-10. The seal — one comment, real SHAs, zero placeholders

- **Error-temptation.** Smearing the report across a dozen comments and threads; publishing the seal with "SHA to be added later".
- **Root.** The wish to report sooner than it is done.
- **Fix.** The wave's seal — ONE comment in the live tracker (for the ЛКГ-1+ПРАВДА-2 campaign: github-runbook #10, comment `6743140281`) with the real SHAs of all landings and chases. The seal draft is kept nearby and is updated to real values BEFORE publishing.
- **Guard.** The clean-trail checklist (CANON §4). A placeholder check before publishing: `【…】`, `XXX`, `TODO`, `undefined` — everything must be replaced by facts.

---

## Ready-made tricks (the gain — copy, do not reinvent)

| Trick | Essence | Described in |
|---|---|---|
| Inline token | `GH_TOKEN=…` in every command; the script reads the env at its start | L-1 |
| Push via the Git Data API | blob → tree (`base_tree`) → commit (`parents=[the HEAD commit sha]`) → ref PATCH; the next landing stands on the landed one | L-2 |
| Check-horn | live HEAD ↔ local HEAD before and after the work; divergence → fetch+reset --hard FETCH_HEAD | L-3 |
| Pin chase | a single-purpose commit in cell-swarm: exactly one field `cells[singulyar].pin`; then an oracle re-run | L-4 |
| Diff run | all oracles on the base and on the wave; comparing the red lists = the proof of "whose red it is" | L-5 |
| Truth shop dry-run | `python3 ИНСТРУМЕНТЫ/цех_правды.py` before edits — it must say «ДРЕЙФ НЕТ» ("NO DRIFT") (idempotent) | L-7 |
| Python archive rebuild | `zipfile` + a dirty-name filter + a list check | L-9 |
| A seal in one comment | one comment in the live tracker with real SHAs; the draft updated BEFORE publishing | L-10 |

## The pre-push checklist (learn it; it follows from the lessons)

1. The token is inlined into every command (L-1).
2. The live HEAD ↔ the clone are checked; on divergence — fetch+reset --hard FETCH_HEAD (L-3).
3. `parents` = the HEAD commit sha, `base_tree` kept apart (L-2).
4. After the push — the pin chase; a red PIN without a chase = an abandoned trail (L-4).
5. Reds — by a diff run and a KNOWN_ISSUES entry, not by silencing (L-5, L-6).
6. Numbers — from the registry only; a face is connected by a tag (L-7).
7. Edits of `sw15.js` — by the LKG law and with a generation bump; aggressive skipWaiting is forbidden (L-8).
8. Artifacts are rebuilt with a proven tool, the name list is clean (L-9).
9. The seal in one comment, real SHAs, no placeholders (L-10).

## The register's history

| Date | Event |
|---|---|
| 2026-11-10 | Introduced by the owner's order; 10 lessons of the ЛКГ-1+ПРАВДА-2 campaign (environment, Git Data API, red runs, House laws, the clean trail) + the ready-made tricks table + the pre-push checklist |
| 2026-11-10 | Tail: L-4 extended with a live case — the raw CDN window (300 s) painted two re-runs red after the pin chase; the rule "chase → ≈5 min pause → re-run" |
