/* Логические тесты ·16 Fusion + ·17 P2P (без DOM): asembly, SDP-пак, QR из страницы.
   Код извлекается из живых файлов репо; эталонная сверка QR с python qrcode — в test_qr_vs_python.py.
   Запуск: node ИНСТРУМЕНТЫ/test_s17_fusion.js */
const fs = require('fs'), vm = require('vm'), os = require('os'), path = require('path');
let fails = 0;
const check = (name, cond, extra) => { console.log((cond ? 'OK  ' : 'FAIL') + ' ' + name + (cond ? '' : ' — ' + (extra || ''))); if (!cond) fails++; };

/* ── 1. Fusion: извлекаем классы из ·16 ── */
const s16 = fs.readFileSync(path.join(__dirname, '..', 'СИНГУЛЯР_16_СУФЛЁР.html'), 'utf8');
const grab16 = (re) => s16.match(re)[0];
const busCode = grab16(/class SingulyarEventBus \{[\s\S]*?\n\}/);
const parserCode = grab16(/class SingulyarNoteChart \{[\s\S]*?\n\}(?=\n\/\* ── 4)/);
const fusionCode = grab16(/class SingulyarUltraStarAssembler \{[\s\S]*?\n\}(?=\n\n\/\* ── 7c)/);
const modPath = path.join(os.tmpdir(), 's16_fusion_classes.js');
fs.writeFileSync(modPath, busCode + '\n' + parserCode + '\n' + fusionCode + '\nmodule.exports = { SingulyarEventBus, SingulyarNoteChart, SingulyarUltraStarAssembler };');
const { SingulyarNoteChart, SingulyarUltraStarAssembler } = require(modPath);

const asm = new SingulyarUltraStarAssembler({ bpm: 120, bindWindow: 0.6, lineBreak: 1.5 });
/* DSP-ноты: мелодия с мелизмой (3 ноты на одно слово) и паузой 2 с для нарезки строк */
const dspNotes = [
    { start: 1.00, end: 1.40, pitch: 60 },
    { start: 1.40, end: 1.80, pitch: 62 },
    { start: 1.80, end: 2.20, pitch: 64 },
    { start: 4.50, end: 5.30, pitch: 65 },
    { start: 5.30, end: 5.70, pitch: 67 }
];
const lrc = [{ t: 1.0, words: 'теряем всё' }, { t: 4.4, words: 'свет в окне' }];
const words = asm.wordsFromLines(lrc);
check('words spread', words.length === 5 && Math.abs(words[0].t - 1.0) < 1e-9, JSON.stringify(words));

const r = asm.assemble(words, dspNotes, { title: 'Тест', bpm: 120 });
check('fusion stats total', r.stats.total === 5, JSON.stringify(r.stats));
check('fusion melisma ~', r.stats.melisma >= 2 && r.txt.includes('~'), JSON.stringify(r.stats));check('fusion linebreak', r.stats.lineBreaks >= 1 && r.txt.includes('- 0 0 0'), JSON.stringify(r.stats));
check('fusion headers', r.txt.startsWith('#TITLE:Тест') && r.txt.includes('#BPM:120') && r.txt.trim().endsWith('E'));

/* roundtrip: Fusion .txt должен парситься обратно родным парсером ·16 */
const p = new SingulyarNoteChart();
const back = p.parseUltraStar(r.txt);
check('fusion roundtrip count', back.length === 5, String(back.length));
check('fusion roundtrip pitch', back[0].pitch === 60 && back[4].pitch === 67, back.map(n => n.pitch).join(','));
check('fusion roundtrip melisma word', back[0].word !== '~' && (back[1].word === '~' || back[2].word === '~'), back.map(n => n.word).join('|'));

/* без слов: непривязанные ноты — «» (канон v1.36: слова нет — пусто; продолжение — «~») */
const r2 = asm.assemble([], dspNotes, {});
check('fusion no words → «»', r2.txt.split('\n').filter(l => l.startsWith(':')).every(l => l.split(' ').slice(4).join(' ') === ''));

/* ── 2. SDP-пак/анпак: SQ1 (deflate-raw), SQ2, SQ0 ── */
const s17 = fs.readFileSync(path.join(__dirname, '..', 'СИНГУЛЯР_17_ЗАЛ.html'), 'utf8');
const packCode = s17.match(/const SDP_B64[\s\S]*?async function sdUnpack\(str\) \{[\s\S]*?\n\}/)[0];
const sdMod = path.join(os.tmpdir(), 's17_sdp.js');
fs.writeFileSync(sdMod, packCode + '\nmodule.exports = { sdPack, sdUnpack };');
const { sdPack, sdUnpack } = require(sdMod);
(async () => {
    const obj = { type: 'offer', sdp: 'v=0\r\no=- 46117317... candidates .local\r\n'.repeat(40) };
    const c1 = await sdPack(obj);
    check('sdp pack SQ1', c1.startsWith('SQ1.'), c1.slice(0, 8));
    const u1 = await sdUnpack(c1);
    check('sdp roundtrip SQ1', u1.type === obj.type && u1.sdp === obj.sdp);
    const c0 = 'SQ0.' + Buffer.from(JSON.stringify(obj), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const u0 = await sdUnpack(c0);
    check('sdp roundtrip SQ0', u0.sdp === obj.sdp);
    const c2 = c1.replace('SQ1.', 'SQ2.');
    let ok2 = false; try { await sdUnpack(c2); } catch (e) { ok2 = true; }   /* SQ2 не декодится как SQ1 — должен упасть честно */
    check('sdp wrong tag fails', ok2);
    console.log('размер SQ1-кода:', c1.length, 'симв. для', JSON.stringify(obj).length, 'симв. JSON');

    /* ── 3. QR-класс страницы: детерминизм и полнота масок.
       Внешняя dev-копия (qr_dev.js) удалена из истории — эталонная сверка
       с python qrcode живёт в test_qr_vs_python.py (тоже без автора).
       Здесь: каждая из 8 масок строит валидную матрицу средствами самого
       класса, auto-encode выбирает минимум штрафа, результат детерминирован. ── */
    const tables = s17.match(/const QR_CAPL=[\s\S]*?(?=class SingulyarQR)/)[0];
    const qrPage = tables + '\n' + s17.match(/class SingulyarQR \{[\s\S]*?\n\}(?=\n\n\/\* ── 0b)/)[0];
    const qrMod = path.join(os.tmpdir(), 's17_qr.js');
    fs.writeFileSync(qrMod, qrPage + '\nmodule.exports = { SingulyarQR };');
    const { SingulyarQR: QRPage } = require(qrMod);
    /* принудительная маска — теми же внутренностями, что и auto-encode */
    QRPage.prototype.encodeMasked = function (text, mask) {
        const bytes = Array.from(new TextEncoder().encode(String(text)));
        const v = this.pickVersion(bytes.length);
        const cw = this.buildCodewords(bytes, v);
        const ctx = this.makeMatrix(v);
        this.placeData(ctx, cw);
        const t = { m: ctx.m.map((row) => Uint8Array.from(row)), fn: ctx.fn, size: ctx.size };
        this.applyMask(t, mask); this.drawFormat(t, mask);
        return { version: v, size: ctx.size, mask, modules: t.m };
    };
    const q = new QRPage();
    const sameM = (x, y) => x.version === y.version && x.size === y.size &&
        x.modules.every((row, i) => Array.from(row).join('') === Array.from(y.modules[i]).join(''));
    for (const t of ['hello', 'А'.repeat(120), 'https://rtynbirf.github.io/singulyar/СИНГУЛЯР_17_ЗАЛ.html#join=SQ1.abc', 'СИНГУЛЯР ·17 зал: ' + 'b'.repeat(600)]) {
        const auto = q.encode(t);
        const force = [];
        for (let m = 0; m < 8; m++) force.push(q.encodeMasked(t, m));
        const best = force.reduce((b, x) => q.penalty(x.modules, x.size) < q.penalty(b.modules, b.size) ? x : b, force[0]);
        check('qr auto == min-штраф маска v' + auto.version, sameM(auto, best), 'auto mask ' + auto.mask);
        check('qr детерминизм v' + auto.version, sameM(q.encode(t), auto));
    }

    console.log(fails ? '\nЕСТЬ ПРОВАЛЫ: ' + fails : '\nВСЕ ТЕСТЫ ПРОШЛИ');
    process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
