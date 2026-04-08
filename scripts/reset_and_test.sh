#!/bin/bash
# Reset Database and Run Fresh Pipeline Test

echo "=========================================="
echo "AI Pulse - Fresh Pipeline Test"
echo "=========================================="
echo ""

# Step 1: Clear all article data
echo "Step 1: Clearing all article data..."
docker exec pulsepro-db-1 psql -U pulseuser -d pulsedb -c "
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
"

if [ $? -eq 0 ]; then
    echo "✅ Database cleared successfully"
else
    echo "❌ Failed to clear database"
    exit 1
fi

echo ""
echo "Step 2: Verifying tables are empty..."
ARTICLE_COUNT=$(docker exec pulsepro-db-1 psql -U pulseuser -d pulsedb -t -c "SELECT COUNT(*) FROM raw_articles;")
echo "Articles in database: $ARTICLE_COUNT"

echo ""
echo "Step 3: Triggering pipeline run..."
RESPONSE=$(curl -s -X POST http://localhost:5000/api/pipeline/run)
echo "Pipeline response: $RESPONSE"

if echo "$RESPONSE" | grep -q "success"; then
    echo "✅ Pipeline started successfully"
else
    echo "❌ Failed to start pipeline"
    exit 1
fi

echo ""
echo "Step 4: Monitoring pipeline progress..."
echo "This will take 2-3 minutes. Checking status every 10 seconds..."
echo ""

for i in {1..30}; do
    sleep 10
    STATUS=$(curl -s http://localhost:5000/api/pipeline/status)
    RUNNING=$(echo "$STATUS" | grep -o '"running":[^,]*' | cut -d':' -f2)
    
    if [ "$RUNNING" = "true" ]; then
        echo "[$i/30] Pipeline still running..."
    else
        echo "[$i/30] Pipeline completed!"
        echo ""
        echo "Final status: $STATUS"
        break
    fi
done

echo ""
echo "Step 5: Checking results..."
ARTICLE_COUNT=$(docker exec pulsepro-db-1 psql -U pulseuser -d pulsedb -t -c "SELECT COUNT(*) FROM raw_articles;")
PROCESSED_COUNT=$(docker exec pulsepro-db-1 psql -U pulseuser -d pulsedb -t -c "SELECT COUNT(*) FROM processed_articles;")

echo "Raw articles fetched: $ARTICLE_COUNT"
echo "Processed articles: $PROCESSED_COUNT"

if [ "$ARTICLE_COUNT" -gt 0 ]; then
    echo "✅ Articles fetched successfully"
else
    echo "❌ No articles fetched"
fi

echo ""
echo "Step 6: Testing content generation..."
if [ "$PROCESSED_COUNT" -gt 0 ]; then
    FIRST_ARTICLE=$(docker exec pulsepro-db-1 psql -U pulseuser -d pulsedb -t -c "SELECT id FROM processed_articles LIMIT 1;")
    FIRST_ARTICLE=$(echo $FIRST_ARTICLE | xargs)
    
    echo "Testing generation for article ID: $FIRST_ARTICLE"
    GEN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/generate \
        -H "Content-Type: application/json" \
        -d "{\"article_id\": $FIRST_ARTICLE, \"platform\": \"twitter\"}")
    
    if echo "$GEN_RESPONSE" | grep -q "success"; then
        echo "✅ Content generation successful"
        echo ""
        echo "Generated content preview:"
        echo "$GEN_RESPONSE" | grep -o '"twitter":"[^"]*"' | cut -d':' -f2 | head -c 200
        echo "..."
    else
        echo "❌ Content generation failed"
        echo "Response: $GEN_RESPONSE"
    fi
else
    echo "⚠️  No processed articles to test generation"
fi

echo ""
echo "=========================================="
echo "Test Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Open dashboard: http://localhost:80"
echo "2. Check Intelligence Feed for articles"
echo "3. Click on an article and test platform tabs"
echo ""
