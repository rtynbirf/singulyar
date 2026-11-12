import test from "node:test";
import assert from "node:assert/strict";
import { morseOf, morseDecode, morseCodeOf, morseAlphabets, textToBraille, MORSE_ORDER } from "../public/azbuki.js";

/* ЕСТЬ ЧЕЛОВЕК — НЕТ НАЦИЙ: восемь писем мира — один механизм.
   Якоря взяты из первоисточников (не из кода): Wikipedia non-Latin alphabets,
   Wabun code, fa:کد مورس, Russian/Greek/Hebrew/Arabic/English Braille. */

test("морзе: восемь азбук — коды корректны и уникальны внутри письма", () => {
  for (const key of MORSE_ORDER) {
    const table = morseAlphabets[key];
    assert.ok(table.имя, key);
  }
});

test("морзе: латиница — SOS по ITU", () => {
  assert.equal(morseOf("SOS"), "... --- ...");
  assert.equal(morseDecode("... --- ...".split(" ")[0], "L"), "s");
});

test("морзе: кириллица — «привет» целиком, чтение по выбору", () => {
  assert.equal(morseOf("Привет"), ".--. .-. .. .-- . -");
  assert.equal(morseDecode(".-", "C"), "а");
  assert.equal(morseDecode("--.-", "C"), "щ");
  assert.equal(morseDecode(".----", "C"), "1");           // ї уступает цифру при чтении
  assert.equal(morseCodeOf("ї"), ".----");                // но пишется
});

test("морзе: греческая, иврит, арабская, персидская, хангыль, Wabun", () => {
  assert.equal(morseDecode("----", "G"), "χ");
  assert.equal(morseDecode("--.-", "G"), "ψ");
  assert.equal(morseDecode("...", "H"), "ש");
  assert.equal(morseDecode("-..-", "A"), "ص");
  assert.equal(morseDecode("..--", "P"), "غ");            // fa:کد مورس ••––
  assert.equal(morseDecode("...---", "P"), "ق");          // fa:کد مورس •••–––
  assert.equal(morseDecode(".-..", "K"), "ㄱ");
  assert.equal(morseDecode("--.-.", "J"), "し");
  assert.equal(morseDecode("-.-.-.", "J"), "(");          // Wabun code: скобки сверены дважды
});

test("морзе: «Авто» — порядок латиница→кириллица→…; восточные цифры", () => {
  assert.equal(morseDecode(".-"), "a");
  assert.equal(morseDecode("--.-"), "q");                 // латиница первая в «Авто»
  assert.equal(morseDecode("--.-", "C"), "щ");            // выбранная азбука сильнее «Авто»
  assert.equal(morseDecode("--.-.", "J"), "し");           // хирагана старше катаканы
  assert.equal(morseDecode("....."), "5");
  assert.equal(morseCodeOf("۵"), ".....");               // персидская цифра 5
  assert.equal(morseCodeOf("٧"), "--...");                // арабо-индийская 7
});

test("морзе: неизвестный знак молчит, слово не рвётся", () => {
  assert.equal(morseOf("a😀b"), ".- -...");
  assert.equal(morseCodeOf("😀"), "");
});

test("брайль: кириллица — 33 клетки по ГОСТ Р 58511-2019 (пять исправлены против 0.5.3)", () => {
  assert.equal(textToBraille("а"), "\u2801");             // ⠁
  assert.equal(textToBraille("б"), "\u2803");             // ⠃
  assert.equal(textToBraille("в"), "\u283A");             // ⠺
  assert.equal(textToBraille("ё"), "\u2821");             // ⠡
  assert.equal(textToBraille("й"), "\u282F");             // ⠯ (было неверно)
  assert.equal(textToBraille("ъ"), "\u2837");             // ⠷ (было неверно)
  assert.equal(textToBraille("ы"), "\u282E");             // ⠮ (было неверно)
  assert.equal(textToBraille("ь"), "\u283E");             // ⠾ (было неверно)
  assert.equal(textToBraille("я"), "\u282B");             // ⠫ (было неверно)
  assert.equal(textToBraille("ш"), "\u2831");             // ⠱
  assert.equal(textToBraille("ц"), "\u2809");             // ⠉
  assert.equal(textToBraille("э"), "\u282A");             // ⠪
});

test("брайль: цифры — числовой знак ⠼ + клетки a..j", () => {
  assert.equal(textToBraille("12"), "\u283C\u2801\u2803"); // ⠼⠁⠃
  assert.equal(textToBraille("0"), "\u283C\u281A");        // ⠼⠚
});

test("брайль: латиница — hello по международной таблице", () => {
  assert.equal(textToBraille("hello"), "\u2813\u2811\u2807\u2807\u2815"); // ⠓⠑⠇⠇⠕
});

test("брайль: греческий — Modern Greek Braille (омега=j, ипсилон=y, эта=345)", () => {
  assert.equal(textToBraille("ω"), "\u281A");             // ⠚
  assert.equal(textToBraille("η"), "\u281C");             // ⠜
  assert.equal(textToBraille("θ"), "\u2839");             // ⠹
  assert.equal(textToBraille("υ"), "\u283D");             // ⠽
  assert.equal(textToBraille("ψ"), "\u2829");             // ⠩ (клетка ç)
  assert.equal(textToBraille("ά"), "\u2810\u2801");       // ⠐⠁ — тонос перед гласной
  assert.equal(textToBraille("ί"), "\u2810\u280A");
  assert.equal(textToBraille("ϊ"), "\u280A");             // просто и, без знака
  assert.equal(textToBraille("Ω"), "\u2828\u281A");       // прописной 46 + ⠚
});

test("брайль: иврит — International Hebrew Braille Code (без огласовок)", () => {
  assert.equal(textToBraille("שלום"), "\u2829\u2807\u283A\u280D"); // ⠩⠇⠺⠍
  assert.equal(textToBraille("ת"), "\u2839");             // ⠹ (th)
  assert.equal(textToBraille("ע"), "\u282B");             // ⠫
  assert.equal(textToBraille("ב"), "\u2827");             // ⠧ (v)
});

test("брайль: арабский — клетки и цифры ⠼", () => {
  assert.equal(textToBraille("سلام"), "\u280E\u2807\u2801\u280D"); // ⠎⠇⠁⠍
  assert.equal(textToBraille("ص"), "\u282F");             // ⠯
  assert.equal(textToBraille("ط"), "\u283E");             // ⠾
  assert.equal(textToBraille("ة"), "\u2821");             // ⠡
  assert.equal(textToBraille("12"), "\u283C\u2801\u2803"); // цифры как в международной
});

test("брайль: смешанное письмо — каждая буква своей клеткой", () => {
  const out = textToBraille("Привет hi");
  assert.equal(out, "\u2828\u280F\u2817\u280A\u283A\u2811\u281E\u2800\u2813\u280A"); // ⠨⠏⠗⠊⠺⠑⠞ ⠓⠊ (прописной 46 + п)
});

test("брайль: знак вне сверенной таблицы проходит как есть — дом не выдумывает", () => {
  assert.equal(textToBraille("a😀b"), "\u2801😀\u2803");
  assert.equal(textToBraille("Ї"), "Ї");                  // украинская клетка — следующий круг
  assert.equal(textToBraille("привет$"), textToBraille("привет") + "$");
});
