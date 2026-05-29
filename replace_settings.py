import re

with open("components/settings-dialog.tsx", "r") as f:
    content = f.read()

# Add import
if 'import { GoogleSheets2026 } from "@thesvg/react"' not in content:
    content = content.replace(
        'import {\n  Dialog,', 
        'import { GoogleSheets2026 } from "@thesvg/react"\nimport {\n  Dialog,'
    )

# Remove Database from lucide-react import
content = content.replace('  Database,\n', '')

# Replace usages
content = content.replace('<Database className', '<GoogleSheets2026 className')

with open("components/settings-dialog.tsx", "w") as f:
    f.write(content)

with open("components/sync-indicator.tsx", "r") as f:
    content = f.read()

content = content.replace(', Database', '')

with open("components/sync-indicator.tsx", "w") as f:
    f.write(content)

