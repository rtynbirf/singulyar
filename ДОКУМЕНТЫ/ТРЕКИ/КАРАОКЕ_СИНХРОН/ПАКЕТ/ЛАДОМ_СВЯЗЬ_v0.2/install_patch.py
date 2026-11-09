#!/usr/bin/env python3
"""Add the LADOM bridge script reference without replacing the karaoke page."""
from pathlib import Path
import shutil, sys

if len(sys.argv) < 2:
    raise SystemExit('Usage: python scripts/install_patch.py PATH/СИНГУЛЯР_31_ЛАДОМ.html [PATH_TO_REPO_ROOT]')
html = Path(sys.argv[1]).resolve()
repo = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else html.parent
if not html.is_file(): raise SystemExit(f'HTML not found: {html}')
source = Path(__file__).resolve().parents[1] / 'integration' / 'ladom-network-bridge.js'
dest = repo / 'integration' / 'ladom-network-bridge.js'
dest.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(source, dest)
text = html.read_text(encoding='utf-8')
needle = '<script src="integration/ladom-network-bridge.js" defer></script>'
if needle in text:
    print('Already installed; bridge file refreshed.'); raise SystemExit(0)
idx = text.lower().rfind('</body>')
if idx < 0: raise SystemExit('No </body> tag found; file left unchanged.')
text = text[:idx] + '\n<!-- SINGULYAR LADOM additive network bridge; original karaoke code preserved -->\n' + needle + '\n' + text[idx:]
backup = html.with_suffix(html.suffix + '.pre-ladom-bridge.bak')
if not backup.exists(): shutil.copy2(html, backup)
html.write_text(text, encoding='utf-8')
print(f'Installed bridge reference in {html}')
print(f'Backup: {backup}')
