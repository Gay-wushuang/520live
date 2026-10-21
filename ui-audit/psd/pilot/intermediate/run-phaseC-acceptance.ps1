<#
.SYNOPSIS
    PSD Pilot v2.1 — Photoshop 验收 COM 调用程序。

.DESCRIPTION
    职责：
      1) 把交付 PSD 复制为临时副本（SHA256 必须与交付文件一致），验收只操作副本；
      2) 启动/连接真实 Photoshop（COM），调用 pilot-phaseC-acceptance.jsx；
      3) 把“脚本返回值 / 结果 JSON / 每个必需检查项 / 每个证据文件 / 交付文件哈希”
         全部作为判定条件 —— 任一不满足即以非零退出码失败。

    退出码：
      0  全部证据齐备且通过
      1  存在断言失败、脚本异常、缺少必需检查项或证据文件
      2  环境/COM 调用失败（无法连接 Photoshop、脚本无法执行等）

.EXAMPLE
    pwsh -NoProfile -ExecutionPolicy Bypass -File ui-audit/psd/pilot/intermediate/run-phaseC-acceptance.ps1
#>
[CmdletBinding()]
param(
    [string]$WorkDir = '',
    [string]$HostPsd = '',
    [string]$Marker = '',
    [int]$AttachTimeoutSeconds = 240,
    [switch]$KeepPhotoshopOpen,
    [switch]$SkipPixelDiff,
    [switch]$ValidateOnly
)

$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $WorkDir) { $WorkDir = Join-Path $scriptDir 'acceptance-v21' }
if (-not $HostPsd) { $HostPsd = Join-Path (Split-Path -Parent $scriptDir) 'CardWheel-Editable-v2.psd' }
if (-not $Marker) { $Marker = Join-Path $scriptDir 'card-spring-marker.png' }
$jsxPath = Join-Path $scriptDir 'pilot-phaseC-acceptance.jsx'

$failures = [System.Collections.Generic.List[string]]::new()
$notes = [System.Collections.Generic.List[string]]::new()
function Fail([string]$msg) { $failures.Add($msg); Write-Host ("FAIL " + $msg) -ForegroundColor Red }
function Note([string]$msg) { $notes.Add($msg); Write-Host ("INFO " + $msg) }
function Pass([string]$msg) { Write-Host ("PASS " + $msg) -ForegroundColor Green }

# 与 pilot-phaseC-acceptance.jsx 中的 REQUIRED 保持一致（双份校验：缺任何一项都失败）
$RequiredChecks = @(
    'PS-OPEN', 'PS-VERSION', 'SOURCE-IS-TEMP-COPY', 'STRUCTURE-COUNTS', 'SNAPSHOT-BASELINE',
    'SO-DIM:Spring', 'SO-DIM:Summer', 'SO-DIM:Autumn', 'SO-DIM:Winter',
    'SO-DISPLAY-SIZE', 'SO-SAMPLES-BASELINE',
    'OPEN-EXPORT',
    'SMART-OBJECT-FOUND', 'SMART-OBJECT-REPLACE',
    'SPRING-SO-KIND-AFTER-REPLACE', 'SPRING-SO-BOUNDS-UNCHANGED',
    'SPRING-SO-DIM-AFTER-REPLACE', 'SPRING-SO-COLOR-AFTER-REPLACE', 'SPRING-SO-MARKER-PATTERN',
    'REPLACE-NO-STRUCTURE-CHANGE', 'POST-REPLACE-EXPORT',
    'SAVE', 'REOPEN',
    'STRUCTURE-AFTER-REOPEN', 'STRUCTURE-SNAPSHOT-STABLE', 'TEXT-COUNT-AFTER-REOPEN',
    'SPRING-SO-PERSIST-DIM', 'SPRING-SO-PERSIST-COLOR', 'OTHER-SO-CONTENT-STABLE',
    'COMPOSITE-EXPORT',
    'TITLE-LAYER-FOUND', 'TITLE-EDIT-VISIBLE',
    'BUTTON-LABEL-FOUND', 'BUTTON-EDIT-VISIBLE',
    'SHAPE-LAYER-FOUND', 'SHAPE-EDIT', 'SHAPE-FILL-VISIBLE', 'SHAPE-EDIT-NO-STRUCTURE-CHANGE',
    'EDIT-EXPORT',
    'EDIT-SAVE', 'EDIT-REOPEN',
    'TEXT-PERSIST-AFTER-REOPEN', 'STRUCTURE-AFTER-EDIT-REOPEN', 'SPRING-SO-STILL-MARKER',
    'EDIT-REOPEN-EXPORT'
)

if (-not (Test-Path $HostPsd)) { Write-Host ("FATAL 交付 PSD 不存在: " + $HostPsd) -ForegroundColor Red; exit 2 }
if (-not (Test-Path $Marker)) { Write-Host ("FATAL 标记图不存在: " + $Marker) -ForegroundColor Red; exit 2 }
if (-not (Test-Path $jsxPath)) { Write-Host ("FATAL 验收脚本不存在: " + $jsxPath) -ForegroundColor Red; exit 2 }

New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null
$runnerLog = Join-Path $WorkDir 'runner.log'
$stamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
$runnerLines = [System.Collections.Generic.List[string]]::new()
$runnerLines.Add("PSD Pilot v2.1 acceptance runner — $stamp")
$runnerLines.Add("ps7          = $($PSVersionTable.PSVersion)")
$runnerLines.Add("workdir      = $WorkDir")
$runnerLines.Add("host psd     = $HostPsd")
$runnerLines.Add("marker       = $Marker")
$runnerLines.Add("jsx          = $jsxPath")

function FlushLog() {
    [System.IO.File]::WriteAllLines($runnerLog, $runnerLines, [System.Text.UTF8Encoding]::new($false))
}

# ------------------------------------------------------------------ 1) 临时副本
$hostHashBefore = (Get-FileHash -Algorithm SHA256 -Path $HostPsd).Hash
$hostBytesBefore = (Get-Item $HostPsd).Length
$workPsd = Join-Path $WorkDir 'CardWheel-v2.1-working.psd'
$psVersion = $null
$app = $null
$startedByUs = $false
$rawReturn = $null

if ($ValidateOnly) {
    Note 'VALIDATE-ONLY :: 跳过 Photoshop 执行，仅重新校验既有证据（用于失败可检测性自检）'
} else {
    Copy-Item -LiteralPath $HostPsd -Destination $workPsd -Force
    $workHash = (Get-FileHash -Algorithm SHA256 -Path $workPsd).Hash
    $runnerLines.Add("host sha256  = $hostHashBefore")
    $runnerLines.Add("copy sha256  = $workHash")
    if ($workHash -ne $hostHashBefore) { Fail "TEMP-COPY-MISMATCH: 临时副本与交付 PSD 哈希不一致" } else { Pass "TEMP-COPY :: sha256=$($hostHashBefore.Substring(0,16))… bytes=$hostBytesBefore" }

    $env:PSD_PILOT_WORKDIR = $WorkDir
    $env:PSD_PILOT_WORK_PSD = $workPsd
    $env:PSD_PILOT_MARKER = $Marker

    # -------------------------------------------------------------- 2) 连接 Photoshop
    $psExe = $null
    $appPath = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\Photoshop.exe' -ErrorAction SilentlyContinue
    if ($appPath) { $psExe = $appPath.'(default)' }
    if (-not $psExe -or -not (Test-Path $psExe)) {
        $candidates = @(
            'E:\Adode\Ps\Adobe Photoshop 2024\Photoshop.exe',
            'C:\Program Files\Adobe\Adobe Photoshop 2024\Photoshop.exe'
        ) | Where-Object { Test-Path $_ }
        if ($candidates) { $psExe = $candidates[0] }
    }

    if (-not (Get-Process -Name Photoshop -ErrorAction SilentlyContinue)) {
        if (-not $psExe) { Write-Host 'FATAL 未找到 Photoshop 可执行文件' -ForegroundColor Red; exit 2 }
        Start-Process -FilePath $psExe | Out-Null
        $startedByUs = $true
        Note "已启动 Photoshop: $psExe"
    }

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    for ($i = 0; $i -lt $AttachTimeoutSeconds; $i += 3) {
        try { $app = New-Object -ComObject Photoshop.Application; break } catch { Start-Sleep -Seconds 3 }
    }
    if (-not $app) {
        Write-Host 'FATAL 无法通过 COM 连接 Photoshop' -ForegroundColor Red
        $runnerLines.Add('FATAL: COM attach failed')
        FlushLog
        exit 2
    }
    try { $psVersion = $app.Version } catch { }
    Pass "COM-ATTACH :: Photoshop $psVersion（$([math]::Round($sw.Elapsed.TotalSeconds))s）"
    $runnerLines.Add("photoshop    = $psVersion")
    try { $app.DisplayDialogs = 3 } catch { Note 'DisplayDialogs 设置失败（继续）' }

    # -------------------------------------------------------------- 3) 执行 ExtendScript
    $runError = $null
    try {
        $rawReturn = $app.DoJavaScriptFile($jsxPath, $null, 1)
    } catch {
        $runError = $_.Exception.Message
        try {
            $rawReturn = $app.DoJavaScriptFile($jsxPath)
            $runError = $null
            Note '3 参数 DoJavaScriptFile 失败，已回退到 1 参数形式'
        } catch {
            $runError = $_.Exception.Message
        }
    }
    $runnerLines.Add("raw return   = $rawReturn")
    if ($runError) { Fail "DOJAVASCRIPT-EXCEPTION: $runError" }
    elseif ($rawReturn -ne 'PSD_PILOT_V21:PASS') { Fail "SCRIPT-RETURN: 期望 'PSD_PILOT_V21:PASS'，实际 '$rawReturn'" }
    else { Pass "SCRIPT-RETURN :: PSD_PILOT_V21:PASS" }
}

# ------------------------------------------------------------------ 4) 读取并校验结果 JSON
$resultPath = Join-Path $WorkDir 'acceptance-result.json'
$json = $null
if (-not (Test-Path $resultPath)) {
    Fail 'MISSING-EVIDENCE: acceptance-result.json 不存在（脚本可能未执行完）'
} else {
    try {
        $text = [System.IO.File]::ReadAllText($resultPath, [System.Text.UTF8Encoding]::new($false))
        $json = $text | ConvertFrom-Json
    } catch {
        Fail "RESULT-JSON-PARSE: $($_.Exception.Message)"
    }
}

$evidenceFiles = @()
if ($json) {
    $runnerLines.Add("result       = $($json.result)")
    $runnerLines.Add("checks       = $($json.checks.Count)")
    $runnerLines.Add("failures     = $($json.failures.Count)")
    if ($json.result -ne 'PASS') { Fail "RESULT: $($json.result)" } else { Pass "RESULT :: PASS" }
    foreach ($f in $json.failures) { Fail "CHECK-FAILED: $f" }

    $missingRequired = [System.Collections.Generic.List[string]]::new()
    $byLabel = @{}
    foreach ($c in $json.checks) { $byLabel[$c.label] = $c }
    foreach ($req in $RequiredChecks) {
        if (-not $byLabel.ContainsKey($req)) { $missingRequired.Add($req) }
        elseif (-not $byLabel[$req].ok) { Fail "CHECK-NOT-OK: $req :: $($byLabel[$req].detail)" }
    }
    foreach ($m in $json.missing) { if (-not $missingRequired.Contains($m)) { $missingRequired.Add($m) } }
    if ($missingRequired.Count -gt 0) { Fail ("MISSING-REQUIRED-CHECKS: " + ($missingRequired -join ', ')) } else { Pass "REQUIRED-CHECKS :: $($RequiredChecks.Count)/$($RequiredChecks.Count) 全部存在且通过" }

    foreach ($prop in $json.exports.PSObject.Properties) {
        $p = [string]$prop.Value
        $evidenceFiles += [pscustomobject]@{ key = $prop.Name; path = $p }
        if (-not (Test-Path -LiteralPath $p)) { Fail "MISSING-EVIDENCE: $($prop.Name) -> $p"; continue }
        $len = (Get-Item -LiteralPath $p).Length
        $min = if ($prop.Name -like '*Psd') { 1000000 } else { 100000 }
        if ($len -lt $min) { Fail "EVIDENCE-TOO-SMALL: $($prop.Name) -> $p ($len bytes < $min)" }
        else { Pass "EVIDENCE-$($prop.Name) :: $(Split-Path -Leaf $p) ($len bytes)" }
    }
    if (-not $json.exports.PSObject.Properties.Name) { Fail 'MISSING-EVIDENCE: exports 为空' }

    # 版本一致性（COM 侧 vs 脚本侧）
    if ($psVersion -and $json.photoshop.version -and $psVersion -ne $json.photoshop.version) {
        Note "Photoshop 版本记录不一致：COM=$psVersion script=$($json.photoshop.version)"
    }
}

# ------------------------------------------------------------------ 5) 交付文件未被改动
$hostHashAfter = (Get-FileHash -Algorithm SHA256 -Path $HostPsd).Hash
if ($hostHashAfter -ne $hostHashBefore) { Fail "DELIVERY-PSD-MODIFIED: $hostHashBefore -> $hostHashAfter" }
else { Pass "DELIVERY-PSD-UNCHANGED :: sha256=$($hostHashAfter.Substring(0,16))…" }
$runnerLines.Add("host sha256 after = $hostHashAfter")

# ------------------------------------------------------------------ 6) 逐像素证据核验（Node）
if (-not $SkipPixelDiff) {
    $verifier = Join-Path $scriptDir 'verify-pixel-diff-v21.mjs'
    if (-not (Test-Path $verifier)) {
        Fail "MISSING-EVIDENCE: 像素核验脚本不存在 -> $verifier"
    } else {
        $node = (Get-Command node -ErrorAction SilentlyContinue).Source
        if (-not $node) { Fail 'PIXEL-DIFF: 找不到 node，无法核验像素证据' }
        else {
            $pixelOut = & $node $verifier "--workdir=$WorkDir" 2>&1
            $pixelExit = $LASTEXITCODE
            $pixelOut | ForEach-Object { Write-Host $_ }
            $runnerLines.Add('---- pixel diff ----')
            foreach ($line in $pixelOut) { $runnerLines.Add([string]$line) }
            if ($pixelExit -ne 0) { Fail "PIXEL-DIFF: verify-pixel-diff-v21.mjs 退出码 $pixelExit" }
            $pixelReportPath = Join-Path $WorkDir 'pixel-diff-report.json'
            if (-not (Test-Path $pixelReportPath)) { Fail 'MISSING-EVIDENCE: pixel-diff-report.json 不存在' }
            else {
                $pixelReport = [System.IO.File]::ReadAllText($pixelReportPath, [System.Text.UTF8Encoding]::new($false)) | ConvertFrom-Json
                if ($pixelReport.result -ne 'PASS') { Fail "PIXEL-DIFF-RESULT: $($pixelReport.result)" }
                else { Pass 'PIXEL-DIFF-RESULT :: PASS' }
            }
        }
    }
}

# ------------------------------------------------------------------ 7) 清理 + 汇总
if ($app) {
    try {
        if ($app.Documents.Count -gt 0) {
            for ($i = $app.Documents.Count; $i -ge 1; $i--) {
                $d = $app.Documents.Item($i)
                $full = [string]$d.FullName
                if ($full -like "$WorkDir*") { $d.Close(2) }
            }
        }
    } catch { Note "清理残留文档失败：$($_.Exception.Message)" }
    if ($startedByUs -and -not $KeepPhotoshopOpen) { try { $app.Quit() } catch { Note 'Photoshop 退出失败' } }
}

$runnerLines.Add('----')
foreach ($f in $failures) { $runnerLines.Add("FAIL $f") }
foreach ($n in $notes) { $runnerLines.Add("INFO $n") }
$runnerLines.Add("=== RUNNER RESULT: " + $(if ($failures.Count -eq 0) { 'PASS' } else { 'FAIL' }) + " (failures=$($failures.Count))")
FlushLog

Write-Host ''
if ($failures.Count -eq 0) {
    Write-Host '=== ACCEPTANCE PASS: 所有必需检查项与证据文件均通过' -ForegroundColor Green
    exit 0
} else {
    Write-Host "=== ACCEPTANCE FAIL: $($failures.Count) 项失败" -ForegroundColor Red
    exit 1
}
