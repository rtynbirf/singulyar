#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/parity_flip_report.py — П52: автопроверка флип-протокола ADR-0004/0005.

Три гейта флипа дефолта rumu→main (docs/adr/0004, docs/adr/0005):
  (а) parity контента Pages — 0 site-файлов в расхождении rumu↔main
      (служебные пути репо в гейт не входят, но показываются в отчёте);
  (б) зелёный такт-гейт на main — последний прогон workflow `такт_гейт.yml`
      на ветке main: conclusion=success;
  (в) слово Хозяина — label `owner-approved` на issue #63.

Режимы:
  --render    живой отчёт (markdown в stdout). Diff — через git
              (origin/rumu, origin/main должны быть fetch'нуты), гейты (б)/(в)
              — через GitHub API (GITHUB_TOKEN/GH_TOKEN). rc=0 всегда
              (режим отчёта); для жёсткого гейта есть --strict (rc=1, если
              флип не готов).
  --selftest  детерминированный самотест на фикстурах, без сети (rc=0/1).

Отчёт публикуется воркфлоу .github/workflows/parity-flip-check.yml
комментарием в issue #63. Только stdlib.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

REPO = os.environ.get("GITHUB_REPOSITORY", "rtynbirf/singulyar")
GATE_ISSUE = 63
OWNER_LABEL = "owner-approved"
TAKT_WORKFLOW = "такт_гейт.yml"

# Служебные пути репо: в гейт parity Pages НЕ входят (сайт их не обслуживает).
SERVICE_PREFIXES = (
    ".github/", "docs/", "harness/", "reports/", "scripts/", "server/",
    "ИНСТРУМЕНТЫ/",
)
SERVICE_SUFFIXES = (".md",)


def is_site_file(path: str) -> bool:
    """True — файл относится к контенту Pages (консервативно: всё, кроме
    явно служебных путей репо)."""
    if path.startswith(SERVICE_PREFIXES):
        return False
    if path.endswith(SERVICE_SUFFIXES):
        return False
    return True


def site_and_service(paths: list[str]) -> tuple[list[str], list[str]]:
    site = sorted(p for p in paths if is_site_file(p))
    service = sorted(p for p in paths if not is_site_file(p))
    return site, service


def gate_parity(diff_paths: list[str]) -> dict:
    site, service = site_and_service(diff_paths)
    return {
        "ready": not site,
        "site": site,
        "service": service,
        "total": len(diff_paths),
        "detail": ("0 site-файлов — parity достигнут" if not site
                   else f"{len(site)} site-файлов из "
                        f"{len(diff_paths)} — расхождения не сведены"),
    }


def gate_takt(runs: list[dict] | None) -> dict:
    """runs — список прогонов workflow (свежий первым) или None (нет данных)."""
    if runs is None:
        return {"ready": False, "detail": "нет данных (нет токена/API)"}
    if not runs:
        return {"ready": False, "detail": "прогонов такт-гейта на main нет"}
    latest = runs[0]
    conclusion = latest.get("conclusion")
    ready = conclusion == "success"
    return {"ready": ready,
            "detail": f"{latest.get('run_number', '?')} от "
                      f"{latest.get('created_at', '?')}: {conclusion}"}


def gate_owner(labels: list[str] | None) -> dict:
    if labels is None:
        return {"ready": False, "detail": "нет данных (нет токена/API)"}
    ready = OWNER_LABEL in labels
    return {"ready": ready,
            "detail": f"label {OWNER_LABEL}: "
                      + ("GRANTED" if ready else "PENDING")}


def render_report(parity: dict, takt: dict, owner: dict, meta: dict) -> str:
    """Markdown-отчёт. Детерминирован: один вход → та же строка."""
    gates = [("parity", "(а) parity контента Pages", parity),
             ("takt", "(б) зелёный такт-гейт на main", takt),
             ("owner", "(в) слово Хозяина (label на #63)", owner)]
    passed = sum(1 for _, _, g in gates if g["ready"])
    verdict = ("✅ **ФЛИП РАЗРЕШЁН** — все три гейта пройдены; слово Хозяина "
               "остаётся финальной командой."
               if passed == 3 else
               f"⛔ **ФЛИП ЗАПРЕЩЁН** — гейтов пройдено {passed}/3 "
               f"(протокол: docs/adr/0004 + docs/adr/0005).")
    lines = [
        "<!-- parity-flip-report:adr-0004/0005 -->",
        f"## 🔎 Parity-отчёт флип-протокола ADR-0004/0005 — {meta['date']}",
        "",
        f"drift rumu...main: ahead_by={meta['ahead']} behind_by={meta['behind']} "
        f"status={meta['status']} · прогон [{meta['run_url']}]({meta['run_url']})",
        "",
        "| Гейт | Критерий | Статус |",
        "|---|---|---|",
    ]
    marks = {True: "✅", False: "❌"}
    for _, title, g in gates:
        detail = str(g["detail"]).replace("|", "\\|")
        lines.append(f"| {title} | | {marks[g['ready']]} {detail} |")
    lines += [
        "",
        f"**Гейт (а) подробно:** всего расхождений rumu↔main — {parity['total']}; "
        f"site-файлов (Pages) — **{len(parity['site'])}**; служебных — "
        f"{len(parity['service'])}.",
    ]
    if parity["site"]:
        lines += ["", "<details><summary>Site-расхождения (первые 50)</summary>", ""]
        lines += [f"- `{p}`" for p in parity["site"][:50]]
        if len(parity["site"]) > 50:
            lines.append(f"- … и ещё {len(parity['site']) - 50}")
        lines += ["", "</details>"]
    if parity["service"]:
        lines += ["", "<details><summary>Служебные расхождения "
                      "(в гейт не входят, первые 30)</summary>", ""]
        lines += [f"- `{p}`" for p in parity["service"][:30]]
        if len(parity["service"]) > 30:
            lines.append(f"- … и ещё {len(parity['service']) - 30}")
        lines += ["", "</details>"]
    lines += ["", verdict,
              "",
              "_Гейт (в) — не-машинный: Хозяин ставит label "
              f"`{OWNER_LABEL}` на #{GATE_ISSUE}._ "
              "Детектор ort-wasm: docs/ORT-WASM-DEDUP.md (П52-II)."]
    return "\n".join(lines) + "\n"


# ── Живые источники данных ─────────────────────────────────────────────────
def _ref_exists(ref: str) -> bool:
    return subprocess.run(
        ["git", "rev-parse", "--verify", "--quiet", ref],
        capture_output=True).returncode == 0


def git_diff_paths() -> tuple[list[str], dict]:
    """Расхождение голов: пути — git diff (полный список, если оба tip'а
    fetch'нуты), ahead/behind — compare API (шаллоу-клоны не обязаны знать
    merge-base). Фолбэк всего — compare API (первая страница, 300 файлов)."""
    paths: list[str] = []
    have_git = _ref_exists("origin/rumu") and _ref_exists("origin/main")
    if have_git:
        for a, b in (("origin/rumu", "origin/main"),
                     ("origin/main", "origin/rumu")):
            out = subprocess.run(
                ["git", "-c", "core.quotepath=false",
                 "diff", "--name-only", a, b],
                capture_output=True, text=True).stdout
            paths.extend(p for p in out.splitlines() if p.strip())
    data = api_json("/compare/rumu...main")
    if data:
        meta = {"ahead": data.get("ahead_by", "?"),
                "behind": data.get("behind_by", "?"),
                "status": data.get("status", "unknown")}
        if not paths:
            paths = [f["filename"] for f in data.get("files", [])]
        return paths, meta
    if have_git:
        # без токена: ahead/behind из rev-list (если merge-base известен)
        stat = subprocess.run(
            ["git", "rev-list", "--left-right", "--count",
             "origin/rumu...origin/main"],
            capture_output=True, text=True).stdout.split()
        if len(stat) == 2:
            behind, ahead = stat
            status = "diverged" if (ahead, behind) != ("0", "0") else "identical"
            return paths, {"ahead": ahead, "behind": behind, "status": status}
    return paths, {"ahead": "?", "behind": "?", "status": "unknown"}


def api_json(path: str):
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not token:
        return None
    url = f"https://api.github.com/repos/{REPO}{path}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "parity-flip-report",
    })
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as err:  # noqa: BLE001
        print(f"WARN  API {path}: {err}", file=sys.stderr)
        return None


def live_takt() -> dict:
    q = urllib.parse.quote(TAKT_WORKFLOW)
    data = api_json(f"/actions/workflows/{q}/runs?branch=main&per_page=1")
    return gate_takt(data.get("workflow_runs") if data else None)


def live_owner() -> dict:
    data = api_json(f"/issues/{GATE_ISSUE}/labels")
    if data is None:
        return gate_owner(None)
    return gate_owner([l["name"] for l in data])


# ── Самотест на фикстурах (детерминированный, без сети) ───────────────────
def selftest() -> int:
    fixture_diff = [
        "index.html", "js/player.js", "vendor/ort/ort-wasm-simd.jsep.wasm",
        ".github/workflows/x.yml", "docs/adr/0005-x.md", "README.md",
        "ИНСТРУМЕНТЫ/test_y.py", "reports/pulse.md", "scripts/tool.py",
    ]
    red = 0
    # 1) классификация site/service
    site, service = site_and_service(fixture_diff)
    expect_site = ["index.html", "js/player.js", "vendor/ort/ort-wasm-simd.jsep.wasm"]
    expect_service = [".github/workflows/x.yml", "README.md",
                      "docs/adr/0005-x.md", "reports/pulse.md",
                      "scripts/tool.py", "ИНСТРУМЕНТЫ/test_y.py"]
    ok = site == expect_site and service == expect_service
    red += not ok
    print(f"{'PASS' if ok else 'RED'}  site/service классификация: site={site}")
    # 2) гейт parity: непустой diff — не готов; пустой — готов
    g1 = gate_parity(fixture_diff)
    g2 = gate_parity([])
    ok = (not g1["ready"] and len(g1["site"]) == 3 and g2["ready"]
          and g2["total"] == 0)
    red += not ok
    print(f"{'PASS' if ok else 'RED'}  гейт (а): 3 site-файла → запрет; "
          f"пустой diff → готов")
    # 3) гейт (б): conclusion success — зелёный; failure/нет — красный
    ok = (gate_takt([{"conclusion": "success", "run_number": 7,
                      "created_at": "2026-11-09T00:00:00Z"}])["ready"]
          and not gate_takt([{"conclusion": "failure"}])["ready"]
          and not gate_takt([])["ready"] and not gate_takt(None)["ready"])
    red += not ok
    print(f"{'PASS' if ok else 'RED'}  гейт (б): success=готов, "
          f"failure/нет прогонов/нет данных=не готов")
    # 4) гейт (в): label
    ok = (gate_owner(["owner-approved", "x"])["ready"]
          and not gate_owner(["x"])["ready"] and not gate_owner(None)["ready"])
    red += not ok
    print(f"{'PASS' if ok else 'RED'}  гейт (в): label {OWNER_LABEL}=GRANTED, "
          f"иначе PENDING")
    # 5) отчёт: детерминизм + оба вердикта
    parity = gate_parity(fixture_diff)
    takt = gate_takt([{"conclusion": "success", "run_number": 7,
                       "created_at": "2026-11-09T00:00:00Z"}])
    owner_no = gate_owner(["x"])
    owner_yes = gate_owner(["owner-approved"])
    meta = {"date": "2026-11-09T12:00:00Z", "ahead": 631, "behind": 770,
            "status": "diverged", "run_url": "https://example/run/1"}
    r1 = render_report(parity, gate_takt([]), owner_no, meta)
    r2 = render_report(parity, gate_takt([]), owner_no, meta)
    ok = r1 == r2 and "ФЛИП ЗАПРЕЩЁН" in r1 and "0/3" in r1
    red += not ok
    print(f"{'PASS' if ok else 'RED'}  отчёт детерминирован, "
          f"запрет при 0/3 гейтов")
    ok = "ФЛИП РАЗРЕШЁН" in render_report(
        gate_parity([]), takt, owner_yes, meta)
    red += not ok
    print(f"{'PASS' if ok else 'RED'}  отчёт разрешает флип при 3/3 гейтов")
    # 6) YAML-эскейп маркера и целостность markdown
    ok = r1.startswith("<!-- parity-flip-report:adr-0004/0005 -->")
    red += not ok
    print(f"{'PASS' if ok else 'RED'}  отчёт начинается маркером "
          f"<!-- parity-flip-report --> (для update-or-create в #63)")
    print(f"# Result: {6 - red} passed, {red} failed (of 6)")
    return 0 if red == 0 else 1


def render_live() -> int:
    paths, meta = git_diff_paths()
    parity = gate_parity(paths)
    takt = live_takt()
    owner = live_owner()
    run_url = (f"https://github.com/{REPO}/actions/runs/"
               f"{os.environ.get('GITHUB_RUN_ID', 'local')}")
    meta.update(run_url=run_url)
    import datetime
    meta["date"] = datetime.datetime.now(
        datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    sys.stdout.write(render_report(parity, takt, owner, meta))
    if "--strict" in sys.argv:
        return 0 if (parity["ready"] and takt["ready"] and owner["ready"]) else 1
    return 0


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    return render_live()


if __name__ == "__main__":
    import urllib.parse  # noqa: E402 — используется в live-режиме
    sys.exit(main())
