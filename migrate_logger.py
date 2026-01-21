#!/usr/bin/env python
"""
Migrate Studio and Podcast modules to use centralized logger.
This script adds createNamespacedLogger import and replaces console statements.
"""
import re
import os
from pathlib import Path

def migrate_file(filepath):
    """Migrate a single file to use the centralized logger."""
    component_name = Path(filepath).stem

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"ERROR reading {component_name}: {e}")
        return False

    # Check if already migrated
    if 'createNamespacedLogger' in content:
        print(f"SKIP {component_name} (already migrated)")
        return False

    # Check if there are console statements to migrate
    if not re.search(r'\bconsole\.(log|error|warn|info)\(', content):
        print(f"SKIP {component_name} (no console statements)")
        return False

    # Find last import statement
    import_matches = list(re.finditer(r'^import\s+.+$', content, re.MULTILINE))
    if not import_matches:
        print(f"ERROR {component_name} (no imports found)")
        return False

    last_import = import_matches[-1]
    insert_pos = last_import.end()

    # Insert logger import and declaration
    logger_code = f"\nimport {{ createNamespacedLogger }} from '@/lib/logger';\n\nconst log = createNamespacedLogger('{component_name}');"
    content = content[:insert_pos] + logger_code + content[insert_pos:]

    # Replace console statements (preserve those in comments)
    content = re.sub(r'(\s+)console\.log\(', r'\1log.debug(', content)
    content = re.sub(r'(\s+)console\.error\(', r'\1log.error(', content)
    content = re.sub(r'(\s+)console\.warn\(', r'\1log.warn(', content)
    content = re.sub(r'(\s+)console\.info\(', r'\1log.info(', content)

    # Write back
    try:
        with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        print(f"DONE {component_name}")
        return True
    except Exception as e:
        print(f"ERROR writing {component_name}: {e}")
        return False

def main():
    """Main migration function."""
    base_path = Path(__file__).parent

    files_to_migrate = [
        # Studio services
        base_path / "src/modules/studio/services/workspaceDatabaseService.ts",
        base_path / "src/modules/studio/services/podcastAIService.ts",
        base_path / "src/modules/studio/services/pautaPersistenceService.ts",
        base_path / "src/modules/studio/services/pautaGeneratorService.ts",
        # Studio hooks
        base_path / "src/modules/studio/hooks/useWorkspaceState.ts",
        base_path / "src/modules/studio/hooks/useWorkspaceAI.ts",
        base_path / "src/modules/studio/hooks/useStudioData.ts",
        base_path / "src/modules/studio/hooks/useSavedPauta.ts",
        base_path / "src/modules/studio/hooks/usePodcastFileSearch.ts",
        base_path / "src/modules/studio/hooks/useAutoSave.ts",
        # Studio views
        base_path / "src/modules/studio/views/StudioWorkspace.tsx",
        base_path / "src/modules/studio/views/StudioWizard.tsx",
        base_path / "src/modules/studio/views/StudioMainView.tsx",
        base_path / "src/modules/studio/views/StudioLibrary.tsx",
        base_path / "src/modules/studio/views/PodcastShowPage.tsx",
        # Studio context/components
        base_path / "src/modules/studio/context/PodcastWorkspaceContext.tsx",
        base_path / "src/modules/studio/components/CreatePodcastDialog.tsx",
        base_path / "src/modules/studio/components/workspace/SetupStage.tsx",
        base_path / "src/modules/studio/components/workspace/ResearchStage.tsx",
        base_path / "src/modules/studio/components/workspace/PodcastWorkspace.tsx",
        base_path / "src/modules/studio/components/workspace/PautaStage.tsx",
        # Podcast services
        base_path / "src/modules/podcast/services/guestResearchService.ts",
        base_path / "src/modules/podcast/services/episodeService.ts",
        # Podcast views
        base_path / "src/modules/podcast/views/PreProductionHub.tsx",
        base_path / "src/modules/podcast/views/GuestApprovalPage.tsx",
        # Podcast components
        base_path / "src/modules/podcast/components/GuestIdentificationWizard.tsx",
        base_path / "src/modules/podcast/components/GuestApprovalLinkDialog.tsx",
    ]

    migrated_count = 0
    for filepath in files_to_migrate:
        if filepath.exists():
            if migrate_file(str(filepath)):
                migrated_count += 1
        else:
            print(f"NOTFOUND {filepath.name}")

    print(f"\n✨ Migration complete! Migrated {migrated_count}/{len(files_to_migrate)} files.")

if __name__ == '__main__':
    main()
