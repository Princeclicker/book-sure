#Requires -Version 5.1
<#
.SYNOPSIS
    Checks all import paths in the project for common issues that cause Turbopack errors.
.DESCRIPTION
    Scans .ts and .tsx files for import statements and validates:
    - @/* alias resolves to existing files
    - No circular dependencies
    - File extensions are correct
    - Server/client boundary violations
.EXAMPLE
    .\scripts\check-imports.ps1
    .\scripts\check-imports.ps1 -Verbose
#>

param(
    [switch]$Verbose,
    [string]$Root = "." # project root
)

$ErrorActionPreference = "Continue"
$ProjectRoot = Resolve-Path $Root
$Issues = @()
$ImportMap = @{}

Write-Host "`n=== Import Path Checker ===" -ForegroundColor Cyan
Write-Host "Scanning: $ProjectRoot`n" -ForegroundColor Gray

# ── 1. Find all TS/TSX source files ────────────────────────────────
$SourceFiles = Get-ChildItem -Path $ProjectRoot -Recurse -Include "*.ts", "*.tsx" |
    Where-Object { $_.FullName -notlike "*\node_modules\*" -and $_.FullName -notlike "*\.next\*" }

Write-Host "Found $($SourceFiles.Count) source files`n" -ForegroundColor Gray

# ── 2. Build file index for alias resolution ────────────────────────
$FileIndex = @{}
foreach ($file in $SourceFiles) {
    $relative = $file.FullName.Substring($ProjectRoot.Path.Length + 1).Replace('\', '/')
    # index without extension
    $noExt = $relative -replace '\.(ts|tsx|js|jsx)$', ''
    $FileIndex[$noExt] = $file.FullName
    $FileIndex[$relative] = $file.FullName
    # Also try with /index suffix
    $withIndex = "$noExt/index"
    $FileIndex[$withIndex] = $file.FullName
}

# ── 3. Parse each file for imports ─────────────────────────────────
foreach ($file in $SourceFiles) {
    $content = Get-Content $file.FullName -Raw
    $lines = Get-Content $file.FullName
    $relativePath = $file.FullName.Substring($ProjectRoot.Path.Length + 1).Replace('\', '/')

    # Match import statements: import ... from '...' and export ... from '...'
    $importRegex = "(?:import|export)\s+(?:(?:type|typeof)\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*(?:\{[^}]*\}|\w+))?\s*from\s+['""]([^'""]+)['""]"
    $dynamicImportRegex = "import\s*\(\s*['""]([^'""]+)['""]"

    $allMatches = @()
    $allMatches += [regex]::Matches($content, $importRegex)
    $allMatches += [regex]::Matches($content, $dynamicImportRegex)

    foreach ($match in $allMatches) {
        $importPath = $match.Groups[1].Value

        # Skip node_modules imports
        if ($importPath -notmatch "^[./@]") { continue }

        $lineNum = ($content.Substring(0, $match.Index) -split "`n").Count

        # ── Check @/* alias ──
        if ($importPath -match "^@/(.*)") {
            $resolved = $Matches[1]
            $found = $false
            foreach ($ext in @("", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js", "/index.jsx")) {
                $testPath = Join-Path $ProjectRoot ($resolved + $ext)
                if (Test-Path $testPath) { $found = $true; break }
            }
            if (-not $found) {
                $Issues += [PSCustomObject]@{
                    File    = $relativePath
                    Line    = $lineNum
                    Type    = "MISSING_ALIAS"
                    Message = "Cannot resolve @/$resolved"
                }
            }
        }

        # ── Check relative imports ──
        if ($importPath -match "^\.\.?/") {
            $dir = Split-Path $relativePath -Parent
            $resolved = ($dir + "/" + $importPath).Replace('\', '/').TrimEnd('/')
            # Normalize ../ and ./
            while ($resolved -match "\./") { $resolved = $resolved -replace "\./", "" }
            $found = $false
            foreach ($ext in @("", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx")) {
                $testPath = Join-Path $ProjectRoot ($resolved + $ext)
                if (Test-Path $testPath) { $found = $true; break }
            }
            if (-not $found) {
                $Issues += [PSCustomObject]@{
                    File    = $relativePath
                    Line    = $lineNum
                    Type    = "MISSING_RELATIVE"
                    Message = "Cannot resolve relative import: $importPath"
                }
            }
        }

        # ── Check for client->server boundary violations ──
        $isClientFile = $content -match "'use client'"
        if ($isClientFile) {
            $serverModules = @(
                "@/lib/db", "@/lib/auth", "@/lib/email", "@/lib/email-sender",
                "better-sqlite3", "pg", "nodemailer", "drizzle-orm",
                "@/app/actions/"
            )
            foreach ($serverMod in $serverModules) {
                if ($importPath -like "$serverMod*") {
                    $Issues += [PSCustomObject]@{
                        File    = $relativePath
                        Line    = $lineNum
                        Type    = "BOUNDARY_VIOLATION"
                        Message = "Client file imports server module: $importPath"
                    }
                }
            }
        }
    }
}

# ── 4. Check for proxy.ts at root (dead code indicator) ────────────
$proxyPath = Join-Path $ProjectRoot "proxy.ts"
if (Test-Path $proxyPath) {
    $Issues += [PSCustomObject]@{
        File    = "proxy.ts"
        Line    = 0
        Type    = "DEAD_CODE"
        Message = "proxy.ts at root is never imported. Remove it or convert to middleware.ts"
    }
}

# ── 5. Check for .js/.jsx imports in .ts/.tsx files ────────────────
foreach ($file in $SourceFiles) {
    $content = Get-Content $file.FullName -Raw
    $relativePath = $file.FullName.Substring($ProjectRoot.Path.Length + 1).Replace('\', '/')
    $jsImports = [regex]::Matches($content, "from\s+['""]([^'""]+\.(?:js|jsx))['""]")
    foreach ($m in $jsImports) {
        $lineNum = ($content.Substring(0, $m.Index) -split "`n").Count
        $Issues += [PSCustomObject]@{
            File    = $relativePath
            Line    = $lineNum
            Type    = "JS_IMPORT_IN_TS"
            Message = "TypeScript file imports .js/.jsx: $($m.Groups[1].Value)"
        }
    }
}

# ── 6. Output results ──────────────────────────────────────────────
if ($Issues.Count -eq 0) {
    Write-Host "`nNo import issues found!" -ForegroundColor Green
} else {
    Write-Host "`nFound $($Issues.Count) potential issue(s):`n" -ForegroundColor Yellow

    $grouped = $Issues | Group-Object Type
    foreach ($group in $grouped) {
        $color = switch ($group.Name) {
            "BOUNDARY_VIOLATION" { "Red" }
            "MISSING_ALIAS"      { "Red" }
            "MISSING_RELATIVE"   { "Yellow" }
            "DEAD_CODE"          { "DarkYellow" }
            default              { "White" }
        }
        Write-Host "[$($group.Name)] ($($group.Count) occurrences)" -ForegroundColor $color
        foreach ($issue in $group.Group) {
            $loc = if ($issue.Line -gt 0) { ":$($issue.Line)" } else { "" }
            Write-Host "  $($issue.File)$loc - $($issue.Message)" -ForegroundColor Gray
        }
        Write-Host ""
    }
}

# ── 7. Check for circular dependencies (simple 2-hop) ──────────────
Write-Host "`n=== Circular Dependency Check ===" -ForegroundColor Cyan

$CircularChains = @()
foreach ($file in $SourceFiles) {
    $content = Get-Content $file.FullName -Raw
    $relativePath = $file.FullName.Substring($ProjectRoot.Path.Length + 1).Replace('\', '/').TrimEnd('/')
    $relativePath = $relativePath -replace '\.(ts|tsx)$', ''

    $imports = [regex]::Matches($content, "from\s+['""](?:@/|\.\.?/)([^'""]+)['""]") |
        ForEach-Object { $_.Groups[1].Value -replace '\.(ts|tsx|js|jsx)$', '' -replace '/index$', '' }

    foreach ($imp in $imports) {
        $impFull = $imp
        if ($imp -match "^@/(.*)") { $impFull = $Matches[1] }

        # Check if the imported file imports us back
        $impFile = $FileIndex[$imp] ?? $FileIndex[$impFull]
        if ($impFile -and (Test-Path $impFile)) {
            $impContent = Get-Content $impFile -Raw -ErrorAction SilentlyContinue
            if ($impContent) {
                $backImports = [regex]::Matches($impContent, "from\s+['""](?:@/|\.\.?/)([^'""]+)['""]") |
                    ForEach-Object { $_.Groups[1].Value -replace '\.(ts|tsx|js|jsx)$', '' -replace '/index$', '' }
                foreach ($bi in $backImports) {
                    $biFull = $bi
                    if ($bi -match "^@/(.*)") { $biFull = $Matches[1] }
                    if ($biFull -eq $relativePath -or $bi -eq $relativePath) {
                        $CircularChains += "  $relativePath <-> $impFull"
                    }
                }
            }
        }
    }
}

$uniqueCircular = $CircularChains | Sort-Object -Unique
if ($uniqueCircular.Count -gt 0) {
    Write-Host "Circular dependencies detected:" -ForegroundColor Red
    $uniqueCircular | ForEach-Object { Write-Host $_ -ForegroundColor DarkRed }
} else {
    Write-Host "No circular dependencies found." -ForegroundColor Green
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
exit ([math]::Min($Issues.Count, 1))
