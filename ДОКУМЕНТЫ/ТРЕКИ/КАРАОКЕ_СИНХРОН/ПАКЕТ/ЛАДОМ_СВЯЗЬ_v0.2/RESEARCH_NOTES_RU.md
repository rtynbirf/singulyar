# Исследовательские основания и ограничения
Дата проверки ссылок: 2026-10-13.

## WebRTC
WebRTC — транспорт аудио/видео в реальном времени. Сигналинг (обмен offer/answer/ICE) является отдельной частью приложения; для сложных NAT может понадобиться TURN.
- https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
- https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

## Web Speech API
Синтез речи и распознавание — разные API; поддержка зависит от браузера/ОС. `SpeechSynthesis` озвучивает текст речью и не превращает его автоматически в пение.
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API

## Перевод речи
Исследовательские системы потокового многоязычного speech-to-speech перевода существуют, но это не доказывает качество перевода певческого голоса с сохранением мелодии и тембра для pt-BR ↔ ja-JP.
- https://ai.meta.com/research/publications/seamless-multilingual-expressive-and-streaming-speech-translation/

## Архитектурный вывод
Разделить распознавание спетого текста, перевод смысла, согласование слогов/нот и генерацию вокала. Измерять каждый этап отдельно. TTS fallback полезен для понимания, но не является singing voice conversion. Языковая опция UI не равна поддержке языка моделью.
