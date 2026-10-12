FROM python:3.12-slim
WORKDIR /app
COPY omni_core /app/omni_core
RUN useradd -r -u 10001 omni && mkdir -p /var/lib/omni && chown omni /var/lib/omni
USER omni
# Точка входа — ваш адаптер (ASR/TTS/MCP/Matter), использующий omni_core как библиотеку.
CMD ["python3", "-c", "import omni_core; print('omni_core ready')"]
