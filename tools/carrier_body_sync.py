#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""carrier_body_sync.py — конвенция носитель↔тело РУМУ (П-15, content-addressed).

Носитель имени: репо rtynbirf/rumu (архив-саркофаг; его MANIFEST.body_pin —
датированный снимок по дизайну) + живой SHA-пин в геноме cell-swarm
(swarm.json, клетка singulyar, pin_ref: rumu).
Тело: ветка rumu репо singulyar (этот репо).

Режимы:
  --check   сверка живьём (по умолчанию):
              1) живой HEAD ветки тела (git ls-remote → API fallback);
              2) content-addressed body_digest из MANIFEST.json vs живое дерево;
              3) SHA-пин клетки singulyar из генома cell-swarm vs живой HEAD.
            rc=0 — всё сошлось; rc=2 — тело съехало от body_digest (деградация,
            в отчёте — «за N часов»); rc=3 — проверить не удалось (fail-closed);
            rc=4 — геном-пин отстал (ловится genome-drift'ом, здесь только сигнал).
  --write   перепин: пересчитать живой digest и атомарно обновить MANIFEST.json
            (body_digest, body_checked_at, body_head_at_check) — сознательное
            действие, не автоперевоз.
"""
import argparse
import base64
import collections
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timezone

REPO = "rtynbirf/singulyar"
BODY_REF = "rumu"
GENOME_RAW = (
    "https://api.github.com/repos/rtynbirf/cell-swarm/contents/swarm.json?ref=main"
)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST_PATH = os.path.join(ROOT, "MANIFEST.json")


def _http(url, token=None, raw=False):
    req = urllib.request.Request(url)
    if raw:
        req.add_header("Accept", "application/vnd.github.raw+json")
    tok = token or os.environ.get("GITHUB_TOKEN")
    if tok:
        req.add_header("Authorization", f"Bearer {tok}")
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8")


def live_body_head():
    """Живой HEAD ветки тела: git ls-remote (первичный), API (запасной)."""
    try:
        out = subprocess.run(
            ["git", "ls-remote", f"https://github.com/{REPO}.git",
             f"refs/heads/{BODY_REF}"],
            capture_output=True, text=True, check=True, timeout=60,
        ).stdout.strip()
        if out:
            return out.split()[0], "ls-remote"
    except Exception:
        pass
    data = json.loads(_http(f"https://api.github.com/repos/{REPO}/branches/{BODY_REF}"))
    return data["commit"]["sha"], "api"


def tree_digest(head):
    here = os.path.dirname(os.path.abspath(__file__))
    r = subprocess.run(
        [sys.executable, os.path.join(here, "body_digest.py"), "--api", head],
        capture_output=True, text=True, timeout=120,
    )
    if r.returncode != 0:
        raise RuntimeError("body_digest.py --api failed: " + r.stderr.strip())
    entries = None
    for line in r.stderr.splitlines():
        if line.startswith("entries="):
            entries = int(line.split("=", 1)[1])
    return r.stdout.strip(), entries


def genome_pin():
    body = _http(GENOME_RAW, raw=True)
    genome = json.loads(body)
    for cell in genome.get("cells", []):
        if cell.get("name") == "singulyar":
            return cell.get("pin"), genome.get("fetched_at")
    return None, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()

    manifest = json.load(open(MANIFEST_PATH, encoding="utf-8"), object_pairs_hook=collections.OrderedDict)
    body = manifest["body"]

    head, src = live_body_head()
    report = collections.OrderedDict([
        ("body_ref", BODY_REF),
        ("live_head", head),
        ("head_source", src),
    ])

    if a.write:
        dig, n = tree_digest(head)
        body["body_digest"] = dig
        body["body_checked_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        body["body_head_at_check"] = head
        tmp = MANIFEST_PATH + ".part"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
        os.replace(tmp, MANIFEST_PATH)
        json.load(open(MANIFEST_PATH, encoding="utf-8"))  # валидация
        print(json.dumps({"written": True, "body_digest": dig, "entries": n},
                         ensure_ascii=False))
        return 0

    # --- --check ---
    checked_at = body.get("body_checked_at", "")
    hours = None
    try:
        t0 = datetime.strptime(checked_at, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        hours = round((datetime.now(timezone.utc) - t0).total_seconds() / 3600, 1)
    except Exception:
        pass

    pin_stored = body.get("body_head_at_check")
    digest_stored = body.get("body_digest", "")
    report["body_checked_at"] = checked_at
    report["hours_since_check"] = hours
    report["digest_head_mismatch"] = bool(pin_stored and head != pin_stored)

    try:
        dig_live, n = tree_digest(head)
        report["digest_live"] = dig_live
        report["digest_stored"] = digest_stored
        report["entries"] = n
        digest_ok = dig_live == digest_stored
    except Exception as e:
        report["error"] = str(e)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 3

    try:
        pin_genome, genome_fetched = genome_pin()
        report["genome_pin"] = pin_genome
        report["genome_fetched_at"] = genome_fetched
        genome_ok = (pin_genome == head)
    except Exception as e:
        report["genome_error"] = str(e)
        genome_ok = None

    report["digest_ok"] = digest_ok
    report["genome_ok"] = genome_ok

    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not digest_ok:
        print(f"ТЕЛО СЪЕХАЛО от body_digest (за {hours} ч) — деградация, нужен перепин (--write)", file=sys.stderr)
        return 2
    if genome_ok is False:
        print("геном-пин отстал от живого HEAD тела — сигнал для genome-drift", file=sys.stderr)
        return 4
    return 0


if __name__ == "__main__":
    sys.exit(main())
