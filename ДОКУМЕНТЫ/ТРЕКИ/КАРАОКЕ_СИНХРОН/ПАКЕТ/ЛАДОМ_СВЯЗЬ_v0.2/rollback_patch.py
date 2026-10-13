#!/usr/bin/env python3
from pathlib import Path
import sys, shutil
if len(sys.argv)!=2: raise SystemExit('Usage: python scripts/rollback_patch.py PATH/СИНГУЛЯР_31_ЛАДОМ.html')
p=Path(sys.argv[1]).resolve(); b=p.with_suffix(p.suffix+'.pre-ladom-bridge.bak')
if not b.is_file(): raise SystemExit(f'Backup not found: {b}')
shutil.copy2(b,p); print(f'Restored {p} from {b}')
