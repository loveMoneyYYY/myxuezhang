param(
  [Parameter(Mandatory=$true)] [string]$Host,
  [Parameter(Mandatory=$true)] [string]$User,
  [Parameter(Mandatory=$true)] [string]$RemotePath,
  [string]$KeyPath,
  [string]$AdminPassword = "admin123",
  [int]$Port = 22
)

$localPath = Resolve-Path .
$archive = Join-Path $env:TEMP 'qdbh2026-deploy.tar.gz'

Write-Host "准备打包本地项目..."
if (Test-Path $archive) { Remove-Item $archive -Force }

$exclude = @('node_modules', '.git', 'deploy.ps1', '*.zip', '*.tar.gz')
$tarArgs = @('czf', $archive, '-C', $localPath.Path, '.')
foreach ($item in $exclude) { $tarArgs += "--exclude=$item" }

& tar @tarArgs
if ($LASTEXITCODE -ne 0) {
  throw "打包失败，请确认你的系统支持 tar 命令。"
}

$remoteTemp = "/tmp/qdbh2026-deploy.tar.gz"
$scpCommand = if ($KeyPath) {
  "scp -P $Port -i `"$KeyPath`" `"$archive`" $User@$Host:$remoteTemp"
} else {
  "scp -P $Port `"$archive`" $User@$Host:$remoteTemp"
}

Write-Host "上传部署包到 $Host..."
Invoke-Expression $scpCommand
if ($LASTEXITCODE -ne 0) {
  throw "上传失败，请检查 SSH 连接、用户名、密钥路径或网络。"
}

$remoteCommands = @"
set -e
mkdir -p $RemotePath
cd $RemotePath
rm -rf ./*
mkdir -p .
cd $RemotePath
rm -f $remoteTemp
mv $remoteTemp $remoteTemp || true
if [ -f $remoteTemp ]; then
  tar -xzf $remoteTemp -C $RemotePath
  rm -f $remoteTemp
else
  echo '部署包上传失败，远程文件不存在。'
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
cd $RemotePath
npm install --production
sudo npm install -g pm2
pm2 startOrRestart ecosystem.config.js --update-env
pm2 save
"@

$sshCommand = if ($KeyPath) {
  "ssh -p $Port -i `"$KeyPath`" $User@$Host `"$remoteCommands`"
} else {
  "ssh -p $Port $User@$Host `"$remoteCommands`"
}

Write-Host "执行远程部署命令..."
Invoke-Expression $sshCommand
if ($LASTEXITCODE -ne 0) {
  throw "远程部署失败，请检查远程服务器日志。"
}

Write-Host "部署完成。请确认服务器上应用已启动。"
Write-Host "默认访问端口为 3000，若需要可使用 Nginx 或反向代理设置外网访问。"
