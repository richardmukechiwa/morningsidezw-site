# KYC Webhook Test Script

Write-Host "Testing KYC Webhook..." -ForegroundColor Cyan

$body = @{
    full_name = "Test Agent"
    email = "test@innbucks.co.zw"
    id_number = "12-345678-A-12"
    phone = "+263771234567"
    address = "123 Test Street, Harare"
    data_consent = $true
    consent_timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    file_ids = @{
        id_front = "1abc2def3ghi4jkl5mno6pqr"
        id_back = "7stu8vwx9yza1bcd2efg3hij"
        poa = "4klm5nop6qrs7tuv8wxy9zab"
        passport_photo = "0cde1fgh2ijk3lmn4opq5rst"
    }
} | ConvertTo-Json -Depth 10

Write-Host "Sending request..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod `
        -Uri "https://api.morningsidezw.com/webhook-test/submit" `
        -Method Post `
        -Body $body `
        -ContentType "application/json"
    
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}