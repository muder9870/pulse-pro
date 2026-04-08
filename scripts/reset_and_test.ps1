# Reset Database and Run Fresh Pipeline Test
# PowerShell script for Windows

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "AI Pulse - Fresh Pipeline Test" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clear all article data
Write-Host "Step 1: Clearing all article data..." -ForegroundColor Yellow
$clearSQL = @"
TRUNCATE TABLE 
  generated_content,
  article_tags,
  article_images,
  article_audio,
  video_scripts,
  processed_articles,
  raw_articles,
  rss_feed_items,
  content_hashtags,
  engagement_metrics,
  content_history,
  daily_intelligence,
  paper_analysis
CASCADE;
"@

docker exec pulsepro-db-1 psql -U pulseuser -d pulsedb -c $clearSQL

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database cleared successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to clear database" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Verifying tables are empty..." -ForegroundColor Yellow
$articleCount = docker exec pulsepro-db-1 psql -U pulseuser -d pulsedb -t -c "SELECT COUNT(*) FROM raw_articles;"
Write-Host "Articles in database: $articleCount"

Write-Host ""
Write-Host "Step 3: Triggering pipeline run..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/pipeline/run" -Method Post -UseBasicParsing
    Write-Host "Pipeline response: $($response | ConvertTo-Json -Compress)"
    
    if ($response.status -eq "success") {
        Write-Host "✅ Pipeline started successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to start pipeline" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to start pipeline: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 4: Monitoring pipeline progress..." -ForegroundColor Yellow
Write-Host "This will take 2-3 minutes. Checking status every 10 seconds..." -ForegroundColor Gray
Write-Host ""

for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 10
    
    try {
        $status = Invoke-RestMethod -Uri "http://localhost:5000/api/pipeline/status" -UseBasicParsing
        
        if ($status.running -eq $true) {
            Write-Host "[$i/30] Pipeline still running..." -ForegroundColor Gray
        } else {
            Write-Host "[$i/30] Pipeline completed!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Final status: $($status | ConvertTo-Json -Compress)"
            break
        }
    } catch {
        Write-Host "[$i/30] Error checking status: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Step 5: Checking results..." -ForegroundColor Yellow
$articleCount = docker exec pulsepro-db-1 psql -U pulseuser -d pulsedb -t -c "SELECT COUNT(*) FROM raw_articles;"
$processedCount = docker exec pulsepro-db-1 psql -U pulseuser -d pulsedb -t -c "SELECT COUNT(*) FROM processed_articles;"

$articleCount = $articleCount.Trim()
$processedCount = $processedCount.Trim()

Write-Host "Raw articles fetched: $articleCount"
Write-Host "Processed articles: $processedCount"

if ([int]$articleCount -gt 0) {
    Write-Host "✅ Articles fetched successfully" -ForegroundColor Green
} else {
    Write-Host "❌ No articles fetched" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 6: Testing content generation..." -ForegroundColor Yellow
if ([int]$processedCount -gt 0) {
    $firstArticle = docker exec pulsepro-db-1 psql -U pulseuser -d pulsedb -t -c "SELECT id FROM processed_articles LIMIT 1;"
    $firstArticle = $firstArticle.Trim()
    
    Write-Host "Testing generation for article ID: $firstArticle"
    
    try {
        $genResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/generate" `
            -Method Post `
            -ContentType "application/json" `
            -Body (@{article_id = [int]$firstArticle; platform = "twitter"} | ConvertTo-Json) `
            -UseBasicParsing
        
        if ($genResponse.status -eq "success") {
            Write-Host "✅ Content generation successful" -ForegroundColor Green
            Write-Host ""
            Write-Host "Generated Twitter post:" -ForegroundColor Cyan
            $twitterPost = $genResponse.results.twitter
            if ($twitterPost.Length -gt 200) {
                Write-Host "$($twitterPost.Substring(0, 200))..." -ForegroundColor White
            } else {
                Write-Host $twitterPost -ForegroundColor White
            }
        } else {
            Write-Host "❌ Content generation failed" -ForegroundColor Red
            Write-Host "Response: $($genResponse | ConvertTo-Json)"
        }
    } catch {
        Write-Host "❌ Content generation failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  No processed articles to test generation" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 7: Checking Groq usage..." -ForegroundColor Yellow
docker logs pulsepro-backend-1 --tail 20 | Select-String -Pattern "llm_provider|groq|llm_generated"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open dashboard: http://localhost:80" -ForegroundColor White
Write-Host "2. Check Intelligence Feed for articles" -ForegroundColor White
Write-Host "3. Click on an article and test platform tabs" -ForegroundColor White
Write-Host "4. Try generating posts for all 8 platforms" -ForegroundColor White
Write-Host ""
