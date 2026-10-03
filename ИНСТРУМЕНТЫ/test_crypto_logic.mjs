/* Тест КРИПТЫ (v1.19): математика и честные границы.
   node --test ИНСТРУМЕНТЫ/test_crypto_logic.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  КРИПТА, ДОСТУПНО, ИТЕРАЦИИ,
  ключИзФразы, запечатай, вскрой,
  создайПару, секретПары, завери, верьПодписи,
  цепьСобытий, проверьЦепь
} from '../БИБЛИОТЕКИ/кристалл/крипта.mjs';
import { message } from '../БИБЛИОТЕКИ/кристалл/crystal-core.mjs';

test('КРИПТА: имя и версия на месте', () => {
  assert.equal(КРИПТА.name, 'singulyar-crystal-crypto');
  assert.equal(КРИПТА.version, '1.0.0');
});

test('КРИПТА: среда даёт WebCrypto (node ≥ 20)', () => {
  assert.equal(ДОСТУПНО, true, 'в тестовой среде WebCrypto обязан быть');
});

test('ключ зала: фраза → AES-ключ + стабильный kid', async () => {
  const а = await ключИзФразы('мы втроём', 'DOM01');
  const б = await ключИзФразы('мы втроём', 'DOM01');
  assert.equal(а.kid, б.kid, 'одинаковая фраза+код = одинаковый отпечаток');
  assert.equal(а.итерации, ИТЕРАЦИИ);
  assert.ok(а.kid.length === 16);
});

test('ключ зала: другая фраза = другой kid', async () => {
  const а = await ключИзФразы('мы втроём', 'DOM01');
  const б = await ключИзФразы('не скажу по проводу', 'DOM01');
  assert.notEqual(а.kid, б.kid);
});

test('ключ зала: тот же код зала, другая соль-часть = другой kid', async () => {
  const а = await ключИзФразы('фраза', 'DOM01');
  const б = await ключИзФразы('фраза', 'DOM02');
  assert.notEqual(а.kid, б.kid, 'соль зависит от кода зала');
});

test('ключ зала: пустая фраза = честный отказ', async () => {
  await assert.rejects(() => ключИзФразы('', 'DOM01'), /пустая фраза/);
});

test('запечатал→вскрыл: круг даёт исходный текст', async () => {
  const { ключ, kid } = await ключИзФразы('секрет семьи', 'DOM01');
  const печать = await запечатай('тёрка у караоке', ключ, kid);
  assert.equal(печать.alg, 'A256GCM');
  assert.equal(печать.kid, kid);
  assert.equal(печать.v, 1);
  const текст = await вскрой(печать, ключ);
  assert.equal(текст, 'тёрка у караоке');
});

test('запечатал→вскрыл: свежий IV на каждое сообщение (шифровки разные)', async () => {
  const { ключ, kid } = await ключИзФразы('секрет', 'DOM01');
  const п1 = await запечатай('одно и то же', ключ, kid);
  const п2 = await запечатай('одно и то же', ключ, kid);
  assert.notEqual(п1.iv, п2.iv, 'IV обязан быть свежим');
  assert.notEqual(п1.ct, п2.ct, 'одинаковый текст даёт разные шифровки');
});

test('чужой ключ не вскрывает: честная ошибка, не пустота', async () => {
  const к1 = await ключИзФразы('правильная фраза', 'DOM01');
  const к2 = await ключИзФразы('неправильная фраза', 'DOM01');
  const печать = await запечатай('приватное', к1.ключ, к1.kid);
  await assert.rejects(() => вскрой(печать, к2.ключ), /не вскрылось|подделан|чужой/);
});

test('подделка шифровки вскрывается отказом', async () => {
  const { ключ, kid } = await ключИзФразы('фраза', 'DOM01');
  const печать = { ...(await запечатай('честное', ключ, kid)) };
  const сломанный = new Uint8Array(Buffer.from(печать.ct, 'base64'));
  сломанный[0] ^= 0x01;
  печать.ct = Buffer.from(сломанный).toString('base64');
  await assert.rejects(() => вскрой(печать, ключ), /не вскрылось|подделан/);
});

test('печать формы не той — отказ до расшифровки', async () => {
  const { ключ } = await ключИзФразы('фраза', 'DOM01');
  await assert.rejects(() => вскрой({ alg: 'НЕТА', iv: '', ct: '' }, ключ), /не той формы/);
});

test('личность: пара создаётся, приватное non-extractable, публичное JWK', async () => {
  const л = await создайПару();
  assert.ok(л.id.startsWith('ид-'));
  assert.equal(л.обмен.privateKey.extractable, false, 'приватный ECDH нельзя вытащить');
  assert.equal(л.подпись.privateKey.extractable, false, 'приватный ECDSA нельзя вытащить');
  assert.ok(л.публичнаяОбмена.kty === 'EC' && л.публичнаяОбмена.crv === 'P-256');
  assert.ok(л.публичнаяПодпись.kty === 'EC' && л.публичнаяПодпись.crv === 'P-256');
});

test('секрет пары: у обеих сторон одинаков и работает (ECDH)', async () => {
  const а = await создайПару(), б = await создайПару();
  const сА = await секретПары(а.обмен.privateKey, б.публичнаяОбмена);
  const сБ = await секретПары(б.обмен.privateKey, а.публичнаяОбмена);
  const печать = await запечатай('только между нами', сА, 'pair');
  assert.equal(await вскрой(печать, сБ), 'только между нами');
});

test('подпись ECDSA: верна для своего, ложь для подделки', async () => {
  const л = await создайПару();
  const байты = new TextEncoder().encode('факт: в зале пели');
  const п = await завери(байты, л.подпись.privateKey);
  assert.equal(await верьПодписи(байты, п, л.публичнаяПодпись), true);
  const чужая = await создайПару();
  assert.equal(await верьПодписи(байты, п, чужая.публичнаяПодпись), false, 'чужой ключ не верифицирует');
  assert.equal(await верьПодписи(new TextEncoder().encode('подменённый факт'), п, л.публичнаяПодпись), false, 'подменённый факт не проходит');
});

function событие(текст, ид) {
  return message({ from: 'ПАША', conversation: 'зал-DOM01', text: текст, idempotencyKey: ид || ('идент-' + текст.length) });
}

test('цепь журнала: считается и проверяется', async () => {
  const события = [событие('первая'), событие('вторая'), событие('третья')];
  события.forEach((с, i) => { с.createdAt = 1000 + i; });
  const цепь = await цепьСобытий(события);
  assert.equal(цепь.версия, 1);
  assert.equal(цепь.звенья.length, 3);
  assert.equal(цепь.звенья[0].предХэш, '0'.repeat(64), 'первое звено растёт из нулевого корня');
  const вер = await проверьЦепь(события, цепь);
  assert.equal(вер.ok, true, вер.причина || '');
  assert.equal(вер.позиция, -1);
});

test('цепь журнала: подмена события ломает цепь в конкретном звене', async () => {
  const события = [событие('а'), событие('б'), событие('в')];
  события.forEach((с, i) => { с.createdAt = 1000 + i; });
  const цепь = await цепьСобытий(события);
  /* подделываем факт: третье событие получает чужой текст */
  события[2].semantic.text = 'подменённая тёрка';
  const вер = await проверьЦепь(события, цепь);
  assert.equal(вер.ok, false);
  assert.equal(вер.позиция, 2, 'разрыв указывает на подделанное звено');
});

test('цепь журнала: порядок детерминирован (перемешанный журнал даёт ту же цепь)', async () => {
  const события = [событие('а'), событие('б'), событие('в')];
  события.forEach((с, i) => { с.createdAt = 1000 + i; });
  const ц1 = await цепьСобытий(события);
  const перемешанные = [события[2], события[0], события[1]];
  const ц2 = await цепьСобытий(перемешанные);
  assert.equal(ц1.вершина, ц2.вершина);
});

test('ЗАПЕЧАТАННОЕ СОБЫТИЕ: plaintext не попадает в событие кристалла', async () => {
  const СЕКРЕТ = 'тёрка-про-кошелёк-бабушки';
  const { ключ, kid } = await ключИзФразы('фраза зала', 'DOM01');
  const печать = await запечатай(СЕКРЕТ, ключ, kid);
  /* как это делает ·22: текст-заглушка + вложение kind:sealed */
  const событие = message({
    from: 'ПАША', conversation: 'зал-DOM01',
    text: '🔒 запечатано · AES-GCM',
    attachments: [{ kind: 'sealed', alg: печать.alg, iv: печать.iv, ct: печать.ct, kid: печать.kid, v: печать.v }],
    idempotencyKey: 'идент-запечатанное'
  });
  событие.id = 'кр-тест12345';
  const сыр = JSON.stringify(событие);
  assert.ok(!сыр.includes(СЕКРЕТ), 'plaintext НЕТ ни в тексте, ни во вложениях');
  assert.equal(событие.semantic.text, '🔒 запечатано · AES-GCM', 'виден только честный ярлык');
  assert.equal(событие.semantic.attachments[0].kind, 'sealed');
  /* schema-инвариант: обязательные поля на месте */
  for (const поле of ['ver', 'type', 'id', 'from', 'conversation', 'createdAt', 'semantic', 'policy', 'revision']) {
    assert.ok(поле in событие, 'поле ' + поле + ' на месте');
  }
  /* а участник с ключом читает */
  const { ключ: к2 } = await ключИзФразы('фраза зала', 'DOM01');
  assert.equal(await вскрой(событие.semantic.attachments[0], к2), СЕКРЕТ);
});
