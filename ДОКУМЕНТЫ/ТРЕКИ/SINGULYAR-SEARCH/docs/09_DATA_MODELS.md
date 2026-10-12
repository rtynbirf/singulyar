# 09 · Модели данных

## SQLite MVP
- documents: id, title, source, url, published_at, content, added_at
- documents_fts: FTS5 title, content (unicode61)

## JSON MVP
- id, title, source, date, url, text

## Симулятор
- Evidence: id, content, source, timestamp, version, confidence
- Claim: text, status, supporting_evidence, conflicting_evidence

## v1
- EvidenceRecord: id, doc_id, query, source_url, snippet, metadata, created_at

## v2
- Document, Claim, Evidence (kind, score), Verdict (supported|contradicted|unknown)

## EvidenceState (эмерджентный)
- sufficiency, reliability, conflict, uncertainty, gaps[], cost_spent, unique_sources
