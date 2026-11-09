'use strict';

// Небольшой фиксированный словарь только для демонстрации UI.
// НЕ является переводчиком и не должен использоваться как источник истинного перевода.
const phrasebook = {
  'pt-BR|ja-JP': {
    'Olá, tudo bem?': 'こんにちは、お元気ですか？',
    'Eu quero cantar com você': 'あなたと一緒に歌いたい',
    'Eu gosto de você': 'あなたが好きです',
    'Vamos cantar juntos': '一緒に歌いましょう'
  },
  'ja-JP|pt-BR': {
    'こんにちは、お元気ですか？': 'Olá, tudo bem?',
    'あなたと一緒に歌いたい': 'Eu quero cantar com você',
    'あなたが好きです': 'Eu gosto de você',
    '一緒に歌いましょう': 'Vamos cantar juntos'
  }
};
module.exports = { phrasebook };
