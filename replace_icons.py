import re

with open("components/app-sidebar.tsx", "r") as f:
    content = f.read()

# Add import
if 'import { GoogleSheets2026 } from "@thesvg/react"' not in content:
    content = content.replace(
        'import {\n  Sidebar,', 
        'import { GoogleSheets2026 } from "@thesvg/react"\nimport {\n  Sidebar,'
    )

# Remove Database from lucide-react import
content = content.replace('  Database,\n', '')

# Replace usages
content = content.replace('icon: Database,', 'icon: GoogleSheets2026,')
content = content.replace('<Database className', '<GoogleSheets2026 className')

with open("components/app-sidebar.tsx", "w") as f:
    f.write(content)

