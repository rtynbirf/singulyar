#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""body_digest.py — content-addressed дайджест дерева тела РУМУ (П-15).

Канон: отсортированные строки "<path>\t<mode>\t<blob_sha>" по всем записям
дерева (git ls-tree -r / API git/trees?recursive=1), join '\n', sha256 hex.
Помечает СОДЕРЖИМОЕ, не момент: расхождение = тело съехало.

Режимы:
  --ref <git-ref>   локальный расчёт из git (нужен fetch тела)
  --api <head-sha>  расчёт через GitHub API git/trees (нужен GITHUB_TOKEN для
                    надёжности; fail-closed при truncated=true)
Вывод: "sha256-<hex>" в stdout; счётчики — в stderr.
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import urllib.request


def canon(lines):
    lines = sorted(set(lines))
    blob = "\n".join(lines).encode("utf-8")
    return "sha256-" + hashlib.sha256(blob).hexdigest(), len(lines)


def digest_from_git(ref):
    out = subprocess.run(
        ["git", "ls-tree", "-r", ref],
        capture_output=True, text=True, check=True,
    ).stdout
    lines = []
    for row in out.splitlines():
        meta, path = row.split("\t", 1)
        mode, _typ, sha = meta.split()
        lines.append(f"{path}\t{mode}\t{sha}")
    return canon(lines)


def digest_from_api(repo, head, token=None):
    url = f"https://api.github.com/repos/{repo}/git/trees/{head}?recursive=1"
    req = urllib.request.Request(url)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.loads(r.read().decode("utf-8"))
    if data.get("truncated"):
        raise RuntimeError("tree truncated — расчёт недостоверен (fail-closed)")
    lines = [
        f"{e['path']}\t{e['mode']}\t{e['sha']}"
        for e in data["tree"]
    ]
    return canon(lines)


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--ref", help="локальный git-ref тела")
    g.add_argument("--api", metavar="HEAD", help="HEAD sha тела через GitHub API")
    ap.add_argument("--repo", default="rtynbirf/singulyar")
    a = ap.parse_args()
    if a.ref:
        dig, n = digest_from_git(a.ref)
    else:
        token = os.environ.get("GITHUB_TOKEN")
        dig, n = digest_from_api(a.repo, a.api, token)
    print(dig)
    print(f"entries={n}", file=sys.stderr)


if __name__ == "__main__":
    main()
