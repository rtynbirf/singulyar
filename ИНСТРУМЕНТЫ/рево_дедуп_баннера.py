# РЁВО-АВТОМАТ ДЕДУПА БАННЕРА (совет 6): автомат не пишет одно и то же дважды.
# Ищет пары маркеров <!--X:НАЧАЛО--> ... <!--X:КОНЕЦ--> ; если один X встречается в файле
# больше одного раза — остаются первая копия, дубли стираются. Дом сам убирает за собой.
import io, os, re, glob, sys

КОРЕНЬ = '/tmp/w8s'
ПАТТЕРН = re.compile(r'<!--([A-Za-zА-Яа-яЁё0-9_.:-]+):НАЧАЛО-->(.*?)<!--\1:КОНЕЦ-->\n?', re.S)
НЕ_СМОТРЕТЬ = {'.git', 'vendor', 'node_modules', 'server', 'ПРОЧНОЕ', '__pycache__'}

изменено = дублей = 0
отчёт = []
for экст in ('*.html', '*.md'):
    for путь in glob.glob(os.path.join(КОРЕНЬ, '**', экст), recursive=True):
        if НЕ_СМОТРЕТЬ.intersection(os.path.relpath(путь, КОРЕНЬ).split(os.sep)):
            continue
        t = io.open(путь, encoding='utf-8').read()
        копии = {}
        for м in ПАТТЕРН.finditer(t):
            копии.setdefault(м.group(1), []).append(м.span())
        дубли_тут = {к: v for к, v in копии.items() if len(v) > 1}
        if not дубли_тут:
            continue
        # стираем с конца, чтобы спаны не поехали
        спаны = [s for к in sorted(дубли_тут) for s in дубли_тут[к][1:]]
        for нач, кон_ in sorted(спаны, reverse=True):
            t = t[:нач] + t[кон_:]
        io.open(путь, 'w', encoding='utf-8').write(t)
        изменено += 1
        дублей += sum(len(v) - 1 for v in дубли_тут.values())
        отчёт.append('%s: %s' % (os.path.relpath(путь, КОРЕНЬ), {к: len(v) - 1 for к, v in дубли_тут.items()}))
print('файлов поправлено:', изменено, '| дубликатов баннера стёрто:', дублей)
for ст in отчёт[:12]:
    print('  ', ст[:150])
sys.stdout.flush()
