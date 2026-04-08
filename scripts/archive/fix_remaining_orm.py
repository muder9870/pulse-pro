#!/usr/bin/env python3
"""
Script to fix remaining get_connection() and init_db() usage across the codebase.
This converts raw cursor code to SQLAlchemy ORM.
"""

import os
import re
from pathlib import Path

# Files to fix with their conversion patterns
FILES_TO_FIX = {
    # Fetchers
    "backend/fetchers/url_fetcher.py": "fetcher",
    "backend/fetchers/reddit_fetcher.py": "fetcher",
    "backend/fetchers/gmail_fetcher.py": "fetcher",
    "backend/fetchers/inoreader_fetcher.py": "fetcher",
    
    # Generators
    "backend/generators/tag_generator.py": "generator",
    "backend/generators/blog_generator.py": "generator",
    "backend/generators/image_generator.py": "generator",
    "backend/generators/video_generator.py": "generator",
    "backend/generators/podcast_generator.py": "generator",
    "backend/generators/generator_v5.py": "generator",
    
    # Processors
    "backend/processors/cleaner.py": "processor",
    "backend/processors/deduplicator.py": "processor",
    "backend/processors/hashtag_recommender.py": "processor",
    "backend/processors/audio_engine.py": "processor",
    "backend/processors/scheduling_engine.py": "processor",
    "backend/processors/monetization_engine.py": "processor",
    "backend/processors/integrations_manager.py": "processor",
    "backend/processors/analytics_engine.py": "processor",
    "backend/processors/content_quality.py": "processor",
    
    # Other
    "backend/monitoring.py": "monitoring",
    "backend/llm_cache.py": "cache",
}

def remove_init_db_import(content):
    """Remove init_db and get_connection imports."""
    # Remove from imports
    content = re.sub(
        r'from\s+(?:backend\.database|\.\.database|\.database)\s+import\s+.*?(?:get_connection|init_db).*?\n',
        lambda m: m.group(0).replace('get_connection', '').replace('init_db', '').replace(', ,', ',').strip().rstrip(',') + '\n' if 'import' in m.group(0) else '',
        content
    )
    
    # Remove standalone init_db() calls
    content = re.sub(r'\s*init_db\(\)\s*\n', '', content)
    
    return content

def add_orm_imports(content, file_type):
    """Add necessary ORM imports if not present."""
    if 'from backend.database import get_session' not in content and 'from ..database import get_session' not in content:
        # Find the last import line
        import_lines = []
        for line in content.split('\n'):
            if line.startswith('import ') or line.startswith('from '):
                import_lines.append(line)
        
        if import_lines:
            last_import = import_lines[-1]
            insert_pos = content.find(last_import) + len(last_import)
            
            if file_type in ['fetcher', 'generator', 'processor']:
                new_imports = '\nfrom ..database import get_session\nfrom ..models import RawArticle'
            else:
                new_imports = '\nfrom backend.database import get_session\nfrom backend.models import RawArticle'
            
            content = content[:insert_pos] + new_imports + content[insert_pos:]
    
    return content

def main():
    print("Fixing remaining ORM conversions...")
    
    for file_path, file_type in FILES_TO_FIX.items():
        if not os.path.exists(file_path):
            print(f"  ⚠️  Skipping {file_path} (not found)")
            continue
        
        print(f"  📝 Processing {file_path}...")
        
        with open(file_path, 'r') as f:
            content = f.read()
        
        original_content = content
        
        # Remove old imports
        content = remove_init_db_import(content)
        
        # Add new imports if needed
        content = add_orm_imports(content, file_type)
        
        if content != original_content:
            with open(file_path, 'w') as f:
                f.write(content)
            print(f"  ✅ Fixed {file_path}")
        else:
            print(f"  ⏭️  No changes needed for {file_path}")
    
    print("\n✨ Done! All files processed.")
    print("\nNote: Some files may still need manual conversion of cursor code to ORM.")
    print("The stubs in database.py will raise NotImplementedError when get_connection() is called.")

if __name__ == "__main__":
    main()
