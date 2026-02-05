# PowerShell Terminal History Setup
# This script enables command history navigation with arrow keys

Write-Host "Setting up PowerShell command history..." -ForegroundColor Cyan

# Check if PSReadLine is installed
$psReadLineInstalled = Get-Module -ListAvailable -Name PSReadLine

if (-not $psReadLineInstalled) {
    Write-Host "Installing PSReadLine module..." -ForegroundColor Yellow
    Install-Module -Name PSReadLine -Force -SkipPublisherCheck -Scope CurrentUser
}

# Import PSReadLine
Import-Module PSReadLine

# Configure PSReadLine for better history
Set-PSReadLineOption -PredictionSource History
Set-PSReadLineOption -HistorySearchCursorMovesToEnd
Set-PSReadLineKeyHandler -Key UpArrow -Function HistorySearchBackward
Set-PSReadLineKeyHandler -Key DownArrow -Function HistorySearchForward

# Get PowerShell profile path
$profilePath = $PROFILE.CurrentUserCurrentHost

# Create profile directory if it doesn't exist
$profileDir = Split-Path -Parent $profilePath
if (-not (Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    Write-Host "Created profile directory: $profileDir" -ForegroundColor Green
}

# Profile content
$profileContent = @'
# PowerShell Profile - Terminal History Configuration

# Import PSReadLine for better command-line editing
Import-Module PSReadLine

# Enable predictive IntelliSense
Set-PSReadLineOption -PredictionSource History

# History search with up/down arrows
Set-PSReadLineKeyHandler -Key UpArrow -Function HistorySearchBackward
Set-PSReadLineKeyHandler -Key DownArrow -Function HistorySearchForward

# Move cursor to end when navigating history
Set-PSReadLineOption -HistorySearchCursorMovesToEnd

# Save more history
Set-PSReadLineOption -MaximumHistoryCount 10000

# Show better command suggestions
Set-PSReadLineOption -PredictionViewStyle ListView

Write-Host "PowerShell profile loaded - Command history enabled!" -ForegroundColor Green
'@

# Backup existing profile if it exists
if (Test-Path $profilePath) {
    $backupPath = "$profilePath.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $profilePath $backupPath
    Write-Host "Backed up existing profile to: $backupPath" -ForegroundColor Yellow
}

# Write new profile
$profileContent | Out-File -FilePath $profilePath -Encoding UTF8 -Force

Write-Host "`nProfile created at: $profilePath" -ForegroundColor Green
Write-Host "`nTo activate:" -ForegroundColor Cyan
Write-Host "1. Close this terminal" -ForegroundColor White
Write-Host "2. Open a new PowerShell terminal" -ForegroundColor White
Write-Host "3. Press Up/Down arrows to navigate command history" -ForegroundColor White
Write-Host "`nAlternatively, run this to reload immediately:" -ForegroundColor Cyan
Write-Host ". `$PROFILE" -ForegroundColor Yellow
