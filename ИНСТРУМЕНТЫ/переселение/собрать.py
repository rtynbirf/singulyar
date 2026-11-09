# -*- coding: utf-8 -*-
"""СОБРАТЬ — фаза 2 «переселение глобалов»: manifest.json + части/ → прод-HTML.

Закон: head + Σ(tag + тело + after) + tail. Результат обязан совпасть
с источником байт-в-байт (sha256 в manifest). Совпадение — зелёная лампа;
расхождение — СТОП, переселение устарело (кто-то правил прод напрямую).

Запуск:
  python3 собрать.py                    # сборка + самопроверка по sha256 источника
  python3 собрать.py <эталон.html>      # + байт-сравнение с живым/репо файлом
"""
import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def main() -> int:
    out = HERE / 'собрано.html'
    manifest = json.loads((HERE / 'manifest.json').read_text(encoding='utf-8'))
    src = manifest['источник']

    pieces = [manifest['head']]
    for rec in manifest['порядок']:
        body = (HERE / rec['файл']).read_text(encoding='utf-8')
        pieces.append(rec['tag'])
        pieces.append(body)
        pieces.append(rec['закрытие'])
        if 'after' in rec:
            pieces.append(rec['after'])
    pieces.append(manifest['tail'])

    built = ''.join(pieces).encode('utf-8')
    out.write_bytes(built)
    built_sha = hashlib.sha256(built).hexdigest()

    ok_self = built_sha == src['sha256']
    ok_len = len(built) == src['байт']
    print(f'СОБРАНО: {out.name} — {len(built)} Б (источник {src["байт"]} Б)')
    print(f'sha256 сборки : {built_sha}')
    print(f'sha256 источн.: {src["sha256"]}')
    print(f'длина: {"✓" if ok_len else "✗ РАСХОЖДЕНИЕ"} | sha: {"✓ БАЙТ-В-БАЙТ" if ok_self else "✗ РАСХОЖДЕНИЕ"}')

    verdict = ok_self and ok_len
    if len(sys.argv) > 1:
        ref = Path(sys.argv[1]).read_bytes()
        same = ref == built
        print(f'эталон {Path(sys.argv[1]).name}: {len(ref)} Б — {"✓ ИДЕНТИЧЕН" if same else "✗ ОТЛИЧАЕТСЯ"}')
        verdict = verdict and same
    print('ЛАМПА: ЗЕЛЁНАЯ — переселение честно' if verdict else 'ЛАМПА: КРАСНАЯ — прод меняли напрямую; перезапусти разобрать.py')
    return 0 if verdict else 1


if __name__ == '__main__':
    sys.exit(main())
