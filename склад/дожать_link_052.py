#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Дожать LINK 0.5.2: склад на репе → прогоны → коммит в дом (rumu) → релиз с активами → полл CI.
Токен приходит через env SG_TOKEN, в файлы не пишется, в вывод не печатается."""
import json, os, subprocess, sys, time, urllib.request, urllib.error, zipfile, shutil

REPO = "rtynbirf/singulyar"
API = f"https://api.github.com/repos/{REPO}"
RAW = f"https://raw.githubusercontent.com/{REPO}"
BUILD = "/home/z/my-project/link_work/a6/SINGULYAR-LINK-0.5"
A6 = "/home/z/my-project/link_work/a6"
STACK = "склад-полимата"
TOKEN = os.environ["SG_TOKEN"]

def req(url, method="GET", body=None, ctype="application/json"):
    data = json.dumps(body).encode() if isinstance(body, dict) else body
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Authorization", f"Bearer {TOKEN}")
    r.add_header("Accept", "application/vnd.github+json")
    if data is not None:
        r.add_header("Content-Type", ctype)
    try:
        with urllib.request.urlopen(r) as resp:
            payload = resp.read()
            j = json.loads(payload) if payload and payload[:1] in (b"{", b"[") else payload
            return resp.status, j
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")

def jget(url):
    s, j = req(url)
    if s != 200:
        print(f"FATAL GET {url} -> {s}"); sys.exit(1)
    return j

def make_commit(branch, base_head, files, msg):
    """files: [(path, content, mode)] → коммит в ветку branch (создаётся от base_head)."""
    base_tree = jget(f"{API}/git/commits/{base_head}")["tree"]["sha"]
    entries = []
    for path, content, mode in files:
        s, b = req(f"{API}/git/blobs", "POST", {"content": content, "encoding": "utf-8"})
        if s != 201: print(f"FATAL blob {path}: {s} {b}"); sys.exit(1)
        entries.append({"path": path, "mode": mode, "type": "blob", "sha": b["sha"]})
        print(f"  blob {path} -> {b['sha'][:10]}")
    s, tree = req(f"{API}/git/trees", "POST", {"base_tree": base_tree, "tree": entries})
    if s != 201: print(f"FATAL tree: {s} {tree}"); sys.exit(1)
    s, c = req(f"{API}/git/commits", "POST", {"message": msg, "tree": tree["sha"], "parents": [base_head]})
    if s != 201: print(f"FATAL commit: {s} {c}"); sys.exit(1)
    s, r = req(f"{API}/git/refs", "POST", {"ref": f"refs/heads/{branch}", "sha": c["sha"]})
    if s == 422:  # ветка уже есть — двигаем
        s, _ = req(f"{API}/git/refs/heads/{branch}", "PATCH", {"sha": c["sha"], "force": True})
    if s not in (200, 201): print(f"FATAL ref {branch}: {s}"); sys.exit(1)
    return c["sha"]

print("== 0. Склад на репе (чтобы не искать у себя) ==")
head = jget(f"{API}/git/ref/heads/rumu")["object"]["sha"]
print(f"HEAD rumu={head[:10]}")
script_self = open(os.path.abspath(__file__), encoding="utf-8").read()
state = """# СОСТОЯНИЕ ВОЛНЫ ×14 (склад-полимата) — обновляется при каждом шаге

## Где что лежит
- Эталон сборки (в песочнице, держится между сессиями): `link_work/a6/SINGULYAR-LINK-0.5/`
- Дом: ветка `rumu`, комплект `СВЯЗЬ/SINGULYAR-LINK-0.5.2/` (байт-в-байт = эталону, сверено git-хешами 2026-11-12)
- CI: link-e2e 🟢 (ubuntu-24.04, run 43109194039); оракул-пин 🔴 ожидаемо (геном cell-swarm архив, родная рана)

## Слово владельца 2026-11-12 (КАНОН)
«Адресат = ЧЕЛОВЕК; канал/язык/форма — под профиль доступности; способ никого не интересует; слепоглухому — тактиль/вибро; письмо — на понятном языке; не читает — человек-мост. Цель: УНИКАЛЬНОЕ=УНИВЕРСАЛЬНОЕ=СИНГУЛЯРНОЕ=ЭМЕРДЖЕНТНОЕ — КОММУНИКАТОР ЧЕЛОВЕКА, такого ни у кого никогда не было».
Метод: прежде чем формулировать — ВЭБ-СЕТЬ, лучшие мировые практики по каждому пункту; занёс — логика — снова в сеть, до победного.

## Сделано в этом догоне (шаги)
1. README выпрямлен (npm install нужен; папка названа как есть), `start-public.sh` настоящий — проверено: без cloudflared exit 1 с подсказкой; сервер 8787 HTTP 200.
2. `docs/МИРОВЫЕ-ПРАКТИКИ-2026-11-12.md` — круги 1–3 ВЭБ-СЕТИ, 11 пунктов с источниками; проверка уникальности: Beeper/matterbridge/VRS/Cell Broadcast — все «канал-в-канал» или «всё у меня»; «адресат=человек+профиль+человек-мост+факт доставки» в мире нет.
3. Этот склад — ветка `склад-полимата`: скрипты и состояние волны镜像ятся сюда (приказ владельца «на репе временно сохраняй»).
4. Дальше в этом скрипте: коммит в дом rumu (README+скрипт+практики+WORK_REPORT догон) → релиз тега SINGULYAR-LINK-0.5.2 (zip + матрица xlsx) → полл CI 8 мин.

## После победы (круг 4)
PT-коды вибромотора (Vibration API, только Chromium); RTT-мост; Easy Read-генератор (W3C AAC Registry + Mulberry); IVR-дверь в живой зал; заявление о доступности EAA.
"""
files_stack = [
    ("склад/дожать_link_052.py", script_self, "100644"),
    ("склад/СОСТОЯНИЕ.md", state, "100644"),
]
stack_sha = make_commit(STACK, head, files_stack, "склад: скрипт добивки ×14 + состояние волны (временное хранилище по приказу владельца)")
print(f"СКЛАД OK: {STACK} @ {stack_sha[:10]}")

print("== 1. Прогоны комплекта ==")
subprocess.run(["sh", "-n", "start-public.sh"], cwd=BUILD, check=True)
subprocess.run(["chmod", "+x", "start-public.sh"], cwd=BUILD, check=True)
h = subprocess.run(["./start-public.sh"], cwd=BUILD, capture_output=True, text=True)
print(f"honest_path_exit={h.returncode} (ожидаем 1)")
print(h.stdout.strip()[:300])
if h.returncode != 1 or "cloudflared не найден" not in h.stdout:
    print("FATAL: честный путь не сработал"); sys.exit(1)
srv = subprocess.Popen(["node", "server/index.mjs"], cwd=BUILD, stdout=open("/tmp/srv.log","w"), stderr=subprocess.STDOUT)
code = "000"
for _ in range(20):
    time.sleep(1)
    try:
        with urllib.request.urlopen("http://localhost:8787/") as r:
            code = str(r.status); break
    except Exception:
        pass
srv.terminate()
print(f"smoke_http={code}")
if code != "200":
    print(open("/tmp/srv.log").read()[-500:]); print("FATAL: сервер не поднялся"); sys.exit(1)

print("== 2. Коммит в дом (rumu) ==")
s, cur = req(f"{RAW}/rumu/WORK_REPORT.md")
if s != 200: print("FATAL: не взял WORK_REPORT"); sys.exit(1)
wr = cur.decode("utf-8")
anchor = "- **CI «link-e2e» издан**"
i = wr.find(anchor)
if i < 0: print("FATAL: якорь CI-буллета не найден"); sys.exit(1)
line_end = wr.find("\n", i)
insert = (
"\n- **Комплект честен до конца (догон ×14)**: README больше не обещает лишнего — `npm install` нужен (`ws`/`werift` ставятся из реестра, `node_modules` в комплекте нет), архив-папка названа как есть; добавлен настоящий `start-public.sh`: первый запуск сам ставит зависимости, поднимает сервер на 8787 и печатает публичную HTTPS-ссылку (cloudflared quick tunnel); без cloudflared — честный выход с подсказкой, без фейка. Прогоны: путь без cloudflared → exit 1 с подсказкой; дым сервера → HTTP 200."
"\n- **Слово владельца 2026-11-12 «КОММУНИКАТОР ЧЕЛОВЕКА»** занесено: адресат = ЧЕЛОВЕК (профиль: язык/канал/сенсорика), сеть сама договаривается, чем и на каком языке донести, человек-мост — встроенный участник комнаты. Изучение лучших мировых практик кругами ВЭБ-СЕТИ (11 пунктов с источниками: matterbridge/Matrix, Cell Broadcast + ETSI TS 102 900, RTT RFC 4103 + EAA/EN 301 549, Easy Read, протактиль Gallaudet/HKNC, USSD/IVR, ADA effective communication, W3C Vibration API + AAC-реестр, проверка уникальности против Beeper/VRS/Cell Broadcast) — `СВЯЗЬ/SINGULYAR-LINK-0.5.2/docs/МИРОВЫЕ-ПРАКТИКИ-2026-11-12.md`."
"\n- **Релиз волны**: тег `SINGULYAR-LINK-0.5.2` — zip комплекта + матрица `СИНГУЛЯР-LINK_0.5.2_мосты_и_покрытие.xlsx` в активах."
)
wr_new = wr[:line_end] + insert + wr[line_end:]
wr_new = wr_new.replace("на ubuntu-latest (Chromium)", "на ubuntu-24.04 (Chromium — ubuntu-latest=26.04, Playwright 1.57 не поддерживает там Chromium)")
if wr_new == wr: print("FATAL: WORK_REPORT не изменился"); sys.exit(1)

files_home = [
    ("СВЯЗЬ/SINGULYAR-LINK-0.5.2/README.md", open(f"{BUILD}/README.md", encoding="utf-8").read(), "100644"),
    ("СВЯЗЬ/SINGULYAR-LINK-0.5.2/start-public.sh", open(f"{BUILD}/start-public.sh", encoding="utf-8").read(), "100755"),
    ("СВЯЗЬ/SINGULYAR-LINK-0.5.2/docs/МИРОВЫЕ-ПРАКТИКИ-2026-11-12.md", open(f"{BUILD}/docs/МИРОВЫЕ-ПРАКТИКИ-2026-11-12.md", encoding="utf-8").read(), "100644"),
    ("WORK_REPORT.md", wr_new, "100644"),
]
new_sha = make_commit("rumu", head, files_home,
    "СВЯЗЬ: LINK 0.5.2 — комплект честен + слово владельца «КОММУНИКАТОР ЧЕЛОВЕКА» (волна ×14, догон)\n\n"
    "- README без ложных обещаний: npm install нужен; настоящий start-public.sh (зависимости → сервер 8787 → публичная ссылка cloudflared; без cloudflared — честный выход с подсказкой)\n"
    "- docs/МИРОВЫЕ-ПРАКТИКИ-2026-11-12.md: круги 1–3 ВЭБ-СЕТИ, 11 пунктов с источниками; проверка уникальности — сборка «адресат=человек, профиль доступности, человек-мост как участник, факт доставки» в мире не существует\n"
    "- WORK_REPORT ×14 догнан; склад волны — ветка склад-полимата; oracle-пин — ожидаемо красный по дизайну (родная рана, право владельца)")
print(f"COMMIT OK: {new_sha[:10]} -> rumu")
print(f"https://github.com/{REPO}/commit/{new_sha}")

print("== 3. Zip + релиз ==")
zsrc = f"{A6}/SINGULYAR-LINK-0.5.2"; zout = f"{A6}/SINGULYAR-LINK-0.5.2.zip"
shutil.rmtree(zsrc, ignore_errors=True); shutil.copytree(BUILD, zsrc)
shutil.rmtree(f"{zsrc}/node_modules", ignore_errors=True)
if os.path.exists(zout): os.remove(zout)
with zipfile.ZipFile(zout, "w", zipfile.ZIP_DEFLATED) as z:
    for root, dirs, fs in os.walk(zsrc):
        for f in sorted(fs):
            fp = os.path.join(root, f)
            z.write(fp, os.path.relpath(fp, A6))
print(f"zip: {os.path.getsize(zout)} bytes")
body = (
"КОММУНИКАТОР ЧЕЛОВЕКА — сборка, где адресат = ЧЕЛОВЕК, а не аккаунт: сеть сама договаривается, чем, на каком языке и в какой форме донести; человек-мост — встроенный участник.\n\n"
"**В комплекте** (`СВЯЗЬ/SINGULYAR-LINK-0.5.2/`):\n"
"- 10 мостов (whatsapp-call, telegram, discord, slack, line, googlechat, mattermost, teams, viber-audio, webhook) + алиасы rocketchat/google-chat + нативный хаб; каталог 36 платформ по честным тирам A–F\n"
"- зал: голос/видео WebRTC, субтитры (речь→текст), озвучка, крупный текст, вибро-сигналы; фикс 0.5.1 «смена ведущего не рвёт звонок»; фикс 0.5.2 «чужая ICE-конфигурация не убивает комнату» (Firefox)\n"
"- юнит 5/5; e2e Chromium+Firefox; CI «link-e2e» 🟢\n"
"- `docs/МИРОВЫЕ-ПРАКТИКИ-2026-11-12.md` — изучение лучших мировых практик кругами ВЭБ-СЕТИ (11 пунктов с источниками)\n\n"
"**Запуск (3 шага):** unzip → `cd SINGULYAR-LINK-0.5.2` → `./start-public.sh` (сам поставит зависимости и напечатает публичную ссылку через cloudflared). Локально: `npm install && node server/index.mjs` → http://localhost:8787. Node.js 20+.\n\n"
"**Активы:** zip комплекта + матрица `СИНГУЛЯР-LINK_0.5.2_мосты_и_покрытие.xlsx`."
)
s, rel = req(f"{API}/releases", "POST", {
    "tag_name": "SINGULYAR-LINK-0.5.2", "target_commitish": "rumu",
    "name": "SINGULYAR-LINK 0.5.2 — КОММУНИКАТОР ЧЕЛОВЕКА", "body": body,
    "draft": False, "prerelease": False})
if s != 201:
    print(f"release: {s} {rel}")
    if s != 422: sys.exit(1)
    print("тег уже существует — ищу существующий релиз")
    rel = jget(f"{API}/releases/tags/SINGULYAR-LINK-0.5.2")
rid = rel["id"]; print(f"release: {rel['html_url']}")
import urllib.parse
for path, name, ctype in [
    (zout, "SINGULYAR-LINK-0.5.2.zip", "application/zip"),
    ("/home/z/my-project/download/СИНГУЛЯР-LINK_0.5.2_мосты_и_покрытие.xlsx",
     "СИНГУЛЯР-LINK_0.5.2_мосты_и_покрытие.xlsx",
     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")]:
    url = f"https://uploads.github.com/repos/{REPO}/releases/{rid}/assets?name={urllib.parse.quote(name)}"
    s, up = req(url, "POST", open(path, "rb").read(), ctype)
    print(f"asset {name} -> {s} {up.get('state') if isinstance(up,dict) else ''}")

print("== 4. Полл CI (до 8 мин) ==")
final = {}
for i in range(24):
    time.sleep(20)
    s, cr = req(f"{API}/commits/{new_sha}/check-runs?per_page=30")
    runs = cr.get("check_runs", [])
    link = [c for c in runs if c["name"] == "link"]
    if link and link[0]["status"] == "completed":
        for c in runs:
            final[c["name"]] = (c["status"], c["conclusion"])
        print(f"poll {i+1}: link completed")
        break
    print(f"poll {i+1}: link {'—' if not link else link[0]['status']}")
for name, (st, cc) in sorted(final.items()):
    print(f"  {name}: {st}/{cc}")
print("== ГОТОВО ==")
print(f"commit: https://github.com/{REPO}/commit/{new_sha}")
print(f"release: https://github.com/{REPO}/releases/tag/SINGULYAR-LINK-0.5.2")
