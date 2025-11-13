# Convert all markdown files to PDF using VS Code
# Make sure you have the "Markdown PDF" extension installed in VS Code

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  SiteProc Documentation to PDF  " -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Get all markdown files in docs folder
$mdFiles = Get-ChildItem -Path ".\docs\*.md" | Where-Object { $_.Name -ne "README.md" }

Write-Host "Found $($mdFiles.Count) markdown files to convert:" -ForegroundColor Green
foreach ($file in $mdFiles) {
    Write-Host "  - $($file.Name)" -ForegroundColor Yellow
}
Write-Host ""

# Check if PDFs already exist
$existingPdfs = Get-ChildItem -Path ".\docs\*.pdf" -ErrorAction SilentlyContinue
if ($existingPdfs) {
    Write-Host "Existing PDFs found:" -ForegroundColor Magenta
    foreach ($pdf in $existingPdfs) {
        Write-Host "  - $($pdf.Name)" -ForegroundColor Gray
    }
    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  How to Convert to PDF (3 Easy Options)  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "OPTION 1: Using VS Code (Recommended)" -ForegroundColor Green
Write-Host "  1. Open VS Code" -ForegroundColor White
Write-Host "  2. Open any .md file from docs folder" -ForegroundColor White
Write-Host "  3. Right-click in editor" -ForegroundColor White
Write-Host "  4. Select 'Markdown PDF: Export (pdf)'" -ForegroundColor White
Write-Host "  5. PDF created in same folder!" -ForegroundColor White
Write-Host "  6. Repeat for all 6 files" -ForegroundColor White
Write-Host ""

Write-Host "OPTION 2: Using Online Converter" -ForegroundColor Green
Write-Host "  1. Go to: https://www.markdowntopdf.com" -ForegroundColor White
Write-Host "  2. Upload .md file" -ForegroundColor White
Write-Host "  3. Click Convert" -ForegroundColor White
Write-Host "  4. Download PDF" -ForegroundColor White
Write-Host "  5. Save to docs folder" -ForegroundColor White
Write-Host ""

Write-Host "OPTION 3: Using Pandoc (Advanced)" -ForegroundColor Green
Write-Host "  Install Pandoc: https://pandoc.org/installing.html" -ForegroundColor White
Write-Host "  Then run in terminal:" -ForegroundColor White
Write-Host '    cd docs' -ForegroundColor Gray
Write-Host '    pandoc supplier-guide.md -o supplier-guide.pdf' -ForegroundColor Gray
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Ask user which method they want to use
Write-Host "Would you like to open the online converter now? (y/n): " -ForegroundColor Yellow -NoNewline
$response = Read-Host

if ($response -eq "y" -or $response -eq "Y") {
    Write-Host ""
    Write-Host "Opening online converter in browser..." -ForegroundColor Green
    Start-Process "https://www.markdowntopdf.com"
    Write-Host "You can now drag and drop the markdown files to convert them!" -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Files to Convert:                        " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [ ] docs/supplier-guide.md" -ForegroundColor White
Write-Host "  [ ] docs/company-admin-guide.md" -ForegroundColor White
Write-Host "  [ ] docs/site-manager-guide.md" -ForegroundColor White
Write-Host "  [ ] docs/quick-start-guide.md" -ForegroundColor White
Write-Host "  [ ] docs/api-documentation.md" -ForegroundColor White
Write-Host "  [ ] docs/faq-troubleshooting.md" -ForegroundColor White
Write-Host ""
Write-Host "After converting, the PDFs should be in the docs folder." -ForegroundColor Cyan
Write-Host "Your landing page is already updated to link to them!" -ForegroundColor Green
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Convert all 6 markdown files to PDF" -ForegroundColor White
Write-Host "  2. Verify PDFs are in docs folder" -ForegroundColor White
Write-Host "  3. Open landing-page-standalone.html" -ForegroundColor White
Write-Host "  4. Click on documentation links to test" -ForegroundColor White
Write-Host "  5. Deploy to your website!" -ForegroundColor White
Write-Host ""
