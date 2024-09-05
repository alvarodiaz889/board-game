# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# var spawn = require("child_process").spawn;
#     spawn("powershell.exe",[".\\request.ps1"]);

$Request = Invoke-WebRequest -URI https://www.masterduelmeta.com/api/v1/cards?konamiID[$in]=1475311
$Request.Content | Out-File -FilePath .\data.json
# "abecvs s" | Out-File -FilePath .\data.json
# Set-ExecutionPolicy -ExecutionPolicy Undefined -Scope CurrentUser