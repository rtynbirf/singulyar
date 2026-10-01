# ============================================================================
#  RUVSON УСТАНОВЩИК v1.0.0
#  СЛУГА, который подтягивает Python и инструменты из реп GitHub на комп
#  юзверя и заставляет их работать ВО БЛАГО ЧЕЛОВЕКУ.
#  А человек... человек просто получает эстетическое удовольствие от жизни =)
#
#  Каталог-источник: ЕДИНЫЙ_КАТАЛОГ_2444_ИНСТРУМЕНТОВ.md (2444 позиции, 34 категории)
#  Здесь лежит ОТБОРАННОЕ ЯДРО — то, что ставится одной кнопкой и без галлюцинаций.
#
#  Запуск:  powershell -NoProfile -ExecutionPolicy Bypass -File ruvson-setup.ps1
#  Режимы:  -Mode core|media|ai|text|data|all|doctor|update|gitpull
# ============================================================================

param(
    [string]$Mode = ''
)

$ErrorActionPreference = 'Continue'
$script:Version   = '1.0.0'
$script:Root      = Split-Path -Parent $MyInvocation.MyCommand.Path
$script:DirProf   = Join-Path $Root 'профили'
$script:BinDir    = Join-Path $env:LOCALAPPDATA 'RUVSON\bin'
$script:LogFile   = Join-Path $Root 'установщик_журнал.txt'
$script:RepoFile  = Join-Path $Root 'репо.txt'
$script:ReportFile= Join-Path $Root 'диагностика_отчёт.txt'
$script:Ok = 0; $script:Skip = 0; $script:Fail = 0; $script:FailList = @()

# --- карты профилей ----------------------------------------------------------
$script:Profiles = [ordered]@{
    '1' = @{ Name = 'ЯДРО (Python + ffmpeg + yt-dlp)'; File = '1-ядро.txt';              Key = 'core'  }
    '2' = @{ Name = 'ВИДЕО/АУДИО (канал, музыка)';     File = '2-видео-аудио.txt';       Key = 'media' }
    '3' = @{ Name = 'AI/LLM (нейросети)';              File = '3-ai-llm.txt';            Key = 'ai'    }
    '4' = @{ Name = 'ТЕКСТ/ДОКУМЕНТЫ (docx/pdf/OCR)';  File = '4-текст-документы.txt';   Key = 'text'  }
    '5' = @{ Name = 'ДАННЫЕ/СЕТЬ/УТИЛИТЫ';             File = '5-данные-сеть.txt';       Key = 'data'  }
}

# --- вывод и журнал ----------------------------------------------------------
function Write-Log([string]$line) {
    try { Add-Content -Path $script:LogFile -Value ("{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $line) -Encoding UTF8 } catch {}
}
function Write-Ok([string]$m)   { Write-Host "  [OK] $m" -ForegroundColor Green;  Write-Log "OK    $m" }
function Write-No([string]$m)   { Write-Host "  [!!] $m" -ForegroundColor Red;    Write-Log "FAIL  $m" }
function Write-Wait([string]$m) { Write-Host "  [..] $m" -ForegroundColor Cyan;   Write-Log "WORK  $m" }
function Write-Skip([string]$m) { Write-Host "  [--] $m" -ForegroundColor DarkGray; Write-Log "SKIP  $m" }
function Write-Step([string]$m) {
    Write-Host ""
    Write-Host ("==== {0} ====" -f $m) -ForegroundColor Yellow
    Write-Log ("STEP  {0}" -f $m)
}
function Count-Result([string]$status, [string]$name) {
    if ($status -eq 'ok')   { $script:Ok++ }
    elseif ($status -eq 'skip') { $script:Skip++ }
    else { $script:Fail++; $script:FailList += $name }
}

# --- базовые проверки --------------------------------------------------------
function Test-Cmd([string]$name) {
    # возвращает команду, НО магазинную заглушку WindowsApps считает отсутствием
    $c = Get-Command $name -ErrorAction SilentlyContinue
    if ($c -and $c.Source -and $c.Source -like '*WindowsApps*') { return $null }
    return $c
}

function Get-PyExe {
    if (Test-Cmd 'python') { return 'python' }
    if (Test-Cmd 'py')     { return 'py' }
    return $null
}

function Invoke-Py([string[]]$pyArgs) {
    # запускает python/py -3 с аргументами, вывод утапливает с отступом, возвращает успех
    $exe = Get-PyExe
    if (-not $exe) { Write-No 'Python не найден'; return $false }
    if ($exe -eq 'py') { & py -3 @pyArgs 2>&1 | ForEach-Object { if ("$_" -ne '') { Write-Host "        $_" } } }
    else               { & python @pyArgs 2>&1 | ForEach-Object { if ("$_" -ne '') { Write-Host "        $_" } } }
    return ($LASTEXITCODE -eq 0)
}

function Test-PipPackage([string]$pkg) {
    $exe = Get-PyExe
    if (-not $exe) { return $false }
    $out = @()
    if ($exe -eq 'py') { $out = & py -3 -m pip show $pkg 2>$null } else { $out = & python -m pip show $pkg 2>$null }
    return ((($out | Out-String) -match '(?m)^Name:\s*\S'))
}

function Ensure-BinPath {
    if (-not (Test-Path $script:BinDir)) { New-Item -ItemType Directory -Path $script:BinDir -Force | Out-Null }
    $up = [Environment]::GetEnvironmentVariable('Path', 'User')
    if ($up -and $up -notlike '*RUVSON\bin*') {
        [Environment]::SetEnvironmentVariable('Path', ($up.TrimEnd(';') + ';' + $script:BinDir), 'User')
        Write-Ok ("в PATH пользователя добавлен: " + $script:BinDir)
    }
    if ((($env:Path -split ';') -notcontains $script:BinDir)) { $env:Path = "$env:Path;$script:BinDir" }
}

# --- установка Python (winget -> прямой инсталлятор с python.org) ------------
function Add-PyCandidatesToSession {
    $found = $false
    foreach ($v in @('312','313','311','314')) {
        $p = Join-Path $env:LOCALAPPDATA ("Programs\Python\Python" + $v + "\python.exe")
        if (Test-Path $p) {
            $dir = Split-Path -Parent $p
            if (($env:Path -split ';') -notcontains $dir) { $env:Path = "$dir;$dir\Scripts;$env:Path" }
            $found = $true
        }
    }
    return $found
}

function Ensure-Python {
    $exe = Get-PyExe
    if ($exe) {
        $ver = ''
        try { if ($exe -eq 'py') { $ver = (& py -3 --version 2>&1 | Select-Object -First 1) } else { $ver = (& python --version 2>&1 | Select-Object -First 1) } } catch {}
        Write-Ok ("Python уже на месте: " + $ver)
        return $true
    }
    Write-Step 'Python не найден — СЛУГА ставит его сам'
    if (Test-Cmd 'winget') {
        Write-Wait 'winget: Python.Python.3.12 (в профиль пользователя, без прав администратора)'
        & winget install --id Python.Python.3.12 --exact --silent --scope user --accept-package-agreements --accept-source-agreements
        [void](Add-PyCandidatesToSession)
        if (Get-PyExe) { Write-Ok 'Python установлен через winget'; return $true }
    }
    Write-Wait 'winget не помог — качаю официальный инсталлятор с python.org'
    $inst = Join-Path $env:TEMP 'python-3.12.10-amd64.exe'
    try {
        Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe' -OutFile $inst -UseBasicParsing
        Write-Wait 'тихая установка (PrependPath=1, только для текущего пользователя)'
        Start-Process -FilePath $inst -ArgumentList '/quiet','InstallAllUsers=0','PrependPath=1','Include_test=0' -Wait
        [void](Add-PyCandidatesToSession)
    } catch {
        Write-No ("python.org не скачался: " + $_.Exception.Message)
    }
    if (Get-PyExe) { Write-Ok 'Python установлен'; return $true }
    Write-No 'Python так и не появился. Смотри КАК_ЮЗАТЬ_УСТАНОВЩИК.md, раздел «Если Python не ставится».'
    return $false
}

# --- универсальные ставильщики ----------------------------------------------
function Invoke-WingetPkg([string]$id, [string]$nice) {
    if (-not (Test-Cmd 'winget')) {
        Write-Skip ("winget недоступен, пропускаю: " + $nice + " (как ставить руками — в КАК_ЮЗАТЬ_УСТАНОВЩИК.md)")
        return 'skip'
    }
    Write-Wait ("winget: " + $id)
    & winget install --id $id --exact --silent --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -eq 0) { Write-Ok ($nice + " (" + $id + ")"); return 'ok' }
    Write-No ($nice + " (" + $id + ") — winget код " + $LASTEXITCODE)
    return 'fail'
}

function Invoke-PipPkg([string]$pkg) {
    if (-not (Get-PyExe)) {
        Write-Skip ("нет Python, пропускаю pip-пакет: " + $pkg + " (сначала профиль 1 — ЯДРО)")
        return 'skip'
    }
    if (Test-PipPackage $pkg) {
        Write-Wait ("pip: обновляю " + $pkg)
    } else {
        Write-Wait ("pip: ставлю " + $pkg)
    }
    $ok = Invoke-Py @('-m','pip','install','--upgrade', $pkg)
    if ($ok) { Write-Ok ("pip: " + $pkg); return 'ok' }
    Write-Wait ("обычная установка не прошла — пробую --user для " + $pkg)
    $ok2 = Invoke-Py @('-m','pip','install','--upgrade','--user', $pkg)
    if ($ok2) { Write-Ok ("pip --user: " + $pkg); return 'ok' }
    Write-No ("pip: " + $pkg)
    return 'fail'
}

# --- fallback ядра напрямую из GitHub-реп (если нет winget) ------------------
function Install-YtDlpDirect {
    Ensure-BinPath
    $dst = Join-Path $script:BinDir 'yt-dlp.exe'
    Write-Wait 'GitHub releases: yt-dlp/yt-dlp -> yt-dlp.exe'
    try {
        Invoke-WebRequest -Uri 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile $dst -UseBasicParsing
        Write-Ok ("yt-dlp.exe положен в " + $dst)
        return 'ok'
    } catch { Write-No ("yt-dlp.exe не скачался: " + $_.Exception.Message); return 'fail' }
}

function Install-FfmpegDirect {
    Ensure-BinPath
    $zip = Join-Path $env:TEMP 'ffmpeg-essentials.zip'
    Write-Wait 'gyan.dev: ffmpeg-release-essentials.zip (это реп FFmpeg-сборки Gyan)'
    try {
        Invoke-WebRequest -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile $zip -UseBasicParsing
        $tmp = Join-Path $env:TEMP 'ffmpeg_unzip'
        if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
        Expand-Archive -Path $zip -DestinationPath $tmp -Force
        $exe = Get-ChildItem -Path $tmp -Recurse -Filter 'ffmpeg.exe' | Select-Object -First 1
        if ($exe) {
            $binRoot = Split-Path -Parent $exe.FullName
            Copy-Item (Join-Path $binRoot '*.exe') $script:BinDir -Force
            Write-Ok ("ffmpeg/ffprobe/ffplay положены в " + $script:BinDir)
            return 'ok'
        }
        Write-No 'ffmpeg.exe в архиве не найден'
        return 'fail'
    } catch { Write-No ("ffmpeg не скачался: " + $_.Exception.Message); return 'fail' }
}

function Install-Core {
    Write-Step 'ПРОФИЛЬ 1 · ЯДРО — фундамент для всего остального'
    Ensure-BinPath
    [void](Ensure-Python)

    # pip сам себя
    if (Get-PyExe) {
        Write-Wait 'обновляю сам pip/setuptools/wheel'
        [void](Invoke-Py @('-m','pip','install','--upgrade','pip','setuptools','wheel'))
    }

    # ffmpeg: winget -> прямой zip
    if (Test-Cmd 'ffmpeg') { Write-Skip 'ffmpeg уже на месте'; Count-Result 'skip' 'ffmpeg' }
    else {
        $r = Invoke-WingetPkg 'Gyan.FFmpeg' 'FFmpeg (конвертация/нарезка/звук)'
        if ($r -ne 'ok') { $r = Install-FfmpegDirect }
        Count-Result $r 'ffmpeg'
    }

    # yt-dlp: pip (автообновляемый) -> exe с GitHub
    if (Get-PyExe) { $r = Invoke-PipPkg 'yt-dlp' } else { $r = 'fail' }
    if ($r -ne 'ok') { $r = Install-YtDlpDirect }
    Count-Result $r 'yt-dlp'

    # базовые pip-библиотеки
    foreach ($p in @('requests','httpx','rich','tqdm')) { Count-Result (Invoke-PipPkg $p) $p }

    Write-Host ""
    Write-Host "  Проверь себя (новое окно терминала):  yt-dlp --version   ffmpeg -version" -ForegroundColor Magenta
}

# --- запуск профиля из файла -------------------------------------------------
function Install-ProfileFile([string]$num) {
    $prof = $script:Profiles[$num]
    $path = Join-Path $script:DirProf $prof.File
    Write-Step ("ПРОФИЛЬ " + $num + " · " + $prof.Name)
    if (-not (Test-Path $path)) { Write-No ("файл профиля не найден: " + $path); return }
    if (-not (Get-PyExe)) { [void](Ensure-Python) }
    $lines = Get-Content -Path $path -Encoding UTF8
    foreach ($raw in $lines) {
        $line = $raw.Trim()
        if ($line -eq '' -or $line.StartsWith('#')) { continue }
        if ($line.ToLower().StartsWith('winget:')) {
            $id = $line.Substring(7).Trim()
            Count-Result (Invoke-WingetPkg $id $id) $id
        }
        elseif ($line.ToLower().StartsWith('pip:')) {
            $pkg = $line.Substring(4).Trim()
            Count-Result (Invoke-PipPkg $pkg) $pkg
        }
        else {
            Write-Skip ("непонятная строка профиля (пропущена): " + $line)
        }
    }
}

function Install-Many([string[]]$nums) {
    foreach ($n in $nums) { Install-ProfileFile $n }
    Show-Summary
}

# --- диагностика -------------------------------------------------------------
function Invoke-Doctor {
    Write-Step 'ДИАГНОСТИКА — что на компе, а чего нет'
    $rep = @()
    $rep += ("RUVSON УСТАНОВЩИК v" + $script:Version + " — отчёт от " + (Get-Date))

    function Test-CmdRow([string]$name, [string[]]$verArgs) {
        $c = Test-Cmd $name
        if ($c) {
            $v = ''
            try { $v = (& $name @verArgs 2>&1 | Select-Object -First 1) } catch {}
            if ("$v" -eq '') { $v = $c.Source }
            $line = ("  [OK]   {0,-12} {1}" -f $name, $v)
        } else { $line = ("  [НЕТ]  {0}" -f $name) }
        Write-Host $line
        return $line
    }

    $rep += '--- программы ---'
    $rep += Test-CmdRow 'python' @('--version')
    $rep += Test-CmdRow 'py' @('-3','--version')      # может отсутствовать — это нормально
    $rep += Test-CmdRow 'winget' @('--version')
    $rep += Test-CmdRow 'git' @('--version')
    $rep += Test-CmdRow 'ffmpeg' @('-version')
    $rep += Test-CmdRow 'ffprobe' @('-version')
    $rep += Test-CmdRow 'yt-dlp' @('--version')
    $rep += Test-CmdRow 'gallery-dl' @('--version')
    $rep += Test-CmdRow 'streamlink' @('--version')

    $rep += ''
    $rep += '--- pip-пакеты (профили 1-5) ---'
    $pkgs = @('requests','httpx','rich','tqdm','yt-dlp',
              'gallery-dl','streamlink','mutagen','eyed3','pydub','moviepy','faster-whisper','beets',
              'openai','anthropic','google-genai','ollama','llm','aider-chat','huggingface_hub',
              'python-docx','openpyxl','reportlab','pypdf','pymupdf','pdfplumber','beautifulsoup4','lxml','markdown','pytesseract',
              'pandas','numpy','matplotlib','aiohttp','apscheduler','apprise')
    if (-not (Get-PyExe)) {
        $line = '  [НЕТ]  Python — pip-пакеты проверить нельзя (сначала профиль 1)'
        Write-Host $line -ForegroundColor Red; $rep += $line
    } else {
        foreach ($p in $pkgs) {
            if (Test-PipPackage $p) { $line = ("  [OK]   " + $p) }
            else { $line = ("  [НЕТ]  " + $p) }
            Write-Host $line
            $rep += $line
        }
    }

    $rep += ''
    $rep += ("PATH-папка скрипта: " + $script:BinDir + " — " + $(if (Test-Path $script:BinDir) {'есть'} else {'нет'}))
    Write-Host ""
    try {
        $rep | Out-File -FilePath $script:ReportFile -Encoding UTF8
        Write-Host ("Отчёт сохранён: " + $script:ReportFile) -ForegroundColor Magenta
    } catch {}
    Write-Host "Пустых строк не бойся: [НЕТ] сегодня = профиль из меню завтра =)" -ForegroundColor DarkCyan
}

# --- обновить всё ------------------------------------------------------------
function Invoke-UpdateAll {
    Write-Step 'ОБНОВЛЕНИЕ ВСЕГО (pip + winget)'
    if (Get-PyExe) {
        Write-Wait 'pip/setuptools/wheel'
        [void](Invoke-Py @('-m','pip','install','--upgrade','pip','setuptools','wheel'))
        foreach ($num in @('1','2','3','4','5')) {
            $prof = $script:Profiles[$num]
            $path = Join-Path $script:DirProf $prof.File
            if (-not (Test-Path $path)) { continue }
            foreach ($raw in (Get-Content -Path $path -Encoding UTF8)) {
                $line = $raw.Trim()
                if ($line -eq '' -or $line.StartsWith('#')) { continue }
                if ($line.ToLower().StartsWith('pip:')) { Count-Result (Invoke-PipPkg ($line.Substring(4).Trim())) $line }
            }
        }
    } else { Write-No 'Python не найден — pip-часть пропущена' }
    if (Test-Cmd 'winget') {
        Write-Wait 'winget upgrade --all (обновляет программы, может спросить UAC)'
        & winget upgrade --all --silent --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -eq 0) { Write-Ok 'winget: всё обновлено' } else { Write-Wait ("winget сообщил код " + $LASTEXITCODE + " (часть пакетов могла обновиться)") }
    } else { Write-Skip 'winget недоступен — программы обнови руками или поставь winget (КАК_ЮЗАТЬ)' }
    Show-Summary
}

# --- подтянуть свежую версию установщика с GitHub-реп юзверя -----------------
function Invoke-GitPull {
    Write-Step 'ПОДТЯНУТЬ СВОЁ С GITHUB'
    if (-not (Test-Path $script:RepoFile)) {
        $hint = @(
            '# Вставь сюда (первой строкой) ссылку вида:',
            '# https://raw.githubusercontent.com/ТВОЙ_НИК/ТВОЯ_РЕПА/main/',
            '# Потом снова запусти ПОДТЯНУТЬ_С_GITHUB.bat'
        )
        $hint | Out-File -FilePath $script:RepoFile -Encoding UTF8
        Write-Wait ("создал " + $script:RepoFile + " — впиши туда ссылку на свою репу и запусти ещё раз")
        return
    }
    $base = ''
    foreach ($raw in (Get-Content -Path $script:RepoFile -Encoding UTF8)) {
        $line = $raw.Trim()
        if ($line -ne '' -and -not $line.StartsWith('#')) { $base = $line; break }
    }
    if ($base -eq '') { Write-No 'репо.txt пуст — впиши ссылку raw.githubusercontent.com (см. файл)' ; return }
    if (-not $base.EndsWith('/')) { $base = $base + '/' }

    $files = @('ruvson-setup.ps1','профили/1-ядро.txt','профили/2-видео-аудио.txt','профили/3-ai-llm.txt','профили/4-текст-документы.txt','профили/5-данные-сеть.txt','КАК_ЮЗАТЬ_УСТАНОВЩИК.md')
    $bak = Join-Path $Root 'backup'
    if (-not (Test-Path $bak)) { New-Item -ItemType Directory -Path $bak -Force | Out-Null }
    foreach ($f in $files) {
        $url = $base + $f
        $dst = Join-Path $Root ($f -replace '/', '\')
        try {
            Write-Wait ("тяну " + $url)
            $tmpDst = $dst + '.new'
            Invoke-WebRequest -Uri $url -OutFile $tmpDst -UseBasicParsing
            if (Test-Path $dst) { Copy-Item $dst (Join-Path $bak ((Get-Item $dst).Name + '.' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.bak')) -Force }
            Move-Item -Force $tmpDst $dst
            Write-Ok ("обновлено: " + $f)
        } catch {
            Write-No ("не скачалось " + $f + " — " + $_.Exception.Message)
            if (Test-Path ($dst + '.new')) { Remove-Item ($dst + '.new') -Force }
        }
    }
    Write-Host "Свежее лежит. Если что-то сломалось — в папке backup старые версии." -ForegroundColor DarkCyan
}

# --- итог --------------------------------------------------------------------
function Show-Summary {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Yellow
    Write-Host ("  ИТОГ:  поставлено/обновлено: " + $script:Ok + "   пропущено: " + $script:Skip + "   не вышло: " + $script:Fail) -ForegroundColor Yellow
    if ($script:FailList.Count -gt 0) {
        foreach ($f in $script:FailList) { Write-Host ("    - " + $f) -ForegroundColor Red }
        Write-Host "  Не вышло — не беда: смотри КАК_ЮЗАТЬ_УСТАНОВЩИК.md, раздел «Если что-то не ставится»." -ForegroundColor DarkGray
    }
    Write-Host ("  Полный журнал: " + $script:LogFile) -ForegroundColor DarkGray
    Write-Host "  СЛУГА послужил. Человек может получать эстетическое удовольствие =)" -ForegroundColor Magenta
    Write-Host "==================================================" -ForegroundColor Yellow
}

# --- меню --------------------------------------------------------------------
function Show-Menu {
    while ($true) {
        Clear-Host
        Write-Host ""
        Write-Host "  ================================================" -ForegroundColor Cyan
        Write-Host ("   RUVSON УСТАНОВЩИК v" + $script:Version + "  ·  СЛУГА служит ЧЕЛОВЕКУ") -ForegroundColor Cyan
        Write-Host "  ================================================" -ForegroundColor Cyan
        Write-Host ""
        foreach ($num in @('1','2','3','4','5')) {
            Write-Host ("    " + $num + ")  СТАВИТЬ:  " + $script:Profiles[$num].Name) -ForegroundColor White
        }
        Write-Host "    6)  СТАВИТЬ ВСЁ СРАЗУ (1-5)" -ForegroundColor White
        Write-Host ""
        Write-Host "    7)  ДИАГНОСТИКА — что стоит, чего нет" -ForegroundColor Gray
        Write-Host "    8)  ОБНОВИТЬ ВСЁ (pip + winget)" -ForegroundColor Gray
        Write-Host "    9)  ПОДТЯНУТЬ УСТАНОВЩИК С МОЕЙ РЕПЫ GITHUB" -ForegroundColor Gray
        Write-Host "    0)  ВЫХОД" -ForegroundColor Gray
        Write-Host ""
        $choice = Read-Host "  Выбери цифру и жми Enter"
        switch ($choice) {
            '1' { Install-ProfileFile '1'; Show-Summary; Read-Host "Enter — в меню" }
            '2' { Install-ProfileFile '2'; Show-Summary; Read-Host "Enter — в меню" }
            '3' { Install-ProfileFile '3'; Show-Summary; Read-Host "Enter — в меню" }
            '4' { Install-ProfileFile '4'; Show-Summary; Read-Host "Enter — в меню" }
            '5' { Install-ProfileFile '5'; Show-Summary; Read-Host "Enter — в меню" }
            '6' { Install-Many @('1','2','3','4','5'); Read-Host "Enter — в меню" }
            '7' { Invoke-Doctor; Read-Host "Enter — в меню" }
            '8' { Invoke-UpdateAll; Read-Host "Enter — в меню" }
            '9' { Invoke-GitPull; Read-Host "Enter — в меню" }
            '0' { return }
            default { }
        }
    }
}

# --- точка входа -------------------------------------------------------------
switch ($Mode.ToLower()) {
    'core'   { Install-Core; Show-Summary }
    'media'  { Install-ProfileFile '2'; Show-Summary }
    'ai'     { Install-ProfileFile '3'; Show-Summary }
    'text'   { Install-ProfileFile '4'; Show-Summary }
    'data'   { Install-ProfileFile '5'; Show-Summary }
    'all'    { Install-Core; Install-Many @('2','3','4','5') }
    'doctor' { Invoke-Doctor }
    'update' { Invoke-UpdateAll }
    'gitpull'{ Invoke-GitPull }
    ''       { Show-Menu }
    default  {
        Write-Host ("Не знаю режим: " + $Mode) -ForegroundColor Red
        Write-Host "Разрешены: core | media | ai | text | data | all | doctor | update | gitpull"
    }
}
