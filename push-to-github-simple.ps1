# Simple Push to GitHub Script
# Automatically handles conflicts and pushes
# Run: .\push-to-github-simple.ps1

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pushing to GitHub" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to script directory
Set-Location "E:\POS\POS Admin Pannel"

# Stage all changes
Write-Host "Staging all changes..." -ForegroundColor Cyan
git add -A

# Check if there are changes to commit
$status = git status --porcelain
if ($status) {
    Write-Host "Committing changes..." -ForegroundColor Cyan
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "Update: $timestamp" 2>&1 | Out-Null
    Write-Host "Committed successfully" -ForegroundColor Green
} else {
    Write-Host "No new changes to commit" -ForegroundColor Yellow
}

# Pull first to merge any remote changes
Write-Host "Pulling latest changes from GitHub..." -ForegroundColor Cyan
$pullOutput = git pull origin main --no-rebase --no-edit 2>&1 | Out-String

if ($pullOutput -match "CONFLICT") {
    Write-Host "Merge conflict detected. Resolving..." -ForegroundColor Yellow
    
    # Get conflicted files
    $conflicted = git diff --name-only --diff-filter=U
    
    foreach ($file in $conflicted) {
        Write-Host "Resolving conflict in: $file" -ForegroundColor Yellow
        # Use our version (local changes)
        git checkout --ours $file
        git add $file
    }
    
    # Commit the merge
    git commit -m "Resolve merge conflicts" --no-edit 2>&1 | Out-Null
    Write-Host "Conflicts resolved" -ForegroundColor Green
} else {
    Write-Host "Pull successful" -ForegroundColor Green
}

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
$pushOutput = git push origin main 2>&1 | Out-String

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host "Repository: https://github.com/Hussnain0341/POS-Admin" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Push failed. Error:" -ForegroundColor Red
    Write-Host $pushOutput -ForegroundColor Red
    Write-Host ""
    Write-Host "You may need to resolve conflicts manually or check your git credentials." -ForegroundColor Yellow
    Write-Host ""
}
