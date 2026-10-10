# -*- coding: utf-8 -*-
"""РАЗОБРАТЬ — фаза 2 «переселение глобалов»: прод-HTML → части/ + manifest.json.

Закон дома (урок a9140e74): экстракция честная — тела блоков вырезаются по
границам тегов целиком, ничего не дорезается по первому '};'. Каждое JS-тело
после вырезания проходит `node --check`, JSON-тело — json.loads.
Выход обязан быть обратим: собрать.py восстанавливает файл байт-в-байт.

Запуск:  python3 разобрать.py <вход.html> [каталог-части]
По умолчанию вход — ../prod/live_v1037.html (живой байт v10.37).
"""
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

SIG_OVERRIDES = {
    # сигнатура (первые ~60 симв. тела) → разумное имя части
    'window.__errlog': 'errlog',
    'window.SONG = ': 'SONG_данные',
    '{"prefetch"': 'prefetch_speculationrules',
    '/* дом ставится в офлайн целиком': 'офлайн_двери',
    '/* v9.7 «ТОМОГРАФ»': 'томограф_сообщений',
    '/* v10.1 «АДАПТ» — SNG-ПУЛЬТ': 'адапт_sng',
    '/* v10.14 «КРЫША» · инлайн-библиотека QR': 'qr_библиотека',
    '/* v10.20 «ЭТАЛОН» · инлайн-библиотека WebRTC': 'peerjs_библиотека',
    '/* ── С14 · АРБИТР': 'арбитр_с14',
    '/* ── С15+С16 · ЧЕТВЁРКА': 'четвёрка_с15_16',
    '/* ── С17 · СКЛАД': 'склад_с17',
    '/* ── С18 · СТРОЙ': 'строй_с18',
    '/* ── С19 · КОНВЕЙЕР': 'конвейер_с19',
    '/* ── ЗДОРОВЬЕ v8→v9': 'здоровье',
    '/* ═══════════════ ЛАДОМ · движок': 'движок',
    '/* ═══════════════ ДЕРЖИ НОТУ': 'держи_ноту',
    '/* ═══════════════ НА ВСЕ СЛУЧАИ ЖИЗНИ': 'сцены_языки_доступность',
    '/* ═══════════════ ТЕКСТ-ПУЛЬС': 'текст_пульс',
    '/* ═══════════════ СВОБОДА': 'свобода',
    '/* ═══════════════ ПУЛЬТ': 'пульт_v5',
    '/* ═══════════════ ЛАБ': 'лаб_v7',
    '/* ═══════════ БИРКА АВТОРА': 'бирка_автора',
}


KEYWORDS = [
    # (ключевая фраза в первых 400 симв. тела) → имя части — для баннеров,
    # чей титул живёт на второй строке после линейки ═
    ('«ПАРАМЕТР»', 'пульт_параметр_i11'),
    ('КРЫША ·31', 'крыша_31'),
    ('С20 · ЗАЛ', 'зал_с20'),
]


def slug_for(tag: str, body: str, kind: str, idx: int) -> str:
    if kind == 'style':
        return f'стиль_{idx:02d}'
    probe = body[:400]
    for key, name in KEYWORDS:
        if key in probe:
            return name
    head60 = body.lstrip()[:60]
    for sig, name in SIG_OVERRIDES.items():
        if head60.startswith(sig):
            return name
    if kind == 'script' and 'src=' in tag:
        m = re.search(r'src="([^"]+)"', tag)
        base = (m.group(1).split('/')[-1] if m else f'внешний_{idx}')
        return 'ext_' + re.sub(r'[^0-9A-Za-zА-Яа-яЁё_.-]+', '_', base)[:40]
    if kind == 'script' and 'speculationrules' in tag:
        return 'prefetch_speculationrules'
    # баннер-комментарий → имя
    t = body.lstrip()
    if t.startswith('/*'):
        line = t.split('\n', 1)[0]
        line = re.sub(r'^/\*+|\*+/\s*$', '', line).strip()
        line = re.sub(r'[═─=_]{3,}', ' ', line)
        line = re.sub(r'\s+', ' ', line).strip(' -·—:v0123456789 ')
        name = re.split(r'[·—]', line)[0].strip(' -·—')
        name = re.sub(r'[^0-9A-Za-zА-Яа-яЁё]+', '_', name).strip('_')
        if name:
            return name[:34]
    # первое глобальное присваивание
    m = re.match(r'(?:var|let|const)?\s*(?:window\.)?([A-Za-zА-Яа-яЁё_][\w]*)\s*=', t)
    if m:
        return m.group(1)
    return f'блок_{idx:02d}'


def main() -> int:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE.parent / 'prod' / 'live_v1037.html'
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else HERE
    parts_dir = out_dir / 'части'
    parts_dir.mkdir(parents=True, exist_ok=True)

    raw = src.read_bytes()
    text = raw.decode('utf-8')
    sha = hashlib.sha256(raw).hexdigest()

    # --- все события <script>/<style> по порядку документа ---
    events = []
    for m in re.finditer(r'<(script|style)\b[^>]*>', text, re.I):
        kind = m.group(1).lower()
        tag_end = text.find('>', m.start())
        close = text.find(f'</{kind}', tag_end)
        if close < 0:
            print(f'БРАК: тег {kind} на L{text.count(chr(10), 0, m.start())+1} без закрытия')
            return 1
        events.append({'kind': kind, 'tag_start': m.start(), 'tag_end': tag_end,
                       'body_start': tag_end + 1, 'body_end': close,
                       'tag': text[m.start():tag_end + 1]})

    used = set()
    records = []
    for i, ev in enumerate(events):
        body = text[ev['body_start']:ev['body_end']]
        # зазор ПОСЛЕ блока: от конца закрывающего тега до старта СЛЕДУЮЩЕГО тега
        # (у последнего блока — до EOF; станет tail). Урок красной лампы:
        # зазор без границы «до следующего» раздувается до остатка документа.
        close_end = ev['body_end'] + len('</' + ev['kind'])
        if close_end < len(text) and text[close_end] == '>':
            close_end += 1
        close_str = text[ev['body_end']:close_end]  # '</script>' как в оригинале
        nxt = events[i + 1]['tag_start'] if i + 1 < len(events) else len(text)
        after = text[close_end:nxt]
        base = slug_for(ev['tag'], body, ev['kind'], i)
        name = base
        k = 2
        while name in used:
            name = f'{base}_{k}'
            k += 1
        used.add(name)
        ext = {'script': 'js', 'style': 'css'}[ev['kind']]
        if ev['kind'] == 'script' and 'speculationrules' in ev['tag']:
            ext = 'json'
        fname = f'{i:02d}_{name}.{ext}'
        (parts_dir / fname).write_text(body, encoding='utf-8', newline='')
        # --- честная поверка тела ---
        check = 'none'
        if ext == 'js':
            r = subprocess.run(['node', '--check', str(parts_dir / fname)],
                               capture_output=True, text=True)
            check = 'js-ok' if r.returncode == 0 else f'js-FAIL: {r.stderr.strip()[:200]}'
        elif ext == 'json':
            try:
                json.loads(body)
                check = 'json-ok'
            except Exception as e:  # noqa: BLE001
                check = f'json-FAIL: {e}'
        records.append({
            'i': i, 'kind': ev['kind'], 'tag': ev['tag'], 'after': after,
            'файл': f'части/{fname}', 'закрытие': close_str,
            'символов': len(body), 'байт': len(body.encode('utf-8')),
            'строка_тега': text.count('\n', 0, ev['tag_start']) + 1,
            'поверка': check,
        })

    head = text[:events[0]['tag_start']] if events else text
    tail = ''
    if events:
        tail = records[-1].pop('after')  # хвост после последнего блока — до EOF

    manifest = {
        'источник': {
            'файл': src.name, 'байт': len(raw), 'sha256': sha,
            'версия': 'v10.37 «КАЗНАЧЕЙ»',
            'откуда': 'живой Pages @ 4cd1250 (cache-bust, 2026-10-10)',
        },
        'закон': 'собрать.py: head + Σ(tag + тело + закрытие + after) + tail — байт-в-байт',
        'head': head, 'tail': tail,
        'порядок': records,
    }
    (out_dir / 'manifest.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=1), encoding='utf-8', newline='')

    ok = all(r['поверка'] in ('none', 'js-ok', 'json-ok') for r in records)
    js_cnt = sum(1 for r in records if r['поверка'] == 'js-ok')
    json_cnt = sum(1 for r in records if r['поверка'] == 'json-ok')
    inline_bytes = sum(r['байт'] for r in records)
    print(f'РАЗОБРАН: {src.name} ({len(raw)} Б, sha {sha[:16]}…) → {len(records)} частей')
    print(f'  node --check: {js_cnt}/{sum(1 for r in records if r["поверка"].startswith("js"))} ok | json: {json_cnt} ok')
    print(f'  байт в частях: {inline_bytes} | head {len(head)} Б | tail {len(tail)} Б')
    for r in records:
        flag = '' if r['поверка'] in ('none', 'js-ok', 'json-ok') else '  <<< БРАК'
        print(f"  #{r['i']:02d} {r['файл']:<46} {r['байт']:>8} Б L{r['строка_тега']:<5} {r['поверка']}{flag}")
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
