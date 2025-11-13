# Fix icon encoding issues using simple string replacement
$filePath = "landing-page-standalone.html"

# Read the file
$content = Get-Content $filePath -Raw -Encoding UTF8

# Define clean SVG icons
$chartIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path></svg>'

$moneyIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>'

$truckIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>'

$packageIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>'

$lockIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>'

# Replace sections with regex patterns that match the structure
$content = $content -replace '(<div class="stat-icon" style="background: rgba\(37, 99, 235, 0\.2\); color: #2563eb;">)[^<]+(<\/div>)', "`$1$chartIcon`$2"
$content = $content -replace '(<div class="stat-icon" style="background: rgba\(34, 197, 94, 0\.2\); color: #22c55e;">)[^<]+(<\/div>)', "`$1$moneyIcon`$2"
$content = $content -replace '(<div class="stat-icon" style="background: rgba\(245, 158, 11, 0\.2\); color: #f59e0b;">)[^<]+(<\/div>)', "`$1$truckIcon`$2"
$content = $content -replace '(<div class="stat-icon" style="background: rgba\(168, 85, 247, 0\.2\); color: #a855f7;">)[^<]+(<\/div>)', "`$1$packageIcon`$2"

# Fix lock icon in URL bar
$content = $content -replace '(<span>)[^<]+(<\/span>\s*<span>siteproc\.app/dashboard<\/span>)', "`$1$lockIcon`$2"

# Write back
$utf8WithBom = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText("$PWD\$filePath", $content, $utf8WithBom)

Write-Host "Icons fixed successfully! Refresh your browser (Ctrl+Shift+R) to see the changes." -ForegroundColor Green
