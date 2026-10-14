"""Тест-страж двери ·53 СВЯЗЬ ЧЕЛОВЕКА + комплекта «Контур человеческой связи».
Такт v11.29 «КОНТУР» (С107). Запуск: python3 ИНСТРУМЕНТЫ/test_singulyar_53.py
или python3 -m unittest ИНСТРУМЕНТЫ.test_singulyar_53 (из корня репы).

Честные границы: сетевых обращений нет — только локальные файлы репы и
песочница Python для ядра комплекта (ConformanceSuite запускается подпроцессом).
"""
import json
import re
import subprocess
import sys
import unittest
from pathlib import Path

КОРЕНЬ = Path(__file__).resolve().parent.parent
ДВЕРЬ = КОРЕНЬ / "СИНГУЛЯР_53_СВЯЗЬ_ЧЕЛОВЕКА.html"
КОМПЛЕКТ = КОРЕНЬ / "ДОКУМЕНТЫ" / "ПОЛИМАТ_ВИТОК_3" / "СВЯЗЬ_ЧЕЛОВЕКА" / "v1.0-final"
ПАКЕТ = КОРЕНЬ / "ДОКУМЕНТЫ" / "СВЯЗЬ_ЧЕЛОВЕКА"
РЕЕСТР = КОРЕНЬ / "data" / "versions.json"
ЯДРО_ДОМА = КОРЕНЬ / "singulyar-modules.js"

ПРОТОКОЛ_ВИДЫ = {"text", "file", "voice", "call_invite", "value_intent", "contact_invite"}


def дверь_текст():
    return ДВЕРЬ.read_text(encoding="utf-8")


class TestДверьКанонДома(unittest.TestCase):
    """Обвязка канона: CSP, реестр, нить, честность разметки."""

    def setUp(self):
        self.т = дверь_текст()

    def test_csp_постур_а(self):
        self.assertIn("Content-Security-Policy", self.т)
        self.assertIn("'unsafe-inline'", self.т)
        self.assertIn("'wasm-unsafe-eval'", self.т)

    def test_нить_домой(self):
        self.assertIn('href="index.html"', self.т)
        self.assertIn("sg65nav", self.т)

    def test_реестр_подключён(self):
        self.assertIn("sg-registry.js", self.т)
        self.assertIn("data-реестр", self.т)

    def test_нет_innerhtml(self):
        self.assertNotRegex(self.т, r"\.innerHTML\s*=", "закон дома: innerHTML запрещён")

    def test_title_и_язык(self):
        self.assertIn('<html lang="ru">', self.т)
        self.assertRegex(self.т, r"<title>[^<]*53[^<]*</title>")


class TestДверьКонтурV12(unittest.TestCase):
    """Фаза 1: транспортный контур v1.2 жив в двери (аддитивный блок)."""

    def setUp(self):
        self.т = дверь_текст()

    def test_блок_контур_присутствует(self):
        self.assertIn('id="k12-контур"', self.т)
        self.assertIn("КОНТУР v1.2", self.т)

    def test_модули_подключены(self):
        self.assertIn("js/singulyar_crypto.js", self.т)
        self.assertIn("js/indexeddb_store.js", self.т)

    def test_все_кнопки_контура_живы(self):
        идентификаторы = re.findall(r'<button id="(k12-[^"]+)"', self.т)
        self.assertTrue(идентификаторы, "в контуре нет кнопок")
        for ид in идентификаторы:
            имя = ид[len("k12-"):].replace("-", "_")
            self.assertIn(имя, self.т, "у кнопки %s нет обработчика" % ид)

    def test_их_фаза_0_жива_рядом(self):
        # их Фаза 0 (такт С105) не задета: локальный прототип v0.1 на месте
        self.assertIn('id="saveBtn"', self.т)
        self.assertIn('id="addContact"', self.т)

    def test_имена_намерений_протоколу(self):
        виды = set(re.findall(r'<option value="([a-z_]+)"', self.т))
        пересечение = виды & ПРОТОКОЛ_ВИДЫ
        self.assertIn("value_intent", пересечение)
        self.assertIn("call_invite", пересечение)

    def test_дисклеймер_value_intent(self):
        self.assertIn("NOT a confirmed bank transfer", self.т)  # в payload (дословно по прототипу)
        self.assertIn("НЕ платёжный документ", self.т)  # видимый чип

    def test_машина_состояний_честная(self):
        for ст in ("locally_saved", "queued", "transport_attempted",
                   "accepted_by_transport", "recipient_acknowledged"):
            self.assertIn("'" + ст + "'", self.т)

    def test_stun_по_явному_слову(self):
        self.assertIn("k12-stun", self.т)
        m = re.search(r'<input id="k12-stun"[^>]*>', self.т)
        self.assertIsNotNone(m)
        self.assertNotIn("checked", m.group(0))

    def test_нет_alert_в_контуре(self):
        контур = self.т[self.т.find('id="k12-контур"'):]
        self.assertNotRegex(контур, r"\balert\(")


class TestСчётПравда(unittest.TestCase):
    """Истина о числах: реестр, ядро, хаб согласованы."""

    def test_реестр_двери_53(self):
        d = json.loads(РЕЕСТР.read_text(encoding="utf-8"))
        файлы = [дв["файл"] for дв in d["двери"]]
        self.assertIn("СИНГУЛЯР_53_СВЯЗЬ_ЧЕЛОВЕКА.html", файлы)

    def test_ядро_содержит_s53(self):
        т = ЯДРО_ДОМА.read_text(encoding="utf-8")
        self.assertIn("id: 's53'", т)

    def test_хаб_манифест_содержит_s53(self):
        т = (КОРЕНЬ / "index.html").read_text(encoding="utf-8")
        self.assertIn("ид:'s53'", т)


class TestКомплектПесочница(unittest.TestCase):
    """Ядро комплекта и целостность — в песочнице Python (без сети)."""

    def test_комплект_валидатор(self):
        if not КОМПЛЕКТ.exists():
            self.skipTest("v1.0-final отсутствует")
        r = subprocess.run([sys.executable, "tests/validate_bundle.py"],
                           cwd=КОМПЛЕКТ, capture_output=True, text=True, timeout=120)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("SUCCESSFUL", r.stdout)

    def test_комплект_манифест(self):
        if not КОМПЛЕКТ.exists():
            self.skipTest("v1.0-final отсутствует")
        r = subprocess.run(["sha256sum", "-c", "MANIFEST.sha256"],
                           cwd=КОМПЛЕКТ, capture_output=True, text=True, timeout=120)
        self.assertEqual(r.returncode, 0, r.stdout[-2000:])

    def test_ядро_комплекта_конформность(self):
        if not (КОМПЛЕКТ / "singulyar_core.py").exists():
            self.skipTest("ядро комплекта отсутствует")
        r = subprocess.run([sys.executable, "singulyar_core.py"],
                           cwd=КОМПЛЕКТ, capture_output=True, text=True, timeout=120)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("ALL CONFORMANCE TESTS PASSED", r.stdout)

    def test_их_sha256sums_пакета_v01_целы(self):
        sums = ПАКЕТ / "SHA256SUMS"
        if not sums.exists():
            self.skipTest("SHA256SUMS отсутствует")
        r = subprocess.run(["sha256sum", "-c", "SHA256SUMS"],
                           cwd=sums.parent, capture_output=True, text=True, timeout=120)
        self.assertEqual(r.returncode, 0, r.stdout[-2000:])


if __name__ == "__main__":
    unittest.main(verbosity=2)
