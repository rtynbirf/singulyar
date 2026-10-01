#!/usr/bin/env python3
"""Assemble СИНГУЛЯР·02 «РЕЗОНАНС» — autonomous organism HTML.

Builds:
  1. download/СИНГУЛЯР_02_РЕЗОНАНС_Когда_теряем_157_голосов.html  (real, ~13 МБ)
  2. scripts/test_build.html                                      (tiny fake DNA, for headless UI test)

Then extracts the JS core from the real build and node --check's it.
"""
import json
import os
import subprocess
import time
import wave
import base64
import io

P = os.path.dirname(os.path.abspath(__file__))
# Переносимость: скрипт работает и в рабочей среде, и внутри распакованного архива.
if os.path.isdir(f"{P}/СИНГУЛЯР_02_parts"):      # запущен из 03_сборка/ архива
    PARTS = f"{P}/СИНГУЛЯР_02_parts"
    DOWNLOAD = f"{P}/output"                      # результат пересборки — рядом, деливераблы не трогаем
else:                                             # рабочая среда проекта
    PARTS = f"{P}/parts"
    DOWNLOAD = "/home/z/my-project/download"
DATA = f"{P}/data"
os.makedirs(DOWNLOAD, exist_ok=True)

REAL_OUT = f"{DOWNLOAD}/СИНГУЛЯР_02_РЕЗОНАНС_Когда_теряем_157_голосов.html"
TEST_OUT = f"{P}/test_build.html"


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def jdump(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def js_safe(s):
    """HTML-<script> safety: break up </script>, <!-- and U+2028/9 inside JS strings.
    \u003c is a valid escape in both JSON and JS string literals -> value unchanged."""
    return (s.replace("<", "\\u003c")
             .replace("\u2028", "\\u2028")
             .replace("\u2029", "\\u2029"))


def build(out_path, dna, built_stamp):
    head = read(f"{PARTS}/head.html")
    body = read(f"{PARTS}/body.html")
    eng1 = read(f"{PARTS}/engine1.js")
    eng2 = read(f"{PARTS}/engine2.js")

    audio_b64, cover_b64, langs, ph, meta, taskfiles, taskdata = dna

    # TASKFILES: add СИНГУЛЯР·02 group at the top
    tf = json.loads(taskfiles)
    tf["built"] = built_stamp
    tf["groups"].insert(0, {
        "t": "СИНГУЛЯР·02 · ПЛАН", "c": "этап 2 · резонанс",
        "items": [{
            "n": "ПЛАН_СИНГУЛЯР_02.md", "s": "≈12 КБ",
            "r": "генеральный план организма: фазы 0–7 + ДНК-отчёт (значение вшивается при загрузке)",
            "st": "live", "d": "plan02"}]})

    dna_js = (
        f"const AUDIO_B64='{audio_b64}';\n"
        f"const COVER_B64='{cover_b64}';\n"
        f"const LANGS={js_safe(langs)};\n"
        f"const PLACEHOLDERS={js_safe(ph)};\n"
        f"const META={js_safe(meta)};\n"
        f"const TASKFILES={js_safe(jdump(tf))};\n"
        f"const TASKDATA={js_safe(taskdata)};\n"
    )
    html = (head + body + "<script>\n" + eng1.replace("/*__DNA__*/", dna_js)
            + "\n" + eng2 + "\n</script>\n</body>\n</html>\n")
    # hard gate: executable JS region must not contain a raw </script>
    a = html.index("<script>\n") + len("<script>\n")
    b = html.rindex("</script>")
    payload = html[a:b]
    assert "</script" not in payload, "raw </script> inside JS payload!"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    return len(html)


def fake_dna():
    """Tiny valid DNA for headless UI testing."""
    # 0.4 s silent mono WAV → base64 (audio.play() may reject mime mismatch — harmless in test)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(8000)
        w.writeframes(b"\x00\x00" * 3200)
    audio_b64 = base64.b64encode(buf.getvalue()).decode()
    cover_b64 = ("/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a"
                 "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAA"
                 "AQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEA"
                 "AAAAAAAAAAAAAAAAAAAA/8QAFhEBAQEAAAAAAAAAAAAAAAAAAAER/9oADAMBAAIRAxEAPwCdABmX"
                 "/9k=")
    def lrc(name):
        return ("[by:test]\n[00:00.10]♪\n[00:00.15]строка первая " + name +
                "\n[00:00.22]строка вторая\n[00:00.28]♪\n[00:00.33]финал\n")
    langs = jdump({"ru-orig": {"n": "Русский оригинал", "lines": 3, "lrc": lrc("ru")},
                   "en": {"n": "English", "lines": 3, "lrc": lrc("en")},
                   "es": {"n": "Español", "lines": 3, "lrc": lrc("es")}})
    ph = jdump([{"t": "Цени время", "m": "2,5 млн · 4:28 · заглушка"},
                {"t": "Не жди завтра", "m": "701 тыс · 3:16 · заглушка"}])
    meta = jdump({"schema": "test", "version": "2.0.0",
                  "song": {"title": "Когда теряем", "artist": "OutShadow feat RUVSON",
                           "videoId": "rWpYxmFjm9g", "duration": 3.5, "source": "test"}})
    taskfiles = jdump({"built": "test", "groups": [
        {"t": "ТЕСТ", "c": "фейковая ДНК", "items": [
            {"n": "test.md", "s": "1 КБ", "r": "проверка сборки", "st": "live", "d": "master"}]}]})
    taskdata = jdump({"master": {"t": "txt", "m": "text/markdown", "f": "test.md", "v": "# test"}})
    return [audio_b64, cover_b64, langs, ph, meta, taskfiles, taskdata]


# ── real build ──
dna = [read(f"{DATA}/{n}.txt") for n in ("AUDIO_B64", "COVER_B64")]
dna += [read(f"{DATA}/{n}.json") for n in ("LANGS", "PLACEHOLDERS", "META", "TASKFILES", "TASKDATA")]
stamp = time.strftime("%d.%m.%Y %H:%M")
size = build(REAL_OUT, dna, stamp)
print(f"real build: {size:,} bytes ({size/1048576:.2f} МБ) → {REAL_OUT}")

# ── test build ──
size_t = build(TEST_OUT, fake_dna(), "test")
print(f"test build: {size_t:,} bytes → {TEST_OUT}")

# ── validate JS core of the real build with node --check ──
html = read(REAL_OUT)
a = html.index("<script>\n") + len("<script>\n")
b = html.rindex("</script>")
js = html[a:b]
core = f"{P}/s02_core_check.js"
with open(core, "w", encoding="utf-8") as f:
    f.write(js)
try:
    r = subprocess.run(["node", "--check", core], capture_output=True, text=True)
    print("node --check real core:", "OK" if r.returncode == 0 else "FAIL\n" + r.stderr[:2000])
    if r.returncode != 0:
        raise SystemExit(1)
except FileNotFoundError:
    print("node не найден — синтакс-проверка пропущена (не фатально, сборка продолжена)")

# ── sanity greps on the real build ──
for probe in ["const LANGS=", "const TASKDATA=", "lines[m].t", "LANGS[hl]", "planMD()",
              "toggleRes", "drawWeb", "dnaRun", "СИНГУЛЯР·02"]:
    assert probe in js or probe in html, f"probe missing: {probe}"
print("probes: OK; ДНК-данные на месте; фатальных паттернов v1.1 нет")
