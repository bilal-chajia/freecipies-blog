@echo off
echo ================================
echo  Deploy to Cloudflare Pages
echo ================================
echo.

echo [1/3] Building project...
call pnpm build
if %errorlevel% neq 0 (
    echo Build failed!
    exit /b 1
)
echo.

echo [2/3] Build successful!
echo.

echo [3/3] Deploying to Cloudflare...
call wrangler pages deploy dist --project-name=freecipies-blog
if %errorlevel% neq 0 (
    echo Deploy failed!
    exit /b 1
)

echo.
echo ================================
echo  Deploy successful!
echo ================================
