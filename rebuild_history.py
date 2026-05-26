import subprocess
import os
import sys

def run_cmd(args, check=True):
    print(f"Running: {' '.join(args)}")
    result = subprocess.run(args, capture_output=True, text=True)
    if check and result.returncode != 0:
        print(f"Error executing command: {' '.join(args)}")
        print("STDOUT:", result.stdout)
        print("STDERR:", result.stderr)
        sys.exit(result.returncode)
    return result

def check_build():
    print("Verifying build/typecheck...")
    result = subprocess.run(["pnpm", "typecheck"], capture_output=True, text=True, shell=True)
    if result.returncode != 0:
        print("Typecheck failed!")
        print("STDOUT:", result.stdout)
        print("STDERR:", result.stderr)
        sys.exit(1)
    print("Typecheck passed successfully!")

def main():
    # Make a backup tag at current HEAD
    print("Creating backup tag backup-head at current HEAD...")
    run_cmd(["git", "tag", "-f", "backup-head"])

    # Create and checkout rebuild-history branch starting from 95d53bc
    print("Checking out fresh rebuild-history branch from 95d53bc...")
    run_cmd(["git", "checkout", "-B", "rebuild-history", "95d53bc"])

    # 1. Commit 1: establish Zustand store infrastructure and rename inserter/sidebar panels
    print("\n--- Preparing Commit 1 ---")
    files_c1 = [
        "src/admin/components/BlockEditor/blocks/BlockAdapter.ts",
        "src/admin/components/BlockEditor/blocks/adapters/TableAdapter.ts",
        "src/admin/components/BlockEditor/blocks/adapters/__tests__/roundtrip.test.ts",
        "src/admin/components/BlockEditor/blocks/index.ts",
        "src/admin/components/BlockEditor/components/BlockPlaceholder.tsx",
        "src/admin/components/BlockEditor/components/BlockWrapper.tsx",
        "src/admin/components/BlockEditor/components/CustomSlashMenu.tsx",
        "src/admin/components/BlockEditor/components/DocumentSettings.tsx",
        "src/admin/components/BlockEditor/components/EditorStats.tsx",
        "src/admin/components/BlockEditor/components/GutenbergEditorLayout.tsx",
        "src/admin/components/BlockEditor/components/GutenbergEditorMain.tsx",
        "src/admin/components/BlockEditor/components/RightPanel.tsx",
        "src/admin/components/BlockEditor/components/index.ts",
        "src/admin/components/BlockEditor/hooks/useBlockEditorHydration.ts",
        "src/admin/components/BlockEditor/index.tsx",
        "src/admin/components/BlockEditor/store/blockEditorStore.ts",
        "src/admin/components/BlockEditor/styles/block-editor-core.css",
        "src/admin/components/BlockEditor/styles/block-editor-tokens.css",
        "src/admin/components/BlockEditor/utils/__tests__/image-selection.test.ts",
        "src/admin/components/BlockEditor/utils/blockColors.ts",
        "src/admin/components/BlockEditor/utils/image-selection.ts",
        "src/admin/components/BlockEditor/utils/json.ts",
        "src/admin/components/BlockEditor/utils/types.ts"
    ]
    
    # Checkout files from backup-head
    for f in files_c1:
        run_cmd(["git", "checkout", "backup-head", "--", f])

    # Remove the old files
    run_cmd(["git", "rm", "-f", "src/admin/components/BlockEditor/components/BlockInserter.tsx"], check=False)
    run_cmd(["git", "rm", "-f", "src/admin/components/BlockEditor/components/SettingsSidebar.tsx"], check=False)

    # Create LeftPanel.tsx from 95d53bc:BlockInserter.tsx
    print("Re-creating LeftPanel.tsx as a clean rename from original BlockInserter.tsx...")
    res = run_cmd(["git", "show", "95d53bc:src/admin/components/BlockEditor/components/BlockInserter.tsx"])
    original_code = res.stdout
    new_code = original_code.replace("BlockInserter", "LeftPanel")
    left_panel_path = "src/admin/components/BlockEditor/components/LeftPanel.tsx"
    os.makedirs(os.path.dirname(left_panel_path), exist_ok=True)
    with open(left_panel_path, "w", encoding="utf-8") as f_out:
        f_out.write(new_code)

    # Re-create GutenbergEditorShell.tsx with panel renames from original 95d53bc
    print("Patching GutenbergEditorShell.tsx with panel renames...")
    res_shell = run_cmd(["git", "show", "95d53bc:src/admin/features/articles/pages/shared/GutenbergEditorShell.tsx"])
    shell_code = res_shell.stdout
    shell_code = shell_code.replace("BlockInserter", "LeftPanel")
    shell_code = shell_code.replace("SettingsSidebar", "RightPanel")
    shell_path = "src/admin/features/articles/pages/shared/GutenbergEditorShell.tsx"
    with open(shell_path, "w", encoding="utf-8") as f_out:
        f_out.write(shell_code)

    # Patch MenuItemInspector.tsx with panel renames from original 95d53bc
    print("Patching MenuItemInspector.tsx with panel renames...")
    res_menu = run_cmd(["git", "show", "95d53bc:src/admin/features/settings/pages/tabs/components/menu/MenuItemInspector.tsx"])
    menu_code = res_menu.stdout
    menu_code = menu_code.replace("SettingsSidebar", "RightPanel")
    menu_path = "src/admin/features/settings/pages/tabs/components/menu/MenuItemInspector.tsx"
    with open(menu_path, "w", encoding="utf-8") as f_out:
        f_out.write(menu_code)

    # Stage and commit
    run_cmd(["git", "add", "-A"])
    run_cmd(["git", "commit", "-m", "refactor(block-editor): establish Zustand store infrastructure and rename inserter/sidebar panels"])
    check_build()

    # 2. Commit 2: resolve cursor-jumping, contentRef callbacks and unstable selection listeners
    print("\n--- Preparing Commit 2 ---")
    files_c2 = [
        "src/admin/components/BlockEditor/blocks/DividerBlock.tsx",
        "src/admin/components/BlockEditor/blocks/TipBoxBlock.tsx",
        "src/admin/components/BlockEditor/hooks/useBlockSelection.ts",
        "src/admin/components/BlockEditor/hooks/useEditorStateManager.ts",
        "src/admin/components/BlockEditor/hooks/useInsertHandle.ts"
    ]
    for f in files_c2:
        run_cmd(["git", "checkout", "backup-head", "--", f])
    run_cmd(["git", "add", "-A"])
    run_cmd(["git", "commit", "-m", "fix(block-editor): resolve cursor-jumping, contentRef callbacks and unstable selection listeners"])
    check_build()

    # 3. Commit 3: PR 1 - extract json utils and alignment picker
    print("\n--- Preparing Commit 3 ---")
    files_c3 = [
        "src/admin/components/BlockEditor/components/block-settings/AlignmentPicker.tsx",
        "src/admin/components/BlockEditor/components/block-settings/helpers.ts"
    ]
    for f in files_c3:
        run_cmd(["git", "checkout", "backup-head", "--", f])
    run_cmd(["git", "add", "-A"])
    run_cmd(["git", "commit", "-m", "refactor(block-editor): PR 1 - extract json utils and alignment picker"])
    check_build()

    # 4. Commit 4: PR 2 - decompose FAQSectionBlock and sortable items
    print("\n--- Preparing Commit 4 ---")
    files_c4 = [
        "src/admin/components/BlockEditor/blocks/FAQSectionBlock.tsx",
        "src/admin/components/BlockEditor/blocks/faq/FAQBlock.types.ts",
        "src/admin/components/BlockEditor/blocks/faq/SortableFAQItem.tsx"
    ]
    for f in files_c4:
        run_cmd(["git", "checkout", "backup-head", "--", f])
    run_cmd(["git", "add", "-A"])
    run_cmd(["git", "commit", "-m", "refactor(block-editor): PR 2 - decompose FAQSectionBlock and sortable items"])
    check_build()

    # 5. Commit 5: PR 3 - extract BeforeAfter slot editor and RelatedContent cards/helpers
    print("\n--- Preparing Commit 5 ---")
    files_c5 = [
        "src/admin/components/BlockEditor/blocks/BeforeAfterBlock.tsx",
        "src/admin/components/BlockEditor/blocks/RelatedContentBlock.tsx",
        "src/admin/components/BlockEditor/blocks/before-after/BeforeAfterBlock.types.ts",
        "src/admin/components/BlockEditor/blocks/before-after/ImageSlotEditor.tsx",
        "src/admin/components/BlockEditor/blocks/related-content/RelatedContentBlock.types.ts",
        "src/admin/components/BlockEditor/blocks/related-content/RelatedItemCard.tsx",
        "src/admin/components/BlockEditor/blocks/related-content/utils.ts"
    ]
    for f in files_c5:
        run_cmd(["git", "checkout", "backup-head", "--", f])
    run_cmd(["git", "add", "-A"])
    run_cmd(["git", "commit", "-m", "refactor(block-editor): PR 3 - extract BeforeAfter slot editor and RelatedContent cards/helpers"])
    check_build()

    # 6. Commit 6: PR 4 - extract LeftPanel components and optimize store subscriptions
    print("\n--- Preparing Commit 6 ---")
    files_c6 = [
        "src/admin/components/BlockEditor/components/LeftPanel.tsx",
        "src/admin/components/BlockEditor/components/left-panel/SortableStructureItem.tsx",
        "src/admin/components/BlockEditor/components/left-panel/StructureActionsMenu.tsx"
    ]
    for f in files_c6:
        run_cmd(["git", "checkout", "backup-head", "--", f])
    run_cmd(["git", "add", "-A"])
    run_cmd(["git", "commit", "-m", "refactor(block-editor): PR 4 - extract LeftPanel components and optimize store subscriptions"])
    check_build()

    # 7. Commit 7: PR 5 - extract Heading, Paragraph, and Title/Headline settings
    print("\n--- Preparing Commit 7 ---")
    files_c7 = [
        "src/admin/components/BlockEditor/components/block-settings/HeadingSettings.tsx",
        "src/admin/components/BlockEditor/components/block-settings/ParagraphSettings.tsx",
        "src/admin/components/BlockEditor/components/block-settings/TitleHeadlineSettings.tsx"
    ]
    for f in files_c7:
        run_cmd(["git", "checkout", "backup-head", "--", f])
    run_cmd(["git", "add", "-A"])
    run_cmd(["git", "commit", "-m", "refactor(block-editor): PR 5 - extract Heading, Paragraph, and Title/Headline settings"])
    check_build()

    # 8. Commit 8: PR 6 - extract Alert, Divider, FAQ, and Video settings
    print("\n--- Preparing Commit 8 ---")
    files_c8 = [
        "src/admin/components/BlockEditor/components/block-settings/AlertSettings.tsx",
        "src/admin/components/BlockEditor/components/block-settings/DividerSettings.tsx",
        "src/admin/components/BlockEditor/components/block-settings/FAQSettings.tsx",
        "src/admin/components/BlockEditor/components/block-settings/VideoSettings.tsx"
    ]
    for f in files_c8:
        run_cmd(["git", "checkout", "backup-head", "--", f])
    run_cmd(["git", "add", "-A"])
    run_cmd(["git", "commit", "-m", "refactor(block-editor): PR 6 - extract Alert, Divider, FAQ, and Video settings"])
    check_build()

    # 9. Commit 9: PR 7 - extract remaining settings and convert BlockSettings to Router-delegated shell
    print("\n--- Preparing Commit 9 ---")
    files_c9 = [
        "src/admin/components/BlockEditor/components/BlockSettings.tsx",
        "src/admin/components/BlockEditor/components/block-settings/BeforeAfterSettings.tsx",
        "src/admin/components/BlockEditor/components/block-settings/BlockSettingsRouter.tsx",
        "src/admin/components/BlockEditor/components/block-settings/FeaturedImageSettings.tsx",
        "src/admin/components/BlockEditor/components/block-settings/ImageSettings.tsx",
        "src/admin/components/BlockEditor/components/block-settings/TableSettings.tsx"
    ]
    for f in files_c9:
        run_cmd(["git", "checkout", "backup-head", "--", f])
    run_cmd(["git", "add", "-A"])
    run_cmd(["git", "commit", "-m", "refactor(block-editor): PR 7 - extract remaining settings and convert BlockSettings to Router-delegated shell"])
    check_build()

    # 10. Commit 10: PR 8 - decompose TableBlock monolithic component to hooks and subcomponents
    print("\n--- Preparing Commit 10 ---")
    files_c10 = [
        "src/admin/components/BlockEditor/blocks/TableBlock.tsx",
        "src/admin/components/BlockEditor/blocks/table/InsertIndicators.tsx",
        "src/admin/components/BlockEditor/blocks/table/TableCell.tsx",
        "src/admin/components/BlockEditor/blocks/table/TableHeaderCell.tsx",
        "src/admin/components/BlockEditor/blocks/table/useInsertIndicators.ts",
        "src/admin/components/BlockEditor/blocks/table/useTableDraft.ts",
        "src/admin/components/BlockEditor/blocks/table/TableBlock.types.ts"
    ]
    for f in files_c10:
        run_cmd(["git", "checkout", "backup-head", "--", f])
    run_cmd(["git", "add", "-A"])
    run_cmd(["git", "commit", "-m", "refactor(block-editor): PR 8 - decompose TableBlock monolithic component to hooks and subcomponents"])
    check_build()

    # 11. Commit 11: clean up brainstorm sessions, lighthouse logs and architectural specifications
    print("\n--- Preparing Commit 11 ---")
    files_c11 = [
        ".superpowers/brainstorm/session-1/content/module-analysis.html",
        ".superpowers/brainstorm/session-1/content/visual-layouts.html",
        ".superpowers/brainstorm/session-1/content/visual-styles.html",
        ".superpowers/brainstorm/session-1/state/events",
        ".superpowers/brainstorm/session-1/state/server-info",
        "docs/IMPLEMENTATION_GAPS.md",
        "docs/superpowers/specs/2026-05-23-block-editor-deep-refactor-design.md",
        "lighthouse-avocado-toast.json"
    ]
    for f in files_c11:
        run_cmd(["git", "rm", "-f", f], check=False)
    run_cmd(["git", "add", "-A"])
    run_cmd(["git", "commit", "-m", "chore: clean up brainstorm sessions, lighthouse logs and architectural specifications"])
    check_build()

    # 12. Commit 12: optimize core App, Layout, UI primitives, loaders, and styles
    print("\n--- Preparing Commit 12 ---")
    files_c12 = [
        "src/admin/App.css",
        "src/admin/app/AdminApp.tsx",
        "src/admin/components/AdminLayout.tsx",
        "src/admin/components/AppSidebar.tsx",
        "src/admin/components/ArticleSearchAutocomplete.tsx",
        "src/admin/components/FaviconUploader.tsx",
        "src/admin/components/LogoUploader.tsx",
        "src/admin/components/PageLoader.tsx",
        "src/admin/components/RecipeBuilder.tsx",
        "src/admin/components/TagSelector.tsx",
        "src/admin/components/shared/ContentListBase.tsx",
        "src/admin/components/PageSkeletons.tsx",
        "src/admin/components/ui/LoadingState.tsx",
        "src/admin/hooks/useImageUploadSettings.ts",
        "src/admin/index.css",
        "src/admin/ui/accordion.tsx",
        "src/admin/ui/badge.tsx",
        "src/admin/ui/breadcrumb.tsx",
        "src/admin/ui/button.tsx",
        "src/admin/ui/data-table.tsx",
        "src/admin/ui/dialog.tsx",
        "src/admin/ui/hover-card.tsx",
        "src/admin/ui/input.tsx",
        "src/admin/ui/navigation-menu.tsx",
        "src/admin/ui/popover.tsx",
        "src/admin/ui/resizable.tsx",
        "src/admin/ui/scroll-area.tsx",
        "src/admin/ui/select.tsx",
        "src/admin/ui/sheet.tsx",
        "src/admin/ui/sidebar.tsx",
        "src/admin/ui/table.tsx",
        "src/admin/ui/tabs.tsx",
        "src/admin/ui/textarea.tsx",
        "src/admin/ui/toggle.tsx",
        "src/admin/utils/imageCompression.ts"
    ]
    for f in files_c12:
        run_cmd(["git", "checkout", "backup-head", "--", f], check=False)
    run_cmd(["git", "rm", "-f", "src/admin/components/FaviconUploader.tsx"], check=False)
    run_cmd(["git", "rm", "-f", "src/admin/components/LogoUploader.tsx"], check=False)
    run_cmd(["git", "rm", "-f", "src/admin/utils/imageCompression.ts"], check=False)
    run_cmd(["git", "rm", "-f", "src/admin/components/PageSkeletons.tsx"], check=False)

    run_cmd(["git", "add", "-A"])
    run_cmd(["git", "commit", "-m", "refactor(admin): optimize core App, Layout, UI primitives, loaders, and styles"])
    check_build()

    # 13. Commit 13: optimize features including media dialogs, article editor shells, filters and tag lists
    print("\n--- Preparing Commit 13 ---")
    files_c13 = [
        "src/admin/features/articles/pages/ArticleFilters.tsx",
        "src/admin/features/articles/pages/shared/useContentEditor.ts",
        "src/admin/features/authors/pages/AuthorsList.tsx",
        "src/admin/features/categories/pages/CategoriesList.tsx",
        "src/admin/features/categories/pages/CategoryEditor.tsx",
        "src/admin/features/dashboard/pages/Dashboard.tsx",
        "src/admin/features/homepage/components/HomepageLayout.tsx",
        "src/admin/features/media/components/ImageUploader/index.tsx",
        "src/admin/features/media/components/MediaDialog.tsx",
        "src/admin/features/media/components/MediaList.tsx",
        "src/admin/features/media/pages/MediaLibrary.tsx",
        "src/admin/features/settings/components/SettingsLayout.tsx",
        "src/admin/features/settings/pages/tabs/components/menu/MenuItemInspector.tsx",
        "src/admin/features/tags/pages/TagEditor.tsx",
        "src/admin/features/tags/pages/TagsList.tsx",
        "src/admin/features/articles/pages/shared/GutenbergEditorShell.tsx"
    ]
    for f in files_c13:
        run_cmd(["git", "checkout", "backup-head", "--", f], check=False)
    run_cmd(["git", "rm", "-f", "src/admin/features/tags/pages/TagEditor.tsx"], check=False)

    run_cmd(["git", "add", "-A"])
    run_cmd(["git", "commit", "-m", "refactor(admin): optimize features including media dialogs, article editor shells, filters and tag lists"])
    check_build()

    # 14. Commit 14: improve public components, modules settings and developer rules
    print("\n--- Preparing Commit 14 ---")
    files_c14 = [
        "AGENTS.md",
        "CLAUDE.md",
        "src/modules/settings/services/settings.service.ts",
        "src/site/components/HeaderLink.astro",
        "src/site/components/PinterestPins.astro",
        "src/site/components/RecipeCard.astro",
        "src/site/components/RecipeFilters.astro",
        "src/site/components/content/blocks/Image.astro",
        "src/site/components/ui/Card.astro"
    ]
    for f in files_c14:
        run_cmd(["git", "checkout", "backup-head", "--", f], check=False)
    run_cmd(["git", "rm", "-f", "src/site/components/HeaderLink.astro"], check=False)
    run_cmd(["git", "rm", "-f", "src/site/components/PinterestPins.astro"], check=False)
    run_cmd(["git", "rm", "-f", "src/site/components/RecipeFilters.astro"], check=False)
    run_cmd(["git", "rm", "-f", "src/site/components/ui/Card.astro"], check=False)

    run_cmd(["git", "add", "-A"])
    run_cmd(["git", "commit", "-m", "refactor(site): improve public components, modules settings and developer rules"])
    check_build()

    # 15. Commit 15: synchronize agent local metadata skills
    print("\n--- Preparing Commit 15 ---")
    files_c15 = [
        ".agent/skills/composition-patterns/SKILL.md",
        ".agent/skills/design-an-interface/SKILL.md",
        ".agent/skills/diagnose/SKILL.md",
        ".agent/skills/freecipies-admin-react/SKILL.md",
        ".agent/skills/frontend-design/SKILL.md",
        ".agent/skills/git-guardrails-claude-code/SKILL.md",
        ".agent/skills/grill-me/SKILL.md",
        ".agent/skills/grill-with-docs/SKILL.md",
        ".agent/skills/handoff/SKILL.md",
        ".agent/skills/improve-codebase-architecture/SKILL.md",
        ".agent/skills/karpathy-rules/SKILL.md",
        ".agent/skills/react-best-practices/SKILL.md",
        ".agent/skills/setup-matt-pocock-skills/SKILL.md",
        ".agent/skills/setup-pre-commit/SKILL.md",
        ".agent/skills/tdd/SKILL.md",
        ".agent/skills/to-issues/SKILL.md",
        ".agent/skills/to-prd/SKILL.md",
        ".agent/skills/triage/SKILL.md",
        ".agent/skills/web-artifacts-builder/SKILL.md",
        ".agent/skills/web-design-guidelines/SKILL.md",
        ".agent/skills/write-a-skill/SKILL.md",
        ".agent/skills/zoom-out/SKILL.md"
    ]
    for f in files_c15:
        run_cmd(["git", "checkout", "backup-head", "--", f], check=False)
    # Delete non-existent skills
    for f in files_c15:
        if f != ".agent/skills/karpathy-rules/SKILL.md":
            run_cmd(["git", "rm", "-f", f], check=False)

    run_cmd(["git", "add", "-A"])
    run_cmd(["git", "commit", "-m", "chore: synchronize agent local metadata skills"])
    check_build()

    # 16. Commit 16: finalize block settings and router integrations for image, video and recipe blocks
    print("\n--- Preparing Commit 16 ---")
    files_c16 = [
        "src/admin/components/BlockEditor/blocks/ImageBlock.tsx",
        "src/admin/components/BlockEditor/blocks/MainRecipeBlock.tsx",
        "src/admin/components/BlockEditor/blocks/RoundupListBlock.tsx",
        "src/admin/components/BlockEditor/blocks/VideoBlock.tsx",
        "src/admin/components/BlockEditor/components/block-settings/RelatedContentSettings.tsx"
    ]
    for f in files_c16:
        run_cmd(["git", "checkout", "backup-head", "--", f], check=False)
    run_cmd(["git", "add", "-A"])
    run_cmd(["git", "commit", "-m", "refactor(block-editor): finalize block settings and router integrations for image, video and recipe blocks"])
    check_build()

    # Point local architecture-admin-site-split branch to rebuild-history
    print("\nResetting local architecture-admin-site-split branch to rebuild-history...")
    run_cmd(["git", "checkout", "architecture-admin-site-split"])
    run_cmd(["git", "reset", "--hard", "rebuild-history"])

    # Delete temporary branch
    run_cmd(["git", "branch", "-D", "rebuild-history"])
    print("\nAll 16 commits rebuilt, type-checked, and local branch updated successfully!")

if __name__ == "__main__":
    main()
