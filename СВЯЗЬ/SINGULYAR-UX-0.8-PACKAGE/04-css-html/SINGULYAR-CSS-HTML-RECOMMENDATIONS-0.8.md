# СИНГУЛЯР · CSS / HTML рекомендации 0.8

Практические правила и примеры, которые можно сразу класть в код.

---

## 1. Базовые токены (CSS-переменные)

```css
:root {
  /* Типографика */
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --text-base: 1.125rem;      /* 18px */
  --text-lg: 1.5rem;          /* 24px — крупный режим */
  --text-sm: 0.9375rem;       /* 15px */
  --leading: 1.45;

  /* Размеры касаний */
  --touch-min: 48px;
  --btn-height: 52px;
  --input-height: 56px;
  --gap: 12px;
  --gap-lg: 16px;

  /* Цвета — светлая тема */
  --bg: #ffffff;
  --bg-subtle: #f7f7f5;
  --text: #111111;
  --text-secondary: #555555;
  --border: #e5e5e5;
  --accent: #1a1a1a;
  --accent-text: #ffffff;
  --danger: #c62828;
  --success: #2e7d32;
  --focus-ring: #1565c0;

  /* Радиусы */
  --radius: 12px;
  --radius-sm: 8px;
}

/* Тёмная тема */
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #121212;
    --bg-subtle: #1c1c1e;
    --text: #f2f2f2;
    --text-secondary: #a0a0a0;
    --border: #333333;
    --accent: #ffffff;
    --accent-text: #111111;
    --danger: #ff8a80;
    --success: #81c784;
    --focus-ring: #90caf9;
  }
}

/* Режим высокого контраста */
[data-contrast="high"] {
  --bg: #000000;
  --text: #ffffff;
  --accent: #ffff00;
  --accent-text: #000000;
  --border: #ffffff;
  --danger: #ff0000;
  --success: #00ff00;
}
```

---

## 2. Базовая типографика и сброс

```css
html {
  font-size: 100%;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading);
  color: var(--text);
  background: var(--bg);
}

/* Крупный режим (из профиля) */
[data-large-text="true"] {
  --text-base: 1.5rem;     /* 24px */
  --text-lg: 1.75rem;
  --btn-height: 60px;
  --input-height: 64px;
  --touch-min: 56px;
}

h1, h2, h3 {
  font-weight: 650;
  line-height: 1.25;
  margin: 0 0 0.5em;
}

p {
  margin: 0 0 0.75em;
}
```

---

## 3. Кнопки

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--btn-height);
  min-width: var(--touch-min);
  padding: 0 1.25rem;
  font-family: inherit;
  font-size: 1em;
  font-weight: 600;
  line-height: 1.2;
  border: 2px solid transparent;
  border-radius: var(--radius);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.btn:focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 2px;
}

/* Главная кнопка */
.btn-primary {
  background: var(--accent);
  color: var(--accent-text);
}

/* Вторичная */
.btn-secondary {
  background: transparent;
  color: var(--text);
  border-color: var(--border);
}

/* Опасная (Срочно) */
.btn-danger {
  background: var(--danger);
  color: #fff;
}

/* Крупные сигналы / пиктограммы */
.btn-signal {
  min-height: 56px;
  padding: 0.75rem 1rem;
  font-size: 1.05em;
  gap: 0.5rem;
}
```

**HTML-пример:**
```html
<button class="btn btn-primary" type="button">Создать пространство</button>
<button class="btn btn-secondary" type="button">У меня уже есть ссылка</button>
<button class="btn btn-danger btn-signal" type="button">🆘 Срочно</button>
```

---

## 4. Поля ввода

```css
.input {
  display: block;
  width: 100%;
  min-height: var(--input-height);
  padding: 0 1rem;
  font-family: inherit;
  font-size: 1em;
  color: var(--text);
  background: var(--bg);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  appearance: none;
}

.input:focus {
  outline: none;
  border-color: var(--focus-ring);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--focus-ring) 25%, transparent);
}

.input::placeholder {
  color: var(--text-secondary);
  opacity: 1;
}
```

---

## 5. Комната — базовая сетка

```css
.room {
  display: flex;
  flex-direction: column;
  height: 100dvh;          /* важно для мобилок */
  max-height: 100dvh;
  overflow: hidden;
}

.room-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--gap);
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}

.room-messages {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 1rem;
  -webkit-overflow-scrolling: touch;
}

.room-composer {
  flex: 0 0 auto;
  padding: 0.75rem 1rem;
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
  background: var(--bg);
}
```

**HTML-скелет:**
```html
<div class="room">
  <header class="room-header">
    <button class="btn btn-secondary" aria-label="Назад">←</button>
    <div>
      <strong>Семья</strong>
      <span class="text-secondary">3 человека</span>
    </div>
    <button class="btn btn-secondary" aria-label="Меню">⋯</button>
  </header>

  <main class="room-messages" id="messages" role="log" aria-live="polite">
    <!-- сообщения -->
  </main>

  <footer class="room-composer">
    <!-- панель ввода -->
  </footer>
</div>
```

---

## 6. Адаптивная панель ввода

```css
.composer {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}

.composer-signals {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--gap);
}

.composer-row {
  display: flex;
  align-items: center;
  gap: var(--gap);
}

.composer-row .input {
  flex: 1 1 auto;
}
```

**Логика переключения (пример):**
```html
<!-- Обычный режим -->
<div class="composer" data-mode="text">
  <div class="composer-row">
    <input class="input" type="text" placeholder="Написать сообщение" enterkeyhint="send">
    <button class="btn btn-secondary" aria-label="Говорить">🎤</button>
    <button class="btn btn-secondary" aria-label="Ещё">+</button>
  </div>
</div>

<!-- Режим сигналов -->
<div class="composer" data-mode="signals">
  <div class="composer-signals">
    <button class="btn btn-signal">🟡 Подожди</button>
    <button class="btn btn-signal">👍 Понял</button>
    <button class="btn btn-signal">❤️ Люблю</button>
    <button class="btn btn-signal">📞 Позвони</button>
    <button class="btn btn-signal btn-danger">🆘 Срочно</button>
  </div>
  <div class="composer-row">
    <input class="input" type="text" placeholder="или напиши…">
    <button class="btn btn-secondary">🎤</button>
  </div>
</div>
```

Переключение режима — через `data-mode` на `.composer` и показ/скрытие нужных блоков (или полную замену через JS).

---

## 7. Сообщения

```css
.msg {
  max-width: 85%;
  margin-bottom: 0.75rem;
  padding: 0.6rem 0.9rem;
  border-radius: var(--radius);
  background: var(--bg-subtle);
}

.msg--mine {
  margin-left: auto;
  background: var(--accent);
  color: var(--accent-text);
}

.msg-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-bottom: 0.15rem;
}

.msg--mine .msg-meta {
  color: color-mix(in srgb, var(--accent-text) 75%, transparent);
}
```

---

## 8. Шторка (bottom sheet)

```css
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 40;
}

.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 85dvh;
  overflow-y: auto;
  background: var(--bg);
  border-radius: 16px 16px 0 0;
  padding: 1.25rem 1rem max(1.25rem, env(safe-area-inset-bottom));
  z-index: 50;
  transform: translateY(100%);
  transition: transform 0.25s ease;
}

.sheet.is-open {
  transform: translateY(0);
}
```

---

## 9. Доступность — обязательные вещи

```html
<!-- Живой регион для новых сообщений -->
<main id="messages" role="log" aria-live="polite" aria-relevant="additions">

<!-- Кнопки только с иконками всегда имеют aria-label -->
<button class="btn" aria-label="Говорить">🎤</button>

<!-- Фокус никогда не теряется -->
:focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 2px;
}

/* Уважение к reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## 10. Минимальный набор data-атрибутов профиля

```html
<body
  data-large-text="true"
  data-contrast="high"
  data-tts="true"
  data-vibrate="true"
  data-input-mode="signals"
  data-lang="ru"
>
```

JS при входе в комнату читает профиль человека и выставляет эти атрибуты. CSS и компоненты реагируют на них.

---

## 11. Что проверить в DevTools

1. Режим крупного текста → всё реально увеличивается.
2. `prefers-color-scheme: dark` → цвета корректны.
3. `prefers-reduced-motion: reduce` → нет анимаций.
4. Ширина 320 px → ничего не ломается, кнопки не схлопываются.
5. Контраст через Accessibility panel ≥ 7:1.
6. Tab-навигация проходит все интерактивные элементы по порядку.

---

Эти правила можно копировать почти буквально. Они закрывают требования спецификации 0.8 по размерам, контрасту, адаптивности панели и доступности.
