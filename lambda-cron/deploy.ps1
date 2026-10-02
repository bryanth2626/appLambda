$ep = "http://localhost:4566"
$region = "us-east-1"
$functionName = "rutina-cron-lambda"
$ruleName = "regla-cada-5-minutos"

Write-Host "Desplegando función Lambda para la rutina..." -ForegroundColor Cyan

# 1. Empaquetar y crear la función Lambda en LocalStack
Compress-Archive -Path "$PSScriptRoot\index.js" -DestinationPath "$PSScriptRoot\function.zip" -Force
$zipBase64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("$PSScriptRoot\function.zip"))

aws --endpoint-url $ep lambda create-function `
    --function-name $functionName `
    --runtime "nodejs18.x" `
    --role "arn:aws:iam::000000000000:role/lambda-role" `
    --handler "index.handler" `
    --zip-file "fileb://$PSScriptRoot\function.zip"

Remove-Item "$PSScriptRoot\function.zip"
Write-Host "Función Lambda creada: $functionName" -ForegroundColor Green

# 2. Crear la regla de EventBridge (Ejemplo: se ejecuta cada 5 minutos)
Write-Host "Creando regla programada en EventBridge..."
$ruleArn = aws --endpoint-url $ep events put-rule --name$ruleName --schedule-expression "rate(5 minutes)" --state ENABLED --query 'RuleArn' --output text
Write-Host "Regla creada: $ruleArn" -ForegroundColor Green

# 3. Vincular la regla de EventBridge con la Lambda
$targetJson = @{
    Id = "TargetLambda"
    Arn = "arn:aws:lambda:${region}:000000000000:function:${functionName}"
} | ConvertTo-Json

[System.IO.File]::WriteAllText("$PSScriptRoot\target.json", $targetJson, (New-Object System.Text.UTF8Encoding $False))

aws --endpoint-url $ep events put-targets --rule$ruleName --targets file://target.json
Remove-Item "$PSScriptRoot\target.json"

Write-Host "¡Actividad 2 configurada y separada con éxito en su propia carpeta!" -ForegroundColor Green