# Compact Design Transformation Script
# This script transforms admin components to use compact design system
# while preserving decorative elements (icons, avatars, skeletons)

$rootPath = "src\admin"

# Files to transform
$filesToTransform = @(
    "pages\articles\ArticleFilters.jsx",
    "pages\categories\CategoryEditor.jsx",
    "pages\tags\TagEditor.jsx",
    "pages\settings\tabs\ImageUploadSettings.jsx",
    "pages\settings\tabs\GeneralSettings.jsx",
    "pages\settings\tabs\SocialSettings.jsx",
    "pages\settings\tabs\SeoSettings.jsx",
    "pages\settings\tabs\AdsSettings.jsx",
    "pages\homepage\sections\FeaturedSection.jsx",
    "pages\homepage\sections\PopularSection.jsx",
    "pages\media\MediaLibrary.jsx",
    "components\EditorMain\index.jsx",
    "components\AuthorEditorMain\index.jsx",
    "components\EditorSidebar\PublishingSection.jsx",
    "components\AuthorSidebar\PublishingSection.jsx"
)

Write-Host "🚀 Starting Compact Design Transformation..." -ForegroundColor Cyan
Write-Host ""

$totalChanges = 0

foreach ($file in $filesToTransform) {
    $fullPath = Join-Path $rootPath $file
    
    if (Test-Path $fullPath) {
        Write-Host "📝 Processing: $file" -ForegroundColor Yellow
        
        $content = Get-Content $fullPath -Raw
        $originalContent = $content
        $fileChanges = 0
        
        # Transform h-10 to h-8 (for inputs, selects, buttons - NOT icons/avatars)
        # Preserve: icon, avatar, skeleton patterns
        $content = $content -replace 'className="([^"]*?)h-10(?![0-9])(?!.*(?:icon|avatar|skeleton|animate-spin|w-10))([^"]*?)"', 'className="$1h-8$2"'
        $content = $content -replace "className='([^']*?)h-10(?![0-9])(?!.*(?:icon|avatar|skeleton|animate-spin|w-10))([^']*?)'", "className='$1h-8$2'"
        
        # Transform h-9 to h-8 (for inputs, selects)
        $content = $content -replace 'className="([^"]*?)h-9(?![0-9])([^"]*?)"', 'className="$1h-8$2"'
        $content = $content -replace "className='([^']*?)h-9(?![0-9])([^']*?)'", "className='$1h-8$2'"
        
        # Transform p-6 to p-3 (for containers)
        $content = $content -replace 'className="([^"]*?)p-6(?![0-9])([^"]*?)"', 'className="$1p-3$2"'
        $content = $content -replace "className='([^']*?)p-6(?![0-9])([^']*?)'", "className='$1p-3$2'"
        
        # Transform gap-6 to gap-3 (for grids/flex)
        $content = $content -replace 'className="([^"]*?)gap-6(?![0-9])([^"]*?)"', 'className="$1gap-3$2"'
        $content = $content -replace "className='([^']*?)gap-6(?![0-9])([^']*?)'", "className='$1gap-3$2'"
        
        # Transform px-3 to px-2.5 (for inputs)
        $content = $content -replace 'className="([^"]*?)px-3 py-2([^"]*?)"', 'className="$1px-2.5 py-1.5$2"'
        
        if ($content -ne $originalContent) {
            Set-Content -Path $fullPath -Value $content -NoNewline
            $fileChanges = ($content.Length - $originalContent.Length)
            $totalChanges++
            Write-Host "  ✅ Transformed successfully" -ForegroundColor Green
        } else {
            Write-Host "  ⏭️  No changes needed" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ⚠️  File not found: $fullPath" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✨ Transformation Complete!" -ForegroundColor Green
Write-Host "📊 Files transformed: $totalChanges / $($filesToTransform.Count)" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔍 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review changes in your editor" -ForegroundColor White
Write-Host "  2. Test the UI in your browser" -ForegroundColor White
Write-Host "  3. Check for any visual issues" -ForegroundColor White
