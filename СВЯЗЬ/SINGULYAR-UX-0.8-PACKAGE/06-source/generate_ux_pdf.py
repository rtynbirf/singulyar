#!/usr/bin/env python3
"""Generate SINGULYAR UX Specification 0.8 as a clean PDF."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, ListFlowable, ListItem, HRFlowable
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register fonts that support Cyrillic
import os
font_paths = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]

# Try DejaVu first (best Cyrillic support)
try:
    pdfmetrics.registerFont(TTFont('DejaVu', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('DejaVu-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
    MAIN_FONT = 'DejaVu'
    BOLD_FONT = 'DejaVu-Bold'
except:
    MAIN_FONT = 'Helvetica'
    BOLD_FONT = 'Helvetica-Bold'

OUTPUT = "/home/workdir/artifacts/SINGULYAR-UX-SPEC-0.8.pdf"

page_width, page_height = A4
margin = 18 * mm

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=margin,
    rightMargin=margin,
    topMargin=16 * mm,
    bottomMargin=16 * mm
)

# Colors
ACCENT = HexColor("#1a1a1a")
LIGHT_GRAY = HexColor("#f5f5f5")
MED_GRAY = HexColor("#666666")
RED = HexColor("#c62828")
GREEN = HexColor("#2e7d32")

styles = getSampleStyleSheet()

styles.add(ParagraphStyle(
    name='MainTitle',
    fontName=BOLD_FONT,
    fontSize=22,
    leading=28,
    spaceAfter=6,
    textColor=ACCENT,
    alignment=TA_CENTER
))

styles.add(ParagraphStyle(
    name='SubTitle',
    fontName=MAIN_FONT,
    fontSize=11,
    leading=14,
    spaceAfter=20,
    textColor=MED_GRAY,
    alignment=TA_CENTER
))

styles.add(ParagraphStyle(
    name='Section',
    fontName=BOLD_FONT,
    fontSize=14,
    leading=18,
    spaceBefore=16,
    spaceAfter=8,
    textColor=ACCENT
))

styles.add(ParagraphStyle(
    name='SubSection',
    fontName=BOLD_FONT,
    fontSize=11,
    leading=14,
    spaceBefore=10,
    spaceAfter=4,
    textColor=ACCENT
))

styles.add(ParagraphStyle(
    name='Body',
    fontName=MAIN_FONT,
    fontSize=9.5,
    leading=13,
    spaceAfter=4,
    textColor=black,
    alignment=TA_JUSTIFY
))

styles.add(ParagraphStyle(
    name='BodySmall',
    fontName=MAIN_FONT,
    fontSize=8.5,
    leading=11,
    spaceAfter=3,
    textColor=black
))

styles.add(ParagraphStyle(
    name='BulletText',
    fontName=MAIN_FONT,
    fontSize=9,
    leading=12,
    leftIndent=12,
    spaceAfter=2
))

styles.add(ParagraphStyle(
    name='CodeBlock',
    fontName=MAIN_FONT,
    fontSize=8,
    leading=10,
    leftIndent=6,
    spaceAfter=2,
    textColor=HexColor("#333333"),
    backColor=LIGHT_GRAY
))

styles.add(ParagraphStyle(
    name='TableCell',
    fontName=MAIN_FONT,
    fontSize=8,
    leading=10,
    textColor=black
))

styles.add(ParagraphStyle(
    name='Footer',
    fontName=MAIN_FONT,
    fontSize=8,
    textColor=MED_GRAY,
    alignment=TA_CENTER
))

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=HexColor("#dddddd"), spaceBefore=6, spaceAfter=6)

def p(text, style='Body'):
    return Paragraph(text, styles[style])

def sp(h=6):
    return Spacer(1, h)

story = []

# ===== TITLE =====
story.append(Paragraph("СИНГУЛЯР", styles['MainTitle']))
story.append(Paragraph("UX-спецификация 0.8", styles['MainTitle']))
story.append(sp(4))
story.append(Paragraph(
    "Рабочая спецификация · 12 ноября 2026<br/>"
    "Приведение интерфейса 0.7.0 к лучшим практикам юзабилити и эргономики<br/>"
    "Философия: человек важнее канала",
    styles['SubTitle']
))
story.append(hr())

# ===== 1. IA =====
story.append(Paragraph("1. Информационная архитектура", styles['Section']))
story.append(p(
    "Главный принцип: <b>90% времени человек находится в «Комнате»</b>. "
    "Всё остальное — либо вход, либо редкие настройки."
))
story.append(sp(4))
story.append(p("• Вход / Создание → Создать пространство · Войти по ссылке · Прямая связь без сервера", 'BulletText'))
story.append(p("• Комната (основной экран) → Лента · Адаптивная панель ввода · Участники · Быстрые действия", 'BulletText'))
story.append(p("• Профиль доступности → Зрение · Слух · Моторика/Ввод · Язык · Канал", 'BulletText'))
story.append(p("• Системные → Мои пространства · Честные границы · О проекте", 'BulletText'))

# ===== 2. Principles =====
story.append(Paragraph("2. Принципы, которые нельзя нарушать", styles['Section']))
principles = [
    "Человек важнее канала.",
    "Сложность спрятана, простота — на поверхности.",
    "Честные границы важнее красивых обещаний.",
    "Один главный фокус на экране.",
    "Профиль доступности — свойство человека, а не куча флажков на главном экране.",
    "Адаптивная панель ввода — обязательна.",
    "Все тексты — короткие и прямые."
]
for pr in principles:
    story.append(p(f"• {pr}", 'BulletText'))

# ===== 3. Screens =====
story.append(Paragraph("3. Ключевые экраны (структура)", styles['Section']))

story.append(Paragraph("3.1. Вход / Создание", styles['SubSection']))
story.append(p(
    "Максимально простой экран. Большое поле названия + огромная кнопка «Создать пространство». "
    "Вторичная ссылка «У меня уже есть ссылка». Блок «Прямая связь без сервера» — свёрнут по умолчанию. "
    "Никаких чекбоксов доступности на этом экране."
))

story.append(Paragraph("3.2. Комната", styles['SubSection']))
story.append(p(
    "Лента сообщений занимает основной объём. Внизу — адаптивная панель ввода. "
    "Шапка: название пространства + количество участников + меню ⋯. "
    "Панель меняется в зависимости от профиля человека (обычный / сигналы / морзе / только голос / пиктограммы)."
))

story.append(Paragraph("3.3. Профиль доступности", styles['SubSection']))
story.append(p(
    "Группы: Зрение, Слух, Как писать, Язык. Каждый пункт — одна строка + короткий поясняющий текст. "
    "Вверху — превью «так будут выглядеть сообщения для тебя». Большая кнопка «Готово»."
))

story.append(Paragraph("3.4. Шторка участников + Приглашение", styles['SubSection']))
story.append(p(
    "Под каждым участником видно канал (СМС · кнопочный телефон / WhatsApp / Браузер). "
    "Это снижает тревогу («почему он молчит»). Приглашение — ссылка + QR + список возможных способов входа."
))

# ===== 4. Input panel =====
story.append(Paragraph("4. Адаптивная панель ввода", styles['Section']))

data = [
    [p("<b>Профиль</b>", 'TableCell'), p("<b>Что показывает панель</b>", 'TableCell')],
    [p("Обычный", 'TableCell'), p("Поле текста + микрофон + «+»", 'TableCell')],
    [p("Нужны сигналы", 'TableCell'), p("Крупные сигналы + поле текста", 'TableCell')],
    [p("Не читает / пиктограммы", 'TableCell'), p("Только крупные пиктограммы", 'TableCell')],
    [p("Морзе", 'TableCell'), p("Клавиатура · − Буква Слово", 'TableCell')],
    [p("Только голос", 'TableCell'), p("Огромная кнопка «Говорить»", 'TableCell')],
    [p("Крупный текст", 'TableCell'), p("Те же элементы, увеличенные", 'TableCell')],
]

t = Table(data, colWidths=[55*mm, 120*mm])
t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), LIGHT_GRAY),
    ('GRID', (0, 0), (-1, -1), 0.4, HexColor("#cccccc")),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
]))
story.append(t)
story.append(sp(4))
story.append(p(
    "Панель читает профиль при входе и сразу подстраивается. "
    "Временное переключение возможно через «+». После выхода временный режим сбрасывается."
))

# ===== 5. Visual =====
story.append(Paragraph("5. Визуальные требования (эргономика)", styles['Section']))
story.append(Paragraph("Размеры", styles['SubSection']))
story.append(p("• Основной текст: 18–20 px · Крупный режим: 24–28 px", 'BulletText'))
story.append(p("• Высота кнопок: минимум 52 px · Зоны нажатия: минимум 48×48 px", 'BulletText'))
story.append(p("• Расстояние между кнопками: 12–16 px · Поле ввода: высота 56 px", 'BulletText'))

story.append(Paragraph("Контраст и цвета", styles['SubSection']))
story.append(p("• Обычный текст: минимум 7:1 · Крупный текст: минимум 4.5:1", 'BulletText'))
story.append(p("• Поддержка prefers-color-scheme и режима высокого контраста", 'BulletText'))
story.append(p("• Смысл никогда не передаётся только цветом", 'BulletText'))
story.append(p("• Срочно: #C62828 · Успех: #2E7D32 · Основной текст светлой темы: #111111", 'BulletText'))

# ===== 6. Microcopy =====
story.append(Paragraph("6. Микрокопирайт (ключевые формулировки)", styles['Section']))
story.append(p(
    "<b>Вход:</b> Один разговор для всех · Создать пространство · У меня уже есть ссылка · Прямая связь без сервера"
))
story.append(p(
    "<b>Комната:</b> Написать сообщение · Говорить · Ещё · Позвать человека · Позвонить на телефон · Пригласить · Мой способ общения · Выйти из пространства"
))
story.append(p(
    "<b>Сигналы:</b> Подожди · Понял · Люблю · Позвони · Срочно"
))
story.append(p(
    "<b>Пиктограммы:</b> Вода · Болит · Я здесь · Опасно"
))
story.append(p(
    "<b>Статусы:</b> Ушло · Доставлено · Человек увидел · Не отправилось. Нажмите, чтобы попробовать снова"
))
story.append(p(
    "<b>Ошибки:</b> Нет сети. Сообщения отправятся, когда появится связь · Перевода нет — показываю как есть · Этот способ недоступен на вашем устройстве · Связь прервалась. Пытаемся восстановить…"
))
story.append(p(
    "<b>Пустые:</b> Пока здесь только вы · Напишите первое сообщение или нажмите сигнал · Сейчас никто не в комнате"
))

# ===== 7. Scenarios =====
story.append(PageBreak())
story.append(Paragraph("7. Критические сценарии", styles['Section']))

# Scenario 1 - already in previous, but include summary
story.append(Paragraph("7.1. Бабушка на кнопочном телефоне через СМС", styles['SubSection']))
story.append(p(
    "Внук добавляет номер бабушки в контакты моста (номер → «Бабушка»). "
    "Бабушка получает обычную СМС и просто отвечает на неё текстом. "
    "Её ответ появляется в комнате от имени «Бабушка». "
    "Всё, что пишут в комнате, уходит ей обычными СМС с подписью «Семья:». "
    "Сигналы превращаются в понятный текст (📞 Позвони, 🆘 Срочно). "
    "В шторке участников видно: Бабушка · СМС · кнопочный телефон."
))
story.append(p("<b>Нельзя ломать:</b> всегда подписывать СМС; честно сегментировать (70 знаков кириллицы); не возвращать бабушке её собственные сообщения; короткие ответы («ок», «ага») не «улучшать».", 'BodySmall'))

# Scenario 2
story.append(Paragraph("7.2. Слепоглухой человек (тактильный канал)", styles['SubSection']))
story.append(p(
    "Человек не видит и не слышит. Основной канал — вибрация + возможный брайль-дисплей (в будущем) + человек-посредник."
))
story.append(p("• В профиле включены: «Морзе входящих вибрацией» + «Вибрация и звук на сигналы» (звук игнорируется, остаётся вибрация).", 'BulletText'))
story.append(p("• Входящее сообщение превращается в вибро-рисунок (первое слово — до 10 звеньев по Vibration API). Дальше — короткий тактильный тик «есть продолжение».", 'BulletText'))
story.append(p("• Сигналы имеют уникальный вибро-паттерн (Срочно — длинная + короткие, Позвони — другой ритм).", 'BulletText'))
story.append(p("• Если есть человек-посредник (родственник рядом) — он получает уведомление «нужен тактильный мост» и может подтвердить доставку.", 'BulletText'))
story.append(p("• Честная граница: полноценный протактиль-язык машина пока не умеет. Не притворяемся.", 'BulletText'))
story.append(p("<b>Интерфейс для остальных участников:</b> в карточке участника видно «Тактиль / вибрация». Сообщения, уходящие к нему, помечаются индикатором.", 'BodySmall'))

# Scenario 3
story.append(Paragraph("7.3. Человек только с голосом (без экрана / моторики)", styles['SubSection']))
story.append(p(
    "Человек не может пользоваться экраном (сильная моторная ограниченность, или просто лежит и говорит). "
    "Основной способ — голос в обе стороны + речь в текст для остальных."
))
story.append(p("• В профиле: «Только голос» + «Мне нужны субтитры» (чтобы его речь становилась текстом для других).", 'BulletText'))
story.append(p("• Панель ввода превращается в одну большую кнопку «Говорить» (или режим постоянного слушания, если разрешено).", 'BulletText'))
story.append(p("• Входящие сообщения обязательно озвучиваются (TTS).", 'BulletText'))
story.append(p("• Сигналы тоже озвучиваются («Сигнал: Позвони»).", 'BulletText'))
story.append(p("• Если человек молчит дольше порога — можно предложить «Позвать кого-то» или отправить сигнал «Я здесь».", 'BulletText'))

# Scenario 4
story.append(Paragraph("7.4. Прямая связь без сервера (два телефона)", styles['SubSection']))
story.append(p(
    "Интернет пропал или сервер недоступен. Два человека хотят сохранить возможность разговора."
))
story.append(p("• На экране входа есть свёрнутый блок «Прямая связь без сервера».", 'BulletText'))
story.append(p("• Человек А генерирует код-приглашение (короткий). Передаёт его любым способом: голосом по обычному телефону, бумажкой, QR в глаз.", 'BulletText'))
story.append(p("• Человек Б вводит код. Устройства устанавливают прямое WebRTC-соединение (или аналог).", 'BulletText'))
story.append(p("• После обмена кодами интернет больше не нужен для самого разговора.", 'BulletText'))
story.append(p("• Честная граница: работают только те функции, которые возможны p2p (текст + голос + сигналы). Мосты в мессенджеры и СМС в этом режиме недоступны.", 'BulletText'))
story.append(p("• В интерфейсе должно быть очень понятно: «Сейчас вы на прямой связи. Сервер не используется».", 'BodySmall'))

# ===== 8. Checklist =====
story.append(Paragraph("8. Чеклист для разработчика · что должно быть в 0.8", styles['Section']))

story.append(Paragraph("Вход и навигация", styles['SubSection']))
checklist1 = [
    "Экран создания пространства содержит только название + кнопку «Создать» + вторичную «У меня уже есть ссылка»",
    "Блок «Прямая связь без сервера» свёрнут по умолчанию",
    "Никаких чекбоксов доступности на экране входа",
    "После создания — сразу переход в комнату + предложение пригласить"
]
for c in checklist1:
    story.append(p(f"☐ {c}", 'BulletText'))

story.append(Paragraph("Комната", styles['SubSection']))
checklist2 = [
    "Лента сообщений — главный фокус экрана",
    "Панель ввода адаптивная и читает профиль человека",
    "Шапка показывает название + число участников + меню ⋯",
    "В меню ⋯: Позвать, Позвонить на телефон, Пригласить, Мой способ общения, Выйти",
    "Статусы сообщений: Ушло / Доставлено / Человек увидел",
    "Индикатор «печатает» и «говорит»"
]
for c in checklist2:
    story.append(p(f"☐ {c}", 'BulletText'))

story.append(Paragraph("Профиль доступности", styles['SubSection']))
checklist3 = [
    "Отдельный экран/шторка «Как тебе удобно»",
    "Группы: Зрение, Слух, Как писать, Язык",
    "Превью того, как будут выглядеть сообщения",
    "Большая кнопка «Готово»",
    "Профиль сохраняется и применяется при следующем входе"
]
for c in checklist3:
    story.append(p(f"☐ {c}", 'BulletText'))

story.append(Paragraph("Участники и приглашение", styles['SubSection']))
checklist4 = [
    "В карточке участника видно канал (СМС / WhatsApp / Браузер / Телефон)",
    "Приглашение: копирование ссылки + QR-код",
    "Подпись «Человек зайдёт тем способом, который у него есть»"
]
for c in checklist4:
    story.append(p(f"☐ {c}", 'BulletText'))

story.append(Paragraph("Эргономика и доступность", styles['SubSection']))
checklist5 = [
    "Основной текст ≥ 18 px, крупный режим ≥ 24 px",
    "Кнопки высотой ≥ 52 px, зоны нажатия ≥ 48×48 px",
    "Контраст текста ≥ 7:1",
    "Поддержка prefers-color-scheme",
    "Режим высокого контраста",
    "Все важные действия имеют текстовую подпись (не только иконку)"
]
for c in checklist5:
    story.append(p(f"☐ {c}", 'BulletText'))

story.append(Paragraph("Честность и ошибки", styles['SubSection']))
checklist6 = [
    "Все состояния ошибок имеют понятный текст (см. раздел 6)",
    "Пустые состояния объясняют, что делать дальше",
    "Неподдерживаемые функции показывают «Этот способ недоступен на вашем устройстве»",
    "Нет фейковых переводов и фейковых обещаний"
]
for c in checklist6:
    story.append(p(f"☐ {c}", 'BulletText'))

story.append(Paragraph("СМС-мост и особые каналы", styles['SubSection']))
checklist7 = [
    "СМС всегда подписываются именем пространства («Семья:»)",
    "Сегментация по правилам 70/67 (кириллица) и 160/153 (латиница)",
    "Эхо собственных сообщений бабушке не уходит",
    "В карточке участника видно «СМС · кнопочный телефон»"
]
for c in checklist7:
    story.append(p(f"☐ {c}", 'BulletText'))

# ===== 9. Testing =====
story.append(Paragraph("9. Тестирование с пожилыми людьми", styles['Section']))
story.append(p(
    "5–7 человек 65–80 лет, разный уровень владения смартфоном. "
    "Не объяснять интерфейс заранее. Давать жизненные задачи. "
    "Смотреть время до первого понимания, ошибочные нажатия, слова «а это что?». "
    "После задачи — только три вопроса: Что было непонятно? Чего не хватало? Что показалось лишним?"
))
story.append(p(
    "<b>Красные флаги:</b> не понимает, что уже в комнате; не понимает, куда делась ссылка; "
    "боится нажимать сигналы; не замечает, что сообщение ушло."
))

# ===== Footer =====
story.append(sp(16))
story.append(hr())
story.append(Paragraph(
    "СИНГУЛЯР · UX-спецификация 0.8 · 12 ноября 2026 · Документ можно использовать как основу для следующей итерации интерфейса",
    styles['Footer']
))

# Build
doc.build(story)
print(f"PDF created: {OUTPUT}")
