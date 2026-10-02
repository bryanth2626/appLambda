# Configuración de endpoint para LocalStack
$ep = "http://localhost:4566"
$region = "us-east-1"
$bucketName = "laboratorio-floci"
$queueName = "archivos-queue"
$topicName = "archivos-topic"

Write-Host "Iniciando despliegue de infraestructura local en LocalStack..." -ForegroundColor Cyan

# 1. Crear la cola SQS
Write-Host "Creando cola SQS: $queueName..."
$queueUrl = aws --endpoint-url $ep sqs create-queue --queue-name $queueName --query 'QueueUrl' --output text
Write-Host "Cola creada: $queueUrl" -ForegroundColor Green

# 2. Crear el tópico SNS
Write-Host "Creando tópico SNS: $topicName..."
$topicArn = aws --endpoint-url $ep sns create-topic --name $topicName --query 'TopicArn' --output text
Write-Host "Tópico creado: $topicArn" -ForegroundColor Green

# 3. Suscribir la cola SQS al tópico SNS
Write-Host "Suscribiendo SQS a SNS..."
aws --endpoint-url $ep sns subscribe --topic-arn $topicArn --protocol sqs --notification-endpoint "arn:aws:sqs:${region}:000000000000:${queueName}"

# 4. Configurar la notificación del bucket S3 hacia el tópico SNS
Write-Host "Configurando notificaciones del bucket S3..."
$notificationConfig = @{
    TopicConfigurations = @(
        @{
            TopicArn = $topicArn
            Events = @("s3:ObjectCreated:*")
        }
    )
} | ConvertTo-Json -Depth 5

[System.IO.File]::WriteAllText("$PSScriptRoot\notification.json", $notificationConfig, (New-Object System.Text.UTF8Encoding $False))
aws --endpoint-url $ep s3api put-bucket-notification-configuration --bucket $bucketName --notification-configuration file://notification.json

Remove-Item notification.json

Write-Host "¡Despliegue de la Actividad 1 completado con éxito!" -ForegroundColor Green