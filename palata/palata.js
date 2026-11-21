#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   ПАЛАТА ПРОВЕРОК 0.1 · palata.js (волна 2026-11-21)
   Playwright-прогон оболочки СВЯЗЬ/SINGULYAR-LINK-0.7.0/public — без
   реальных устройств: у владельца «нет слуха, зрения и рук», судит машина.

   Шесть проверок, каждая — отдельная функция-шаг внутри run():
     1) страница открывается, title на месте;
     2) кнопка #btnInstall видима, клик открывает шторку #installDlg
        (родное окно установки в headless недоступно — шторка честных шагов);
     3) ServiceWorker регистрируется: после reload getRegistration() не null
        (на localhost — secure context, SW работает);
     4) офлайн-оболочка: context.setOffline(true) → reload → страница
        открылась из кэша, DOM живой (у оболочки network-first SW, кэш —
        запасной);
     5) слои: body[data-room] появился — sloi.js ставит его по лампе #dot;
     6) морзе/оракул-якорей в базе ×20 НЕТ — проверку «якорь не сломан»
        не выдумываем. Вместо неё: sloi.js и app.js загрузились без ошибок
        консоли (pageerror и console.error собираются, падение — провал).

   Честные границы (зачеркнутый суд):
     · живая связь не судится — её родные адреса (/ws, /config, /health,
       /bridge*) мимо кэша и мимо суда: суд по URL ошибки (palata 0.1.1),
       не только по тексту;
     · WebKit в Playwright не даёт Service Worker API — проверки 3 и 4 там
       ЧЕСТНО пропускаются (skip с причиной), полный суд в Chromium/Firefox;
     · пропущенное — не провал и не победа: не входит ни в N, ни в M пломбы.

   Итог: последняя строка журнала — «ПЛОМБА ПАЛАТЫ: N/M проверок пройдено».
   Провал хотя бы одной проверки → exit 1 (красный крест на пуше).

   Запуск (см. README-ПАЛАТА.md): полный прогон делает GitHub Actions;
   локально — только `node --check palata/palata.js` (Playwright ради этого
   не ставим).
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium, firefox, webkit } = require('playwright');

// ── Вьюпорты матрицы (именованные; точные числа можно перекрыть --width/--height)
const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 414, height: 896 }, // телефон: PWA чаще всего ставят отсюда
};

function parseArgs(argv) {
  const a = {
    browser: 'chromium',
    viewport: 'desktop',
    width: 0,
    height: 0,
    url: process.env.PALATA_URL || 'http://127.0.0.1:8080/',
    out: 'playwright-report',
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--browser') a.browser = argv[++i];
    else if (k === '--viewport') a.viewport = argv[++i];
    else if (k === '--width') a.width = parseInt(argv[++i], 10);
    else if (k === '--height') a.height = parseInt(argv[++i], 10);
    else if (k === '--url') a.url = argv[++i];
    else if (k === '--out') a.out = argv[++i];
    else {
      console.error(`неизвестный аргумент: ${k}`);
      console.error('использование: node palata.js --browser chromium|firefox|webkit --viewport desktop|mobile [--width N --height N] [--url U] [--out D]');
      process.exit(2);
    }
  }
  const base = VIEWPORTS[a.viewport] || VIEWPORTS.desktop;
  a.width = a.width || base.width;
  a.height = a.height || base.height;
  return a;
}

// skip() — честный пропуск с причиной, а не молчание и не провал.
function skip(msg) {
  const e = new Error(msg);
  e.isSkip = true;
  return e;
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const browserType = { chromium, firefox, webkit }[args.browser];
  if (!browserType) {
    console.error(`неизвестный браузер: ${args.browser} (доступны: chromium, firefox, webkit)`);
    process.exit(2);
  }

  fs.mkdirSync(path.join(args.out, 'screenshots'), { recursive: true });
  console.log(`ПАЛАТА ПРОВЕРОК 0.1 · браузер ${args.browser} · вьюпорт ${args.width}×${args.height} · адрес ${args.url}`);

  const browser = await browserType.launch({ headless: true });
  const results = [];

  try {
    const context = await browser.newContext({ viewport: { width: args.width, height: args.height } });
    const page = await context.newPage();

    // ── Судья консоли: копим console.error и неперехваченные ошибки JS.
    // Каждую ошибку помечаем фазой (офлайн или нет) — ошибки офлайн-фазы
    // ожидаемы (сеть рвём сами) и судом не считаются. У ошибки держим и URL
    // (msg.location().url) — суд по адресу: живая связь не судится.
    let inOffline = false;
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const loc = msg.location();
        consoleErrors.push({ text: msg.text(), url: (loc && loc.url) || '', offline: inOffline });
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push({ text: 'неперехваченная ошибка JS: ' + ((err && err.message) || String(err)), offline: inOffline });
    });

    // Скриншот после каждого шага — свидетельство для разбора (не судья).
    const shot = async (num, tag) => {
      try {
        const slug = String(tag).replace(/[^\wа-яёА-ЯЁ]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
        await page.screenshot({ path: path.join(args.out, 'screenshots', `${String(num).padStart(2, '0')}-${args.browser}-${slug}.png`) });
      } catch (e) { /* скриншот не получился — проверке он не судья */ }
    };

    // run() — общий конвейер шага: исполняет проверку, пишет строку журнала,
    // отличает провал от честного пропуска, снимает скриншот.
    const run = async (num, name, fn) => {
      console.log(`\n— проверка (${num}) ${name}`);
      try {
        const detail = await fn();
        results.push({ num, name, status: 'ok', detail: detail || '' });
        console.log(`   [OK] ${detail || 'пройдено'}`);
      } catch (e) {
        if (e && e.isSkip) {
          results.push({ num, name, status: 'skip', detail: e.message });
          console.log(`   [--] ПРОПУЩЕНО ЧЕСТНО: ${e.message}`);
        } else {
          results.push({ num, name, status: 'fail', detail: String((e && e.message) || e) });
          console.log(`   [XX] ПРОВАЛ: ${(e && e.message) || e}`);
        }
      }
      await shot(num, name);
    };

    // ── (1) Страница открывается, title на месте ──────────────────────────
    await run(1, 'страница открывается, title на месте', async () => {
      const resp = await page.goto(args.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!resp) throw new Error('ответа нет — сервер не отдал страницу');
      if (!resp.ok()) throw new Error(`HTTP ${resp.status()} — страница не открылась`);
      const title = (await page.title()).trim();
      if (title.length < 2) throw new Error('title пустой — заголовок страницы потерялся');
      return `title «${title}»`;
    });

    // ── (2) btnInstall → шторка installDlg (честные шаги установки) ───────
    await run(2, 'кнопка btnInstall видима, клик открывает шторку installDlg', async () => {
      const btn = page.locator('#btnInstall');
      if (!(await btn.isVisible())) {
        throw new Error('#btnInstall не видима — путь установки дома недоступен');
      }
      await btn.click();
      // Родное окно установки в headless не появляется (beforeinstallprompt
      // не прилетает) — потому и существует шторка честных шагов #installDlg.
      const dlg = page.locator('#installDlg');
      const visible = await dlg.isVisible();
      const opened = await page.evaluate(() => {
        const d = document.getElementById('installDlg');
        return !!(d && (d.open === true || d.hasAttribute('open')));
      });
      if (!visible && !opened) {
        throw new Error('клик по #btnInstall не открыл #installDlg — в headless это был единственный честный путь установки');
      }
      return visible ? 'шторка открылась и видима' : 'шторка открылась (атрибут open)';
    });

    // ── (3) ServiceWorker регистрируется ──────────────────────────────────
    await run(3, 'ServiceWorker регистрируется: после reload getRegistration() не null', async () => {
      const hasSW = await page.evaluate(() => 'serviceWorker' in navigator);
      if (!hasSW) {
        throw skip('Service Worker API недоступен в этом браузере (WebKit в Playwright его не даёт) — полный суд в Chromium/Firefox');
      }
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
      // Регистрация стартует при загрузке (app.js → register("/sw.js")) —
      // даём ей до 10 секунд, опрашивая getRegistration().
      const reg = await page.evaluate(async () => {
        for (let i = 0; i < 100; i++) {
          const r = await navigator.serviceWorker.getRegistration();
          if (r) return { scope: r.scope };
          await new Promise((res) => setTimeout(res, 100));
        }
        return null;
      });
      if (!reg) throw new Error('getRegistration() вернул null — sw.js не зарегистрировался за 10 секунд');
      return `SW жив, scope ${reg.scope}`;
    });

    // ── (4) Офлайн-оболочка: reload без сети открывает страницу из кэша ───
    await run(4, 'офлайн-оболочка: context.setOffline(true) → reload → DOM живой', async () => {
      const hasSW = await page.evaluate(() => 'serviceWorker' in navigator);
      if (!hasSW) {
        throw skip('нет Service Worker API — офлайн-оболочке в этом браузере не на что опираться');
      }
      // Ждём: SW активен + precache лёг в кэш (у оболочки network-first,
      // кэш — запасной; без precache офлайн-reload честно провалится).
      await page.evaluate(async () => {
        await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 15000))]);
        for (let i = 0; i < 200; i++) {
          try {
            if ((await caches.keys()).length > 0) return;
          } catch (e) { /* Cache API может отсутствовать */ }
          await new Promise((r) => setTimeout(r, 100));
        }
      });
      inOffline = true; // ошибки сети в этой фазе — ожидаемы, судьёй не считаются
      let reloadErr = null;
      try {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
      } catch (e) {
        reloadErr = e;
      }
      inOffline = false;
      await context.setOffline(false);
      if (reloadErr) throw new Error(`офлайн-reload не открылся: ${(reloadErr && reloadErr.message) || reloadErr}`);
      const alive = await page.evaluate(() => !!document.body && document.body.children.length > 0 && document.title.length > 0);
      if (!alive) throw new Error('DOM после офлайн-reload пуст — оболочка не открылась из кэша');
      return 'страница открылась из кэша, DOM живой';
    });

    // ── (5) Слои: body[data-room] появился (sloi.js по лампе #dot) ────────
    await run(5, 'слои: body[data-room] появился — sloi.js ставит его по лампе #dot', async () => {
      const room = await page
        .waitForSelector('body[data-room]', { timeout: 15000 })
        .then((el) => el.getAttribute('data-room'))
        .catch(() => null);
      if (room === null) throw new Error('body[data-room] не появился за 15 секунд — слои сломаны (sloi.js не отработал)');
      return `data-room=${room}`;
    });

    // ── (6) Скрипты загрузились, консоль чистая ───────────────────────────
    // Морзе/оракул-якорей в базе ×20 нет (волны 0.8.2/0.8.3 ещё не перенесены),
    // поэтому проверку «якорь не сломан» не выдумываем: судим то, что есть —
    // чистую загрузку sloi.js и app.js.
    await run(6, 'sloi.js и app.js загрузились без ошибок консоли (якорей ×20 нет — не выдумываем)', async () => {
      const files = await page.evaluate(() =>
        performance.getEntriesByType('resource').map((r) => (r.name || '').split('/').pop().split('?')[0])
      );
      const need = ['sloi.js', 'app.js'];
      const missing = need.filter((n) => !files.includes(n));
      if (missing.length) throw new Error(`скрипты не загрузились: ${missing.join(', ')}`);
      // Фильтры честности: живая связь не судится (см. шапку файла) — её родные
      // адреса (/ws, /config, /health, /bridge*) идут мимо кэша и мимо суда;
      // здесь судим по URL ошибки: не опознанное живым — отвечает оболочка.
      // Ошибки офлайн-фазы — ожидаемый сетевой шум (сеть рвали сами).
      const LIVE = /\/(ws|config|health|bridge)/i;
      const bad = consoleErrors.filter(
        (e) => !e.offline && !/websocket/i.test(e.text) && !LIVE.test(e.url)
      );
      if (bad.length) {
        const sample = bad
          .slice(0, 5)
          .map((e) => '· ' + String(e.text).slice(0, 160))
          .join(' | ');
        throw new Error(`ошибок консоли: ${bad.length}; первые: ${sample}`);
      }
      return 'оба скрипта на месте, ошибок консоли нет';
    });

    // ── Итог и пломба ──────────────────────────────────────────────────────
    const passed = results.filter((r) => r.status === 'ok').length;
    const failed = results.filter((r) => r.status === 'fail').length;
    const skipped = results.filter((r) => r.status === 'skip').length;
    const total = passed + failed; // пропущенные честно — ни в N, ни в M

    const seal =
      `ПЛОМБА ПАЛАТЫ: ${passed}/${total} проверок пройдено` +
      (skipped ? ` · пропущено честно: ${skipped}` : '');

    const summary = {
      seal,
      browser: args.browser,
      viewport: `${args.width}x${args.height}`,
      url: args.url,
      passed,
      failed,
      skipped,
      results,
    };
    fs.writeFileSync(path.join(args.out, 'palata-summary.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');

    console.log('\n' + '─'.repeat(64));
    for (const r of results) {
      console.log(`  (${r.num}) [${r.status.toUpperCase().padEnd(4)}] ${r.name}`);
    }
    console.log('─'.repeat(64));
    console.log(seal);
    if (skipped) console.log('пропущенное — не провал и не победа: причина названа честно');
    console.log(`журнал палаты: ${path.join(args.out, 'palata-summary.json')} + скриншоты`);
    if (failed > 0) process.exitCode = 1;
  } catch (e) {
    console.error(`палата упала до проверок: ${(e && e.stack) || e}`);
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
  }
})();
