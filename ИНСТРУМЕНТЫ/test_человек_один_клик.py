# Тест-страж латки С135 «ОДИН ЧЕЛОВЕК — ОДИН КЛИК» — шапка по закону «инструкция одна» (такт v11.49 «ЗАКРЫТИЕ»).
"""Тест-страж единой личности дома (человек.js) и входа одним кликом (ПИР ·54, КРУГ ·23).
Латка С135. Запуск: python3 ИНСТРУМЕНТЫ/test_человек_один_клик.py
или python3 -m unittest ИНСТРУМЕНТЫ.test_человек_один_клик (из корня репы).

Что охраняет: один человек на весь дом (ключ singulyar.человек, сквозная запись во все
двери), регистрация семьи прямо в окне ПИРа (без регистраций в чужих комнатах),
камера первым жестом («⌇ Войти и говорить»), тихое усыновление личности ·23.
Честные границы: сетевых обращений нет — только локальные файлы репы и node --check.
"""
import re
import subprocess
import unittest
from pathlib import Path

КОРЕНЬ = Path(__file__).resolve().parent.parent
МОДУЛЬ = КОРЕНЬ / "человек.js"
ПИР = КОРЕНЬ / "СИНГУЛЯР_54_ПИР.html"
КРУГ = КОРЕНЬ / "СИНГУЛЯР_23_КРУГ.html"
КЛЮЧ_ДОМ = "singulyar.человек"


def читай(путь):
    return путь.read_text(encoding="utf-8")


class TestЧеловекМодуль(unittest.TestCase):
    """Единая личность дома: модуль человек.js."""

    def setUp(self):
        self.т = читай(МОДУЛЬ)

    def test_шапка_честная(self):
        self.assertIn("ЧТО ЭТО", self.т)
        self.assertIn("Запуск:", self.т)

    def test_ключ_дома_один(self):
        self.assertIn(f"'{КЛЮЧ_ДОМ}'", self.т)

    def test_сквозная_запись_во_все_двери(self):
        # один механизм пишет ключ дома, ключ круга ·23 и имя ПИРа — комнаты совместимы
        self.assertIn("'singular.krug.v1.identity'", self.т)
        self.assertIn("'singulyar.pir.имя'", self.т)
        self.assertIn("забыть:", self.т)

    def test_без_сети_и_без_innerhtml(self):
        self.assertNotIn("fetch(", self.т)
        self.assertNotIn("WebSocket", self.т)
        self.assertNotIn("XMLHttpRequest", self.т)
        self.assertNotIn("innerHTML", self.т)
        self.assertNotIn("eval(", self.т)

    def test_синтаксис_чист(self):
        пр = subprocess.run(["node", "--check", str(МОДУЛЬ)], capture_output=True, text=True)
        self.assertEqual(пр.returncode, 0, пр.stderr)


class TestПирОдинКлик(unittest.TestCase):
    """ПИР ·54: вход одним кликом, регистрация семьи в том же окне."""

    def setUp(self):
        self.т = читай(ПИР)

    def test_модуль_личности_подключён(self):
        self.assertIn('src="./человек.js"', self.т)
        self.assertIn("СНГ:ЧЕЛОВЕК", self.т)

    def test_семья_выбирается_в_этом_окне(self):
        for ид in ("pasha", "anya", "ivan", "zhenya"):
            self.assertIn(f"id: '{ид}'", self.т)
        for имя in ("ПАША", "МАМА", "ВАНЯ", "ЖЕНЯ"):
            self.assertIn(имя, self.т)
        self.assertIn("другое имя", self.т)
        self.assertIn("Регистрироваться в других комнатах не нужно", self.т)

    def test_вход_одним_кликом_и_камера_первым_жестом(self):
        self.assertIn('id="войтиРечь"', self.т)
        self.assertIn("⌇ Войти и говорить", self.т)
        self.assertIn('id="войтиТихо"', self.т)
        self.assertIn("$('войтиРечь').addEventListener('click', () => войтиСетью(true));", self.т)
        # порядок внутри войтиСетью: медиаВкл() просится раньше сеть.войти — один жест
        тело = re.search(r"function войтиСетью\(сМедиа\) \{(.*?)\n\}", self.т, re.S)
        self.assertIsNotNone(тело, "функция войтиСетью не найдена")
        self.assertLess(тело.group(1).index("медиаВкл()"), тело.group(1).index("сеть.войти("))

    def test_личность_подставляется_сама(self):
        self.assertIn("function лицоПоказать()", self.т)
        self.assertIn("лицоПоказать(); /* латка С135", self.т)  # вызов на открытии
        self.assertIn("window.addEventListener('storage'", self.т)
        self.assertIn(f"е.key === '{КЛЮЧ_ДОМ}'", self.т)
        self.assertIn("window.ЧЕЛОВЕК.читать()", self.т)

    def test_глубокая_ссылка_ведёт_в_один_клик(self):
        self.assertIn("$('войтиРечь').focus();", self.т)

    def test_штампы_реестра_и_csp_не_тронуты(self):
        self.assertIn("data-реестр", self.т)
        self.assertIn("connect-src 'self' wss:", self.т)


class TestКругСинхронизация(unittest.TestCase):
    """КРУГ ·23: пишет личность в дом и усыновляет запись дома."""

    def setUp(self):
        self.т = читай(КРУГ)

    def test_модуль_личности_подключён(self):
        self.assertIn('src="./человек.js"', self.т)

    def test_сквозная_запись_при_выборе_себя(self):
        self.assertIn("window.ЧЕЛОВЕК.записать(л)", self.т)

    def test_усыновление_записи_дома(self):
        self.assertIn("window.ЧЕЛОВЕК.читать()", self.т)
        self.assertIn("window.addEventListener('storage'", self.т)

    def test_версия_круга_поднята(self):
        self.assertIn("версия: '1.4.0'", self.т)

    def test_нулевой_innerhtml_сохранён(self):
        # канон: 0 ПРИСВАИВАНИЙ innerHTML (слово в комментарии-инварианте не в счёт)
        self.assertIsNone(re.search(r"\.innerHTML\s*=", self.т), "появилось присваивание innerHTML")
        self.assertNotIn("insertAdjacentHTML", self.т)
        self.assertNotIn("document.write", self.т)


class TestКлючСогласованВДверях(unittest.TestCase):
    """Три двери называют один ключ дома — механизм един."""

    def test_ключ_везде_одинаков(self):
        for путь in (МОДУЛЬ, ПИР, КРУГ):
            with self.subTest(файл=путь.name):
                self.assertIn(КЛЮЧ_ДОМ, читай(путь))


if __name__ == "__main__":
    unittest.main()
