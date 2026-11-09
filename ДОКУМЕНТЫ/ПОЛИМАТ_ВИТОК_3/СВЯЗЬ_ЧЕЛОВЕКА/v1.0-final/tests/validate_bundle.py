"""
Валидатор целостности инженерного комплекта СИНГУЛЯР v1.1
"""

import os
import sys

REQUIRED_FILES = [
    "README_RU.md",
    "CHANGELOG.md",
    "ERRORS_AND_ANTIPATTERNS.md",
    "index.html",
    "СИНГУЛЯР_53_СВЯЗЬ_ЧЕЛОВЕКА.html",
    "singulyar_core.py",
    "js/singulyar_crypto.js",
    "storage/indexeddb_store.js",
    "spec/00-ARCHITECTURE.md",
    "spec/01-REQUIREMENTS.md",
    "spec/02-THREAT-MODEL.md",
    "spec/03-PROTOCOL.md",
    "spec/04-ADAPTER-CONTRACT.md",
    "spec/05-DECISIONS.md",
    "integration/DOOR-INTEGRATION.md",
    "roadmap/ROADMAP.md",
    "tests/ACCEPTANCE.md",
    ".github/ISSUE_TEMPLATE/bug_report.md",
    ".github/ISSUE_TEMPLATE/feature_request.md",
    ".github/ISSUE_TEMPLATE/config.yml",
    ".github/workflows/pr_check.yml",
    ".github/workflows/deploy.yml"
]

def validate():
    print("=== STARTING BUNDLE VALIDATION v1.1 ===")
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    missing = []
    
    for rel_path in REQUIRED_FILES:
        full_path = os.path.join(root, rel_path)
        if not os.path.exists(full_path):
            print(f"[FAIL] Missing required file: {rel_path}")
            missing.append(rel_path)
        else:
            size = os.path.getsize(full_path)
            print(f"[OK] {rel_path} ({size} bytes)")

    if missing:
        print(f"=== BUNDLE VALIDATION FAILED: {len(missing)} missing files ===")
        sys.exit(1)
    else:
        print("=== BUNDLE VALIDATION SUCCESSFUL (100% COMPLETE) ===")

if __name__ == "__main__":
    validate()
