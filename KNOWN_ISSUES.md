# KNOWN ISSUES · singulyar — известные красные и шрамы
> Снимок Волны ×5-A (2026-11-09, ветка rumu). Живые красные прогоны + известные квирки.

| Что | Статус | Детали | Run/ссылка |
|---|---|---|---|
| Оракулы дома зелёные 19:59 (226a499) | 🟢 вылечено догоном пина | «ПИН УСТАРЕЛ»: пин в genome cell-swarm/main/swarm.json отставал от тела rumu — по дизайну гейта; пин догнан (5ff5f7fa) | [42517742808](https://github.com/rtynbirf/singulyar/actions/runs/42517742808) |
| Оракулы дома зелёные 20:01 (226a499) | 🟢 вылечено догоном пина | та же орбита | [42517960432](https://github.com/rtynbirf/singulyar/actions/runs/42517960432) |
| push-оракулы 21:37/21:49 (d95ad5a, 5ff5f7f) | 🟢 вылечено догоном пина | структурный паттерн: push-ран стартует до `make pins --write` → красится; диспатч после обновления пина зелёный | [42526141010](https://github.com/rtynbirf/singulyar/actions/runs/42526141010) · [42527073306](https://github.com/rtynbirf/singulyar/actions/runs/42527073306) |
| приёмка Волны ×5-A | ✅ живой прогон | диспатч oracle на 5ff5f7f при актуальном пине — 🟢 | [42527630233](https://github.com/rtynbirf/singulyar/actions/runs/42527630233) |
| Квирк: пин в чужом репо | ℹ️ по дизайну | гейт честный, но pin-chase требует права записи в cell-swarm; Волна ×5-A пин не обновляла (чужие репо не трогаем) | .github/workflows/oracle-rumu.yml |
| Квирк: Pages-деплой rumu | ℹ️ зелёный на 5ff5f7f | [42527073261](https://github.com/rtynbirf/singulyar/actions/runs/42527073261) 🟢 | см. run |
| Квирк: гомоглифы в коде | 🩹 шрам | «mineine» с кириллическими символами ломал github-script — вылечено d95ad5a волной ×5-ХОЗЯИН | commit d95ad5a |
| Оракулы дома 14:47 (abd3ee75, волна ЛКГ-1+ПРАВДА-2) | 🟢 пин догнан волной | «ПИН УСТАРЕЛ» по дизайну гейта после пуша волны; догон правом волны: cell-swarm/main `015a4814fb` (пин `6e753d0c`→`abd3ee7526`) | [42638047456](https://github.com/rtynbirf/singulyar/actions/runs/42638047456) |
| Такт-гейт 14:47 (abd3ee75): JS-оракулы | 🟡 вскрыто базой — не волной | первый CI-прогон после `[skip ci]`-базы `6e753d0`: 9 унаследованных красных файлов (s31_chuvstva/kodex/obereg/ruchki/slovo, nasled_logic, modules_logic, s33_fond_logic, svyazi_niti); дифф-прогон: база несла те же 9 + `s31_slog` + `test_цех_правды.mjs` (эти 2 вылечены волной); новых красных волна не добавила; орбита W-AUD-16 — го автора | [42638047437](https://github.com/rtynbirf/singulyar/actions/runs/42638047437) |
