# Fix project detail page to add AppLayout wrapper
$filePath = "src\app\projects\[id]\page.tsx"
$content = Get-Content $filePath -Raw

# 1. Add AppLayout import after useRouter import
$content = $content -replace `
    "(import \{ useParams, useRouter \} from 'next/navigation')", `
    "`$1`nimport { AppLayout } from '@/components/app-layout'"

# 2. Wrap loading state in AppLayout
$content = $content -replace `
    "(\s+if \(!project\) return \()`r?`n(\s+<div className=""p-6"">)", `
    "`$1`n`$2<AppLayout>`n`$2  <div className=""p-6"">"

$content = $content -replace `
    "(\s+</div>)`r?`n(\s+\))`r?`n(\s+\))", `
    "`$1`n`$2    </AppLayout>`n`$2  )`n`$3"

# 3. Wrap main return in AppLayout
$content = $content -replace `
    "(\s+return \()`r?`n(\s+<Boundary>)`r?`n(\s+<div className=""max-w-7xl)", `
    "`$1`n`$2    <AppLayout>`n`$2      <Boundary>`n`$2        <div className=""max-w-7xl"

$content = $content -replace `
    "(\s+</div>)`r?`n(\s+</Boundary>)`r?`n(\s+\))", `
    "`$1`n`$2        </Boundary>`n`$2    </AppLayout>`n`$2  )"

# Better spinner for loading state
$content = $content -replace `
    "(\s+) : \(`r?`n(\s+<div>Loading…</div>)`r?`n(\s+\)\r?`n\s+\})", `
    "`$1) : (`n`$1  <div className=""flex items-center justify-center min-h-[60vh]"">`n`$1    <div className=""text-center space-y-3"">`n`$1      <div className=""inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600""></div>`n`$1      <div className=""text-gray-600"">Loading project details...</div>`n`$1    </div>`n`$1  </div>`n`$1)}`n`$1}"

# Save the modified content
$content | Set-Content $filePath -NoNewline

Write-Host "✅ Successfully updated project detail page!" -ForegroundColor Green
