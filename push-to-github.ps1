# Push to GitHub Script
# Run: .\push-to-github.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pushing to GitHub" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if git is initialized
if (-not (Test-Path .git)) {
    Write-Host "Git not initialized. Run: git init" -ForegroundColor Red
    exit 1
}

# Check if remote exists
$remote = git remote get-url origin 2>$null
if (-not $remote) {
    Write-Host "No remote found. Adding remote..." -ForegroundColor Yellow
    git remote add origin https://github.com/Hussnain0341/POS-Admin.git
}

Write-Host "Staging all changes..." -ForegroundColor Cyan
git add -A

Write-Host "Checking for changes..." -ForegroundColor Cyan
$status = git status --porcelain
if (-not $status) {
    Write-Host "No changes to commit" -ForegroundColor Green
    Write-Host ""
    Write-Host "Pushing existing commits..." -ForegroundColor Cyan
} else {
    Write-Host "Committing changes..." -ForegroundColor Cyan
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "Update: $timestamp - Auto commit from push script"
}

Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
Write-Host ""

# Try to push
$pushResult = git push origin main 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host "Repository: https://github.com/Hussnain0341/POS-Admin" -ForegroundColor Cyan
    Write-Host ""
} else {
    if ($pushResult -match "rejected") {
        Write-Host ""
        Write-Host "Push rejected - remote has changes" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Options:" -ForegroundColor Cyan
        Write-Host "  1. Pull and merge: git pull origin main --no-rebase" -ForegroundColor White
        Write-Host "  2. Force push (overwrites remote): git push origin main --force" -ForegroundColor Red
        Write-Host ""
        $choice = Read-Host "Enter '1' to pull and merge, '2' to force push, or 'c' to cancel"
        
        if ($choice -eq "1") {
            Write-Host "Pulling changes..." -ForegroundColor Cyan
            git pull origin main --no-rebase
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Pushing again..." -ForegroundColor Cyan
                git push origin main
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "Successfully pushed!" -ForegroundColor Green
                }
            }
        } elseif ($choice -eq "2") {
            Write-Host "Force pushing (this will overwrite remote changes)..." -ForegroundColor Red
            $confirm = Read-Host "Type 'yes' to confirm"
            if ($confirm -eq "yes") {
                git push origin main --force
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "Force pushed successfully!" -ForegroundColor Green
                }
            } else {
                Write-Host "Cancelled" -ForegroundColor Yellow
            }
        } else {
            Write-Host "Cancelled" -ForegroundColor Yellow
        }
    } else {
        Write-Host ""
        Write-Host "Error pushing:" -ForegroundColor Red
        Write-Host $pushResult -ForegroundColor Red
    }
}

Write-Host ""
