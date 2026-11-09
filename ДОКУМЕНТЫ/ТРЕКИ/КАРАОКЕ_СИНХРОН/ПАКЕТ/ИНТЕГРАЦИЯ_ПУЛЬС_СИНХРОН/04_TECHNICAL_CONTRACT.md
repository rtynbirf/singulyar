================================================================================
ТЕХНИЧЕСКИЙ КОНТРАКТ
================================================================================

1. Данные
--------------------------------------------------------------------------------
Интерфейс синхрона (TypeScript-стиль):

interface SyncUnit {
  text: string;
  startMs: number;
  endMs: number;
  level: "line" | "word" | "syllable" | "letter";
  optional?: {
    confidence?: number;
    source?: "human" | "ai" | "hybrid";
  }
}

interface SongSync {
  songId: string;
  version: string;
  units: SyncUnit[];
  globalOffsetMs?: number;
  created: string;
  modified: string;
}

2. Хранение
--------------------------------------------------------------------------------
- IndexedDB (ключ: songId + version)
- Возможность экспорта в файл (Enhanced LRC)
- Возможность вшития в статический HTML (для полностью офлайн-дистрибуции)

3. API модуля (внутренний)
--------------------------------------------------------------------------------
- loadSync(songId)
- saveSync(songId, data)
- applyToPulse(songId)          ← сообщает Текст-пульсу использовать этот синхрон
- exportEnhancedLRC(songId)
- importEnhancedLRC(file)

4. Fallback-цепочка
--------------------------------------------------------------------------------
letter → syllable → word → line → plain text
Человек всегда может принудительно выбрать уровень.
