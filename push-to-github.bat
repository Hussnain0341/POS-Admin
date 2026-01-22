@echo off
echo.
echo ========================================
echo Pushing to GitHub
echo ========================================
echo.

echo Staging all changes...
git add -A

echo Committing changes...
git commit -m "Update: %date% %time% - Auto commit"

echo Pushing to GitHub...
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo Successfully pushed to GitHub!
    echo Repository: https://github.com/Hussnain0341/POS-Admin
) else (
    echo.
    echo Push failed. If you see "rejected", run:
    echo   git pull origin main --no-rebase
    echo   Then run this script again.
)

echo.
pause

