# PowerShell Script to Upload Files to VPS
# Run this from your local Windows machine

$VPS_HOST = "147.79.117.39"
$VPS_USER = "root"
$DEPLOY_PATH = "/var/www/license-admin"
$LOCAL_PATH = ".\deploy-package"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📤 UPLOAD FILES TO VPS" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if deploy-package exists
if (-not (Test-Path $LOCAL_PATH)) {
    Write-Host "❌ Error: deploy-package folder not found!" -ForegroundColor Red
    Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "   Expected: $LOCAL_PATH" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found deploy-package folder" -ForegroundColor Green
Write-Host ""

# Check if SCP is available
$scpAvailable = $false
try {
    $null = scp -V 2>&1
    $scpAvailable = $true
} catch {
    Write-Host "⚠️  SCP not found. Please use one of these options:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Install OpenSSH Client" -ForegroundColor Cyan
    Write-Host "   Run: Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 2: Use WinSCP" -ForegroundColor Cyan
    Write-Host "   1. Download: https://winscp.net/" -ForegroundColor White
    Write-Host "   2. Connect to: $VPS_USER@$VPS_HOST" -ForegroundColor White
    Write-Host "   3. Upload deploy-package/* to $DEPLOY_PATH" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 3: Use Git Bash (if installed)" -ForegroundColor Cyan
    Write-Host "   Open Git Bash and run:" -ForegroundColor White
    Write-Host "   scp -r deploy-package/* root@$VPS_HOST`:$DEPLOY_PATH/" -ForegroundColor Yellow
    exit 1
}

Write-Host "📤 Uploading files to VPS..." -ForegroundColor Cyan
Write-Host "   Target: $VPS_USER@$VPS_HOST`:$DEPLOY_PATH" -ForegroundColor Gray
Write-Host ""

# First, create the directory on VPS
Write-Host "Creating directory on VPS..." -ForegroundColor Yellow
ssh $VPS_USER@$VPS_HOST "mkdir -p $DEPLOY_PATH"

# Upload files
Write-Host "Uploading files (this may take a few minutes)..." -ForegroundColor Yellow
$uploadCommand = "scp -r $LOCAL_PATH/* $VPS_USER@$VPS_HOST`:$DEPLOY_PATH/"
Write-Host "Running: $uploadCommand" -ForegroundColor Gray
Write-Host ""

# Execute SCP
& scp -r "$LOCAL_PATH\*" "${VPS_USER}@${VPS_HOST}:${DEPLOY_PATH}/"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Files uploaded successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. SSH into VPS: ssh $VPS_USER@$VPS_HOST" -ForegroundColor White
    Write-Host "  2. Run: cd $DEPLOY_PATH && chmod +x deploy-on-vps.sh && ./deploy-on-vps.sh" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Upload failed. Please try manually:" -ForegroundColor Red
    Write-Host "  1. Use WinSCP or FileZilla" -ForegroundColor Yellow
    Write-Host "  2. Or use Git Bash: scp -r deploy-package/* root@$VPS_HOST`:$DEPLOY_PATH/" -ForegroundColor Yellow
}

Write-Host ""

