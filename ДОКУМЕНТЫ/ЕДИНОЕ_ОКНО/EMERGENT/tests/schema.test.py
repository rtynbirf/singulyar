#!/usr/bin/env python3
"""Optional full JSON Schema validation; requires Python package jsonschema."""
import json, subprocess
from pathlib import Path
import jsonschema
root=Path(__file__).resolve().parents[1]
source="const {createIntent}=require('./src/core');process.stdout.write(JSON.stringify(createIntent({intent:'message',text:'schema test',recipient:'local test',fromModality:'text',toModality:'speech'})));"
event=json.loads(subprocess.check_output(['node','-e',source],cwd=root,text=True))
schema=json.loads((root/'schemas/communication-intent.schema.json').read_text(encoding='utf-8'))
jsonschema.Draft202012Validator.check_schema(schema)
jsonschema.validate(event,schema,format_checker=jsonschema.FormatChecker())
print('PASS JSON Schema Draft 2020-12: generated communication intent is valid')
