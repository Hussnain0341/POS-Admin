# Simple Push to GitHub Script
# Automatically pulls and merges if needed
# Run: .\push-to-github-simple.ps1

$ErrorActionPreference = "Stop"

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
    git commit -m "Update: $timestamp"
} else {
    Write-Host "No new changes to commit" -ForegroundColor Yellow
}

# Pull first to merge any remote changes
Write-Host "Pulling latest changes from GitHub..." -ForegroundColor Cyan
try {
    git pull origin main --no-rebase --no-edit
    Write-Host "Pull successful" -ForegroundColor Green
} catch {
    Write-Host "Pull completed (may have conflicts)" -ForegroundColor Yellow
}

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host "Repository: https://github.com/Hussnain0341/POS-Admin" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Push failed. Check the error above." -ForegroundColor Red
}

Write-Host ""

