# Исследовательские заметки и внешние основания

Дата проверки ссылок: 2026-10-13. Это обзор технологических опор, а не доказательство готовности единой системы перевода пения.

## 1. WebRTC
WebRTC предоставляет API для аудио/видео связи браузер-браузер; согласование соединения обычно требует сигналинга вне самого WebRTC. В публичных сетях могут потребоваться STUN/TURN и проверка различных NAT.
- MDN WebRTC API: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- MDN `getUserMedia`: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- MDN `RTCPeerConnection`: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection

## 2. Web Speech API
API разделяет распознавание речи и синтез речи. Поддержка `SpeechRecognition` не одинакова во всех браузерах; некоторые реализации используют серверную обработку и не являются офлайн-распознаванием. Поэтому в прототипе синтез речи — дополнительная возможность, а распознавание не является обязательной зависимостью.
- MDN Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- MDN SpeechRecognition: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition

## 3. Потоковый перевод речи
Meta Seamless исследует многоязычный, выразительный и потоковый перевод речи. Это подтверждает существование направления speech-to-speech, но само по себе не доказывает качество перевода певческого голоса с сохранением мелодии, нот и тембра для pt-BR ↔ ja-JP.
- Meta AI, Seamless: https://ai.meta.com/research/publications/seamless-multilingual-expressive-and-streaming-speech-translation/

## 4. Отдельная исследовательская проблема
Певческая речь отличается от обычной: протяжные гласные, мелодические высоты, музыкальный аккомпанемент, ритмическая структура и художественные произношения усложняют распознавание. Перевод, пригодный к исполнению, требует дополнительно согласовывать смысл, слоги и ноты. Нужны отдельные сравнительные испытания, не только демонстрация обычного голосового перевода.

## 5. Критерий инженерной честности
- Не называть TTS переводом певческого голоса.
- Не считать подстановку фраз из словаря машинным переводом.
- Не считать передачу WebRTC подтверждением работы языкового перевода.
- Не утверждать сохранение личности голоса без субъективной и объективной проверки.
- Не объявлять поддержку языка только потому, что модель принимает его код.
- Для каждой модели проверить лицензию, языковое покрытие, условия хранения данных, задержку, стоимость и ограничения.

## 6. Источники, использованные при подготовке
- MDN Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- MDN SpeechRecognition: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- Meta AI Seamless: https://ai.meta.com/research/publications/seamless-multilingual-expressive-and-streaming-speech-translation/
- WebRTC API: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- MediaDevices.getUserMedia: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

Дата доступа и состояние совместимости должны перепроверяться перед выпуском; браузерные API меняются.
