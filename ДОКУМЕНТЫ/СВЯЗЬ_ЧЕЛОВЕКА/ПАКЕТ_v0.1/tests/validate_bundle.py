from pathlib import Path
import json, re, sys
ROOT=Path(__file__).resolve().parents[1]
required=['README_RU.md','spec/00-ARCHITECTURE.md','spec/01-REQUIREMENTS.md','spec/02-THREAT-MODEL.md','spec/03-PROTOCOL.md','spec/04-ADAPTER-CONTRACT.md','spec/05-DECISIONS.md','spec/object.schema.json','roadmap/ROADMAP.md','roadmap/WORK_BREAKDOWN.md','integration/DOOR-INTEGRATION.md','prototype/index.html','tests/ACCEPTANCE.md']
errors=[]
for rel in required:
    if not (ROOT/rel).is_file(): errors.append('missing: '+rel)
try:
    schema=json.loads((ROOT/'spec/object.schema.json').read_text(encoding='utf-8'))
    if schema.get('$schema')!='https://json-schema.org/draft/2020-12/schema': errors.append('unexpected JSON Schema dialect')
except Exception as e: errors.append('schema JSON invalid: '+str(e))
html=(ROOT/'prototype/index.html').read_text(encoding='utf-8')
for phrase in ['Локальная запись сохранена','не зашифрована','eSIM','value_intent','aria-live','Экспорт JSON']:
    if phrase not in html: errors.append('prototype missing expected marker: '+phrase)
if re.search(r'<script[^>]+src=["\']https?://',html,re.I): errors.append('external script found')
if errors:
    print('FAIL'); print('\n'.join(errors)); sys.exit(1)
print('PASS: required files, JSON Schema parse, prototype honesty/accessibility markers, no external script tags')
