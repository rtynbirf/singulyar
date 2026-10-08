/* ═══════════════════════════════════════════════════════════════════
   СИНГУЛЯР · КРИСТАЛЛ — мосты модулей, v1.3.0
   ───────────────────────────────────────────────────────────────────
   НЕНОРМАТИВНЫЙ файл: потребители контракта, а не его часть.
   Ядро (crystal-core.mjs), журнал (journal.mjs) и схема не тронуты.

   Карта мостов (README кристалла):
     ·19 ЧЕЛОВЕК → identity.ref    — «эта личность живёт на устройстве»
     ·19 ЧЕЛОВЕК → hall.join       — «эта личность входит в зал»: публичный
                     ключ подписи + подпись факта (E2EE v2, верификация
                     через ·19: зал проверяет подпись, а не верит имени)
     ·22 СВЯЗЬ   → hall.epoch      — «в зале объявлена эпоха N» (ротация
                     ключей КРИПТЫ): ОТКРЫТОЕ событие — метаданные не
                     секрет (номер эпохи не ключ), текст честно открыт
     ·22 СВЯЗЬ   → call.signal     — «звонок как факт»: ring/accept/
                     decline/cancel/end — каждый акт звонка отдельное
                     неизменяемое событие (v1.23, как memory.decide);
                     SDP/ICE-рукопожатие — ТРАНСПОРТ, в журнал не пишется
                     (СМЫСЛ ≠ ТРАНСПОРТ); retention temporary — звонок
                     живая вещь, TTL зеркалит жизнь звонка
     ·18 ЗАЛ     → shared.activity — «в зале пели вместе» (сессия+память)
     ·18 ЗАЛ     → memory.decide   — «память решено хранить/забыть» (решение
                   человека — отдельное семантическое событие; идея синтеза
                   Human Runtime v0.1 «TTL ≠ MEMORY», проведённая нашим путём:
                   хранение и память — разные вещи, решение меняет семантику,
                   а не файл; события неизменяемы, решение = новое событие)

   Правила моста:
     • событие моста — обычный semantic.message из ЯДРА: вид смысла в
       conversation, структурированный payload в semantic.attachments;
     • секретов в событии НЕТ: identity.ref несёт id/имя/дату, ключи
       (приватный и публичный) остаются в ·19 — как E2EE в ·24;
     • idempotencyKey стабилен: повторная публикация = дедуп журнала,
       а не вторая копия факта;
     • сессия зала — temporary (TTL зеркалит GC зала), память ◈ —
       persistent: «временное умирает, постоянное живёт»;
     • память ссылается на сессию через semantic.replyTo (не мутируя её);
     • падение журнала — честный {ok:false, reason}, модуль работает
       без моста (fallback наблюдаем, не тихий).

   Стирание личности: журнал фактов не переписывается, но человек,
   стирающий личность с устройства, ожидает, что уйдёт и ref. Для этого
   забудьЛичность() делает адресное удаление СВОИХ событий из журнала
   (прецедент: clearAll() зовётся кнопкой модуля ·22). Чужие события
   (·22, ·18) не трогаются никогда.
   ═══════════════════════════════════════════════════════════════════ */

export const BRIDGES = Object.freeze({ name: 'singulyar-crystal-bridges', version: '1.3.0' });

export const РАЗГОВОРЫ = Object.freeze({
  identity: 'identity.ref',
  activity: 'shared.activity',
  call: 'call.signal'
});

/* id события должен быть стабилен и schema-легален (minLength 8).
   Для дегенеративно коротких ключей — детерминированный добор, не uuid:
   повторная публикация того же факта даёт ТОТ ЖЕ id. */
function стабильныйId(префикс, ключ) {
  const с = префикс + String(ключ == null ? '' : ключ);
  return с.length >= 8 ? с : (с + '00000000').slice(0, 8);
}

/* ── ·19: identity.ref ──
   личность: {id, имя, создана} из ·19. приватный/публичныйJWK сюда
   не входят и не должны: мост несёт ССЫЛКУ, не материал ключей. */
export function identityRefEvent(личность, надстройка = {}) {
  const л = личность || {};
  const вложение = {
    kind: 'identity.ref',
    id: String(л.id || ''),
    имя: String(л.имя || ''),
    создана: Number.isFinite(л.создана) ? л.создана : null,
    подписана: !!надстройка.подписана            /* сервер подтвердил подпись? */
  };
  return {
    event: {
      ver: '1.0.0', type: 'semantic.message',
      id: надстройка.id || стабильныйId('idref_', л.id),
      idempotencyKey: 'identity-ref:' + String(л.id || 'x'),
      from: '·19', conversation: РАЗГОВОРЫ.identity,
      createdAt: Date.now(),
      semantic: {
        text: 'Личность «' + вложение.имя + '» живёт на этом устройстве (ref)',
        attachments: [вложение],
        replyTo: null
      },
      policy: { retention: 'persistent', ttl: null },
      capabilities: ['text'],
      revision: 1
    },
    вложение: вложение
  };
}

/* ── ·19 → зал: hall.join (верификация личности, E2EE v2) ──
   Личность ·19 подписывает ФАКТ входа: {v, канал/зал, эпоха, id, имя,
   публичныйJWK}. Подпись (ECDSA над канонБайты, крипта.mjs v2) лежит
   во вложении — зал проверяет верьФакту и получает доказательство,
   что имя не подстава по проводу. Публичный JWK — только ПОДПИСНОЙ;
   приватные ключи и ECDH-материал сюда не входят и не должны.
   idempotencyKey включает эпоху: повторный вход в ту же эпоху — дедуп,
   новая эпоха — честно новое событие. */
export function hallJoinEvent(личность, надстройка = {}) {
  const л = личность || {};
  const вложение = {
    kind: 'hall.join',
    room: String(надстройка.room || ''),
    эпоха: Number.isInteger(надстройка.эпоха) ? надстройка.эпоха : null,
    участник: { id: String(л.id || ''), имя: String(л.имя || '') },
    публичныйJWK: л.публичныйJWK || null,
    подпись: String(надстройка.подпись || ''),
    подписана: !!надстройка.подпись
  };
  const текст = вложение.подписана
    ? 'Личность «' + вложение.участник.имя + '» вошла в зал ' + вложение.room + ' (подпись ·19 сошлась, эпоха ' + String(вложение.эпоха) + ')'
    : 'Личность «' + вложение.участник.имя + '» вошла в зал ' + вложение.room + ' (без подписи — верификации не было)';
  return {
    event: {
      ver: '1.0.0', type: 'semantic.message',
      id: надстройка.id || стабильныйId('join_', вложение.room + ':' + вложение.участник.id + ':' + String(вложение.эпоха)),
      idempotencyKey: 'hall-join:' + вложение.room + ':' + вложение.участник.id + ':' + String(вложение.эпоха),
      from: '·19', conversation: РАЗГОВОРЫ.activity,
      createdAt: Date.now(),
      semantic: { text: текст, attachments: [вложение], replyTo: null },
      policy: { retention: 'persistent', ttl: null },
      capabilities: ['text'],
      revision: 1
    },
    вложение: вложение
  };
}

/* ── ·22 → журнал: hall.epoch (объявление ротации ключей, E2EE v2) ──
   ОТКРЫТОЕ событие: номер эпохи — метаданные, не секрет (ключ из фразы
   выводится, а не передаётся). Инициатор подписывает факт — тот же
   рельс верьФакту, что у hall.join. Одна эпоха = одно объявление:
   idempotencyKey по (room, эпоха), переобъявление = дедуп. */
export function hallEpochEvent(надстройка = {}) {
  const вложение = {
    kind: 'hall.epoch',
    room: String(надстройка.room || ''),
    эпоха: Number.isInteger(надстройка.эпоха) ? надстройка.эпоха : null,
    причина: String(надстройка.причина || 'ротация'),
    инициатор: надстройка.инициатор || null,
    подпись: String(надстройка.подпись || ''),
    подписана: !!надстройка.подпись
  };
  const текст = 'В зале ' + вложение.room + ' объявлена эпоха ' + String(вложение.эпоха)
    + ' (' + вложение.причина + ')' + (вложение.подписана ? ' — подпись инициатора сошлась' : ' — без подписи');
  return {
    event: {
      ver: '1.0.0', type: 'semantic.message',
      id: надстройка.id || стабильныйId('epo_', вложение.room + ':' + String(вложение.эпоха)),
      idempotencyKey: 'hall-epoch:' + вложение.room + ':' + String(вложение.эпоха),
      from: '·22', conversation: РАЗГОВОРЫ.activity,
      createdAt: Date.now(),
      semantic: { text: текст, attachments: [вложение], replyTo: null },
      policy: { retention: 'persistent', ttl: null },
      capabilities: ['text'],
      revision: 1
    },
    вложение: вложение
  };
}

/* ── ·22 → журнал: call.signal — звонок как факт (v1.23) ──
   Каждый акт звонка — ОТДЕЛЬНОЕ неизменяемое событие (как memory.decide):
   ring «звоню», accept «принял», decline «отклонил», cancel «отменил сам»,
   end «завершён». idempotencyKey включает действие и инициатора акта:
   дедуп бережёт повторную публикацию того же акта, а не ход звонка —
   каждый переход звонка это честно новое событие. Подпись ·19 (рельс
   верьФакту, как у hall.join): звонок, подписанный личностью, отличим
   от подставы. TTL зеркалит жизнь звонка: звонок — живая вещь, журнал
   его факты держит временно. SDP/ICE сюда НЕ входят: это транспорт. */
export function callSignalEvent(надстройка = {}) {
  const ДЕЙСТВИЯ = ['ring', 'accept', 'decline', 'cancel', 'end'];
  const д = String(надстройка.действие || '');
  if (ДЕЙСТВИЯ.indexOf(д) === -1) throw new Error('действие должно быть ring|accept|decline|cancel|end');
  const вложение = {
    kind: 'call.signal',
    room: String(надстройка.room || ''),
    звонкаId: String(надстройка.звонкаId || ''),
    действие: д,
    канал: (надстройка.канал === 'video') ? 'video' : 'audio',
    от: надстройка.от || { id: '', имя: '' },
    кому: надстройка.кому || null,
    эпоха: Number.isInteger(надстройка.эпоха) ? надстройка.эпоха : null,
    причина: String(надстройка.причина || ''),
    подпись: String(надстройка.подпись || ''),
    подписана: !!надстройка.подпись
  };
  const СЛОВА = {
    ring: 'звонит', accept: 'принял звонок', decline: 'отклонил звонок',
    cancel: 'отменил звонок', end: 'завершил звонок'
  };
  const текст = вложение.от.имя + ' ' + СЛОВА[д] + ' (зал ' + вложение.room
    + ', ' + (вложение.канал === 'video' ? 'видео' : 'аудио') + ')'
    + (вложение.причина ? ' — ' + вложение.причина : '')
    + (вложение.подписана ? ' · подпись ·19 сошлась' : '');
  return {
    event: {
      ver: '1.0.0', type: 'semantic.message',
      id: надстройка.id || стабильныйId('звон_', вложение.звонкаId + ':' + д + ':' + вложение.от.id),
      idempotencyKey: 'call-signal:' + вложение.room + ':' + вложение.звонкаId + ':' + д + ':' + вложение.от.id,
      from: '·22', conversation: РАЗГОВОРЫ.call,
      createdAt: Date.now(),
      semantic: { text: текст, attachments: [вложение], replyTo: null },
      policy: { retention: 'temporary', ttl: Number.isFinite(надстройка.ttlMs) ? надстройка.ttlMs : 600000 },
      capabilities: ['text'],
      revision: 1
    },
    вложение: вложение
  };
}

/* ── ·18: shared.activity — сессия пения ──
   манифест: итоговыйМанифест() зала (room/participants/song/…).
   ttlMs зеркалит СРОК_ВРЕМЕННОЙ_MS зала: кристалл не умнее зала. */
export function activitySessionEvent(манифест, надстройка = {}) {
  const м = манифест || {};
  const имена = (м.participants || []).map(function (p) { return (p.emoji || '⬡') + ' ' + p.name; });
  const вложение = {
    kind: 'hall.session',
    room: String(м.room || надстройка.зал || ''),
    participants: (м.participants || []).map(function (p) {
      return { id: p.id, name: p.name, emoji: p.emoji, listener: !!p.listener };
    }),
    song: м.song ? { id: м.song.id, title: м.song.title } : null,
    startedAt: м.startedAt || null,
    endedAt: м.endedAt || null,
    durationMs: Number.isFinite(м.durationMs) ? м.durationMs : null,
    savePolicy: м.savePolicy || 'any',
    transport: м.transport || null,
    сессияId: String(надстройка.сессияId || '')
  };
  const текст = 'В зале ' + вложение.room + ' пели вместе: ' + (имена.join(' · ') || '—')
    + ' — «' + (вложение.song ? вложение.song.title : '—') + '»';
  return {
    event: {
      ver: '1.0.0', type: 'semantic.message',
      id: надстройка.id || стабильныйId('sess_', вложение.сессияId),
      idempotencyKey: 'hall-session:' + вложение.сессияId,
      from: '·18', conversation: РАЗГОВОРЫ.activity,
      createdAt: Date.now(),
      semantic: { text: текст, attachments: [вложение], replyTo: null },
      policy: { retention: 'temporary', ttl: Number.isFinite(надстройка.ttlMs) ? надстройка.ttlMs : null },
      capabilities: ['text'],
      revision: 1
    },
    вложение: вложение
  };
}

/* ── ·18: shared.activity — память ◈ ──
   Постоянный факт, ссылающийся на сессию (replyTo = id события сессии).
   Сессию при этом не трогаем: события неизменяемы. */
export function activityMemoryEvent(запись, надстройка = {}) {
  const з = запись || {};
  const м = з.manifest || {};
  const вложение = {
    kind: 'hall.memory',
    room: String(м.room || ''),
    сессияId: String(надстройка.сессияId || ''),
    savedAt: Number.isFinite(з.savedAt) ? з.savedAt : null,
    song: м.song ? { id: м.song.id, title: м.song.title } : null,
    участников: (м.participants || []).length,
    фото: !!з.photo,
    заметка: з.note ? String(з.note).slice(0, 120) : ''
  };
  return {
    event: {
      ver: '1.0.0', type: 'semantic.message',
      id: надстройка.id || стабильныйId('mem_', вложение.сессияId),
      idempotencyKey: 'hall-memory:' + вложение.сессияId,
      from: '·18', conversation: РАЗГОВОРЫ.activity,
      createdAt: Date.now(),
      semantic: {
        text: 'Память сохранена: зал ' + вложение.room + ' — «' + (вложение.song ? вложение.song.title : '—') + '»',
        attachments: [вложение],
        replyTo: надстройка.sessionEventId || null
      },
      policy: { retention: 'persistent', ttl: null },
      capabilities: ['text'],
      revision: 1
    },
    вложение: вложение
  };
}

/* ── ·18: shared.activity — решение о памяти (TTL ≠ MEMORY) ──
   Решение человека — ОТДЕЛЬНОЕ неизменяемое семантическое событие,
   ссылающееся на память/сессию через semantic.replyTo. remember =
   «хранить вечно по решению человека», expire = «забыть по решению
   человека». Хранение и память — разные вещи; решение меняет семантику,
   а не файл. Повторный акт решения (передумал) — НОВОЕ событие:
   idempotencyKey включает актId (или решеноAt), дедуп бережёт повторную
   публикацию того же акта, а не свободу передумать. */
export function memoryDecisionEvent(решение, надстройка = {}) {
  const р = (решение === 'remember' || решение === 'expire') ? решение : null;
  if (!р) throw new Error('решение должно быть remember|expire');
  const вложение = {
    kind: 'hall.memory.decide',
    решение: р,
    цель: String(надстройка.цельId || ''),
    комната: String(надстройка.комната || ''),
    решеноAt: Number.isFinite(надстройка.решеноAt) ? надстройка.решеноAt : Date.now()
  };
  const акт = надстройка.актId || String(вложение.решеноAt);
  const текст = р === 'remember'
    ? 'Память решено хранить (человек): зал ' + вложение.комната
    : 'Память решено забыть (человек): зал ' + вложение.комната;
  return {
    event: {
      ver: '1.0.0', type: 'semantic.message',
      id: надстройка.id || стабильныйId('dec_', вложение.цель + ':' + р + ':' + акт),
      idempotencyKey: 'hall-decide:' + вложение.цель + ':' + р + ':' + акт,
      from: '·18', conversation: РАЗГОВОРЫ.activity,
      createdAt: Date.now(),
      semantic: { text: текст, attachments: [вложение], replyTo: надстройка.цельСобытиеId || null },
      policy: { retention: 'persistent', ttl: null },
      capabilities: ['text'],
      revision: 1
    },
    вложение: вложение
  };
}

/* ── ФАБРИКА МОСТА: публикация в durable журнал с дедупом ──
   Журнал импортируется лениво; нет журнала — мост честно неготов.
   журнал (опция) — шов для тестов: подать свой объект с тем же
   контрактом (claimKey/hasKey/append/applyDelivery/all/count). */
export function makeBridge({ источник = 'модуль', ядро = null, журнал = null } = {}) {
  const С = { ядро: ядро, жу: журнал, готов: !!журнал, причина: журнал ? '' : '_journal loading_' };
  const готов = журнал ? Promise.resolve() : import('./journal.mjs').then(function (м) {
    С.жу = м; С.готов = true; С.причина = '';
  }).catch(function (е) {
    С.готов = false; С.причина = String((е && е.message) || е);
  });

  async function опубликуй(событие) {
    if (!С.готов || !С.жу) return { ok: false, reason: 'JOURNAL_UNAVAILABLE' };
    const свежий = await С.жу.claimKey(событие.idempotencyKey);
    if (!свежий) {
      /* claimKey=false ≠ «дубликат»: без IndexedDB дедуп невозможен.
        Смотрим был ли ключ НА САМОМ ДЕЛЕ занят (честный ярлык). */
      const был = await С.жу.hasKey(событие.idempotencyKey);
      return { ok: false, reason: был ? 'DUPLICATE' : 'JOURNAL_UNAVAILABLE' };
    }
    const записано = await С.жу.append(событие);
    if (!записано) return { ok: false, reason: 'APPEND_FAILED' };
    await С.жу.applyDelivery({
      eventId: событие.id, state: 'QUEUED', attempts: 0,
      history: [{ state: 'QUEUED', at: Date.now(), note: 'мост ' + источник + ': локальная публикация' }]
    });
    return { ok: true, reason: 'PUBLISHED', event: событие };
  }

  async function события(разговор) {
    if (!С.готов || !С.жу) return [];
    const все = await С.жу.all();
    return разговор ? все.filter(function (е) { return е.conversation === разговор; }) : все;
  }

  /* Адресное забвение СВОИХ identity-событий (см. шапку файла).
     Чужие события (·22 связь, ·18 активность) не трогаются. */
  async function забудьЛичность(личностьId) {
    if (!С.готов || !С.жу) return { ok: false, reason: 'JOURNAL_UNAVAILABLE' };
    try {
      return await _забудь(личностьId);
    } catch (е) { return { ok: false, reason: String((е && е.message) || е) }; }
  }

  async function _забудь(личностьId) {
    const б = await _открой();
    if (!б) return { ok: false, reason: 'NO_INDEXEDDB' };
    const события = await С.жу.all();
    const мои = события.filter(function (е) {
      return е.conversation === РАЗГОВОРЫ.identity
        && ((е.semantic && е.semantic.attachments) || []).some(function (в) {
          return в.kind === 'identity.ref' && в.id === String(личностьId);
        });
    });
    if (!мои.length) return { ok: true, удалено: 0 };
    return await new Promise(function (resolve) {
      let т;
      try { т = б.transaction(['events', 'seen', 'states'], 'readwrite'); }
      catch (е) { resolve({ ok: false, reason: 'TRANSACTION_FAILED' }); return; }
      const sE = т.objectStore('events'), sK = т.objectStore('seen'), sS = т.objectStore('states');
      мои.forEach(function (е) {
        try { sE.delete(е.id); sK.delete(е.idempotencyKey); sS.delete(е.id); } catch (х) {}
      });
      т.oncomplete = function () { resolve({ ok: true, удалено: мои.length }); };
      т.onerror = function () { resolve({ ok: false, reason: 'DELETE_FAILED' }); };
      т.onabort = function () { resolve({ ok: false, reason: 'DELETE_FAILED' }); };
    });
  }

  function _открой() {
    if (!('indexedDB' in globalThis)) return Promise.resolve(null);
    return new Promise(function (resolve) {
      let rq;
      try { rq = indexedDB.open('singulyar-crystal', 1); } catch (е) { resolve(null); return; }
      rq.onsuccess = function () { resolve(rq.result); };
      rq.onerror = function () { resolve(null); };
    });
  }

  return {
    get готов() { return С.готов; },
    get причина() { return С.причина; },
    источник: источник,
    готовь: готов,
    опубликуй: опубликуй,
    события: события,
    забудьЛичность: забудьЛичность
  };
}
