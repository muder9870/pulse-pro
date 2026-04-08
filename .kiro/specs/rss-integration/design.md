# Design Document: RSS Integration

## Overview

This design implements direct RSS integration to replace Inoreader dependency in the AI Pulse Pro system. The solution leverages the existing RSS fetcher (`backend/fetchers/rss_fetcher.py`) and RSS Manager UI (`frontend/src/components/RSSManager.jsx`) by adding the missing API endpoints and pipeline integration.

The architecture maintains the existing pipeline flow while replacing the Inoreader fetcher with direct RSS fetching. Users can import their 38 existing sources via OPML and manage feeds through the dashboard interface.

## Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[RSS Manager UI]
        OPML[OPML Import]
        DASH[Dashboard]
    end
    
    subgraph "API Layer"
        API[REST API Endpoints]
        FEEDS[/api/rss/feeds]
        FETCH[/api/rss/fetch-all]
        IMPORT[/api/rss/import-opml]
    end
    
    subgraph "Business Logic"
        FETCHER[RSS Fetcher]
        PARSER[Feed Parser]
        VALIDATOR[Feed Validator]
        MONITOR[Health Monitor]
    end
    
    subgraph "Data Layer"
        FEEDDB[(RSS Feeds Table)]
        ITEMDB[(RSS Feed Items)]
        RAWDB[(Raw Articles)]
    end
    
    subgraph "Pipeline Integration"
        PIPELINE[Main Pipeline]
        CLEAN[Content Cleaner]
        DEDUP[Deduplicator]
        ANALYZE[Analyzer]
    end
    
    UI --> API
    OPML --> IMPORT
    API --> FETCHER
    FETCHER --> PARSER
    PARSER --> VALIDATOR
    FETCHER --> MONITOR
    FETCHER --> FEEDDB
    FETCHER --> ITEMDB
    FETCHER --> RAWDB
    PIPELINE --> FETCHER
    RAWDB --> CLEAN
    CLEAN --> DEDUP
    DEDUP --> ANALYZE
```

## Components and Interfaces

### 1. API Endpoints (New Implementation Required)

**Location**: `backend/main.py`

#### GET /api/rss/feeds
- **Purpose**: List all RSS feeds with statistics
- **Response**: JSON array of feed objects with health metrics
- **Implementation**: Calls `RSSFetcher.get_feed_stats()`

#### POST /api/rss/feeds
- **Purpose**: Add new RSS feed
- **Request**: `{"url": "string", "category": "string"}`
- **Response**: Feed object with ID
- **Implementation**: Calls `RSSFetcher.add_feed()`

#### DELETE /api/rss/feeds/{id}
- **Purpose**: Remove RSS feed
- **Implementation**: Database deletion with cascade to feed items

#### PATCH /api/rss/feeds/{id}
- **Purpose**: Update feed settings (active/inactive)
- **Request**: `{"active": boolean}`
- **Implementation**: Database update of active status

#### POST /api/rss/fetch-all
- **Purpose**: Manually trigger fetching from all active feeds
- **Response**: Summary of fetched items per feed
- **Implementation**: Calls `RSSFetcher.fetch_all_feeds()`

#### POST /api/rss/add-defaults
- **Purpose**: Add default AI/ML RSS feeds
- **Response**: Number of feeds added
- **Implementation**: Calls `RSSFetcher.add_default_feeds()`

#### POST /api/rss/import-opml
- **Purpose**: Import feeds from OPML file
- **Request**: `{"opml_content": "string"}`
- **Response**: Number of feeds imported
- **Implementation**: Calls `RSSFetcher.import_opml()`

### 2. RSS Fetcher Integration (Existing Component)

**Location**: `backend/fetchers/rss_fetcher.py`

The existing RSS fetcher provides all required functionality:
- Feed validation and management
- OPML import/export
- Content fetching and parsing
- Health monitoring
- Database operations

**Key Methods**:
- `add_feed(url, category)`: Add and validate new feed
- `fetch_all_feeds()`: Fetch from all active feeds
- `import_opml(content)`: Parse and import OPML
- `get_feed_stats()`: Get feed health statistics

### 3. Pipeline Integration (Modification Required)

**Location**: `backend/main_pipeline.py`

**Current State**: Uses Inoreader fetcher conditionally
**Required Change**: Replace Inoreader section with RSS fetcher

```python
# Replace this section in main_pipeline.py
# 1e. RSS feeds (replaces Inoreader)
try:
    from backend.fetchers.rss_fetcher import RSSFetcher
    rss_fetcher = RSSFetcher()
    results = rss_fetcher.fetch_all_feeds(max_items_per_feed=20)
    total_inserted = sum(results.values())
    log.info("stage=fetch source=rss_direct inserted=%s feeds=%s", 
             total_inserted, len(results))
except Exception as exc:
    log.error("stage=fetch source=rss_direct status=error error=%s", exc)
    _err("fetch", exc, "rss_direct")
```

### 4. Frontend Integration (Existing Component)

**Location**: `frontend/src/components/RSSManager.jsx`

The existing RSS Manager UI provides complete functionality:
- Feed list display with health indicators
- Add/remove feed operations
- OPML import interface
- Bulk operations (add defaults, fetch all)
- Feed statistics and monitoring

**Integration Required**: Ensure RSS Manager is accessible from main navigation.

## Data Models

### RSS Feeds Table (Existing)

```sql
CREATE TABLE rss_feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE NOT NULL,
    title TEXT,
    description TEXT,
    category TEXT,
    active INTEGER DEFAULT 1,
    last_fetched TIMESTAMP,
    last_error TEXT,
    fetch_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### RSS Feed Items Table (Existing)

```sql
CREATE TABLE rss_feed_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feed_id INTEGER NOT NULL,
    guid TEXT NOT NULL,
    url TEXT,
    title TEXT,
    processed INTEGER DEFAULT 0,
    published_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(feed_id, guid),
    FOREIGN KEY (feed_id) REFERENCES rss_feeds(id)
)
```

### Integration with Raw Articles (Existing)

RSS content flows into the existing `raw_articles` table:
- `source`: Format "rss:{feed_title}"
- `category`: Auto-categorized based on content
- `raw_content`: Full article content
- `fetched_at`: Timestamp of fetch operation

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: RSS Feed Validation
*For any* RSS feed URL, the system should correctly validate it as either a valid RSS/Atom feed or reject it with appropriate error messaging, regardless of whether it's added individually, through OPML import, or as part of default feeds.
**Validates: Requirements 1.1, 2.2, 6.2**

### Property 2: Complete Feed Information Retrieval
*For any* set of configured RSS feeds, the GET /api/rss/feeds endpoint should return all feeds with complete status information including health metrics, statistics, and configuration details.
**Validates: Requirements 1.2**

### Property 3: Feed Lifecycle Management
*For any* RSS feed in the system, operations like deletion, activation/deactivation should correctly update the feed's state and affect its inclusion in fetch operations.
**Validates: Requirements 1.3, 1.4**

### Property 4: OPML Import Completeness
*For any* valid OPML file, the import process should extract all valid RSS feeds while preserving available metadata such as categories and titles.
**Validates: Requirements 2.1, 2.5**

### Property 5: Error Handling Resilience
*For any* operation that encounters errors (invalid feeds, network failures, parsing errors), the system should log the error, continue processing other items, and not crash the overall operation.
**Validates: Requirements 2.4, 3.4, 5.5**

### Property 6: Accurate Operation Reporting
*For any* bulk operation (OPML import, default feed addition, batch fetching), the system should report counts that accurately reflect the actual number of items successfully processed.
**Validates: Requirements 2.3, 5.3, 6.3**

### Property 7: Content Deduplication
*For any* RSS article, the system should detect duplicates based on URL and title matching, mark them appropriately, and avoid reprocessing the same content.
**Validates: Requirements 3.1, 8.1, 8.2**

### Property 8: Complete Data Extraction
*For any* valid RSS entry, the parsing process should extract all required fields (title, URL, content, publication date, source) and store them with proper categorization.
**Validates: Requirements 3.2, 3.3**

### Property 9: Health Monitoring Accuracy
*For any* RSS feed operation (successful or failed), the health monitoring system should accurately update the corresponding metrics (fetch count, error count, timestamps, status).
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 10: Pipeline Integration Consistency
*For any* pipeline execution, RSS fetching should be included for all active feeds and RSS content should flow through all existing processing stages (clean, deduplicate, analyze, score).
**Validates: Requirements 5.1, 5.2, 5.4**

### Property 11: Content Quality and Integrity
*For any* RSS content processed through the system, the original source attribution should be preserved and content integrity maintained throughout deduplication and quality filtering.
**Validates: Requirements 8.3, 8.4, 8.5**

### Property 12: Default Feed Management
*For any* request to add default feeds, the system should add the complete set of pre-configured AI/ML sources while avoiding duplication of existing feeds and applying appropriate categorization.
**Validates: Requirements 6.1, 6.4, 6.5**

## Error Handling

### RSS Feed Validation Errors
- **Invalid URL Format**: Return clear error message indicating URL format issues
- **Unreachable Feed**: Log network errors and mark feed as temporarily unavailable
- **Invalid RSS/Atom Format**: Parse errors should be logged with specific format issues
- **Authentication Required**: Handle feeds requiring authentication gracefully

### OPML Import Errors
- **Malformed OPML**: Parse errors should not stop import of valid feeds
- **Mixed Valid/Invalid Feeds**: Process valid feeds and report invalid ones
- **Large File Handling**: Handle large OPML files without memory issues
- **Encoding Issues**: Support various text encodings in OPML files

### Network and Connectivity Errors
- **Timeout Handling**: Implement reasonable timeouts for feed fetching
- **Rate Limiting**: Respect server rate limits and implement backoff
- **SSL/TLS Issues**: Handle certificate problems gracefully
- **DNS Resolution**: Handle domain resolution failures

### Database and Storage Errors
- **Constraint Violations**: Handle unique constraint violations for duplicate feeds
- **Transaction Failures**: Ensure data consistency during batch operations
- **Storage Limits**: Handle disk space and database size limits
- **Concurrent Access**: Handle multiple simultaneous operations safely

## Testing Strategy

### Dual Testing Approach
The testing strategy employs both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- API endpoint functionality with specific request/response examples
- OPML parsing with known file formats
- Error conditions with specific failure scenarios
- Database operations with known data sets

**Property-Based Tests**: Verify universal properties across all inputs
- RSS feed validation with generated URLs (valid and invalid)
- Content parsing with various RSS/Atom feed formats
- Deduplication logic with generated article sets
- Error handling with simulated failure conditions

### Property-Based Testing Configuration
- **Library**: Use `hypothesis` for Python property-based testing
- **Iterations**: Minimum 100 iterations per property test
- **Test Tags**: Each property test must reference its design document property
- **Tag Format**: `# Feature: rss-integration, Property {number}: {property_text}`

### Integration Testing
- **Pipeline Integration**: Test RSS fetcher integration with main pipeline
- **API Integration**: Test frontend-backend communication through RSS Manager
- **Database Integration**: Test RSS tables integration with existing schema
- **Error Recovery**: Test system recovery from various failure scenarios

### Performance Testing
- **Large Feed Handling**: Test with feeds containing 1000+ articles
- **Concurrent Operations**: Test multiple simultaneous feed operations
- **Memory Usage**: Monitor memory consumption during large OPML imports
- **Response Times**: Ensure API endpoints respond within acceptable limits