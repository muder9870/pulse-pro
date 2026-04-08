# AI Pulse Pro - Production Deployment Guide

## Overview

This guide covers deploying AI Pulse Pro to production environments. Choose the deployment method that best fits your needs:

1. **Docker Compose** (Recommended for VPS/self-hosted)
2. **Render** (Easiest cloud deployment)
3. **Railway/Fly.io** (Alternative cloud options)

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (for containerized deployment)
- Ollama installed and running (or accessible via network)
- Required API keys and credentials

---

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the project root:

```bash
# Core Settings
SECRET_KEY=your-secret-key-here-change-in-production
DEBUG=false

# LLM Configuration
LLM_PROVIDER=local  # or free_api, paid_api
OLLAMA_MODEL=llama3.2
OLLAMA_HOST=http://127.0.0.1:11434

# Database
# SQLite is used by default, no configuration needed

# Gmail Newsletter Fetcher (Optional)
GMAIL_ADDRESS=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Reddit API (Optional)
REDDIT_CLIENT_ID=your-client-id
REDDIT_CLIENT_SECRET=your-client-secret
REDDIT_USER_AGENT=ai-pulse-pro/1.0

# Notifications (Optional)
NOTIFY_ON=failure  # or success, always
NOTIFY_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
NOTIFY_EMAIL_TO=alerts@yourdomain.com

# Pipeline Configuration
ANALYSIS_LIMIT=5
CONTENT_TOP_LIMIT=10
CONTENT_PLATFORMS=twitter,linkedin,bluesky

# Scheduler
SCHEDULER_ENABLED=true
```

### Security Best Practices

1. **Never commit `.env` to version control**
2. **Use strong SECRET_KEY**: Generate with `python -c "import secrets; print(secrets.token_hex(32))"`
3. **Rotate credentials regularly**
4. **Use environment-specific configurations**

---

## Deployment Option 1: Docker Compose (Recommended)

### 1. Build and Run

```bash
# Build the images
docker-compose build

# Start the services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the services
docker-compose down
```

### 2. Docker Compose Configuration

The `docker-compose.yml` is already configured. Key services:

- **backend**: Flask API server
- **frontend**: React development server (or nginx for production)
- **ollama**: Local LLM service

### 3. Production Optimizations

For production, update `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      - DEBUG=false
      - FLASK_ENV=production
    restart: unless-stopped
    
  frontend:
    # Use nginx to serve built React app
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    restart: unless-stopped
```

### 4. Persistent Data

Volumes are automatically mounted:

- `./data:/app/data` - Database and media files
- `./logs:/app/logs` - Application logs

**Backup Strategy:**

```bash
# Backup database
docker-compose exec backend sqlite3 /app/data/app.db ".backup '/app/data/backup.db'"

# Copy to host
docker cp pulse-pro-backend:/app/data/backup.db ./backups/app-$(date +%Y%m%d).db
```

---

## Deployment Option 2: Render

### 1. Prepare for Render

Create `render.yaml`:

```yaml
services:
  - type: web
    name: ai-pulse-pro-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: python -m backend.main
    envVars:
      - key: SECRET_KEY
        generateValue: true
      - key: DEBUG
        value: false
      - key: OLLAMA_HOST
        value: http://your-ollama-instance:11434
    
  - type: web
    name: ai-pulse-pro-frontend
    env: node
    buildCommand: cd frontend && npm install && npm run build
    startCommand: cd frontend && npm run preview
    envVars:
      - key: VITE_API_URL
        value: https://ai-pulse-pro-backend.onrender.com
```

### 2. Deploy to Render

1. Push code to GitHub
2. Connect repository to Render
3. Configure environment variables in Render dashboard
4. Deploy

**Note:** Render's free tier has limitations. Consider upgrading for production use.

---

## Deployment Option 3: VPS (Ubuntu/Debian)

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3.11 python3-pip nodejs npm git nginx

# Install Docker (optional)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### 2. Clone and Configure

```bash
# Clone repository
git clone https://github.com/yourusername/ai-pulse-pro.git
cd ai-pulse-pro

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
cd frontend && npm install && npm run build
cd ..

# Configure environment
cp .env.example .env
nano .env  # Edit with your values
```

### 3. Setup Systemd Service

Create `/etc/systemd/system/ai-pulse-pro.service`:

```ini
[Unit]
Description=AI Pulse Pro Backend
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/ai-pulse-pro
Environment="PATH=/path/to/ai-pulse-pro/venv/bin"
ExecStart=/path/to/ai-pulse-pro/venv/bin/python -m backend.main
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ai-pulse-pro
sudo systemctl start ai-pulse-pro
sudo systemctl status ai-pulse-pro
```

### 4. Nginx Configuration

Create `/etc/nginx/sites-available/ai-pulse-pro`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/ai-pulse-pro/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:5000;
    }

    # Media files
    location /media {
        proxy_pass http://127.0.0.1:5000;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/ai-pulse-pro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Post-Deployment Checklist

### 1. Verify Services

```bash
# Check health endpoint
curl http://your-domain.com/health

# Expected response:
{
  "status": "healthy",
  "checks": {
    "database": {"status": "ok"},
    "ollama": {"status": "ok"},
    "disk_space": {"status": "ok"},
    "memory": {"status": "ok"},
    "pipeline": {"running": false}
  }
}
```

### 2. Test Pipeline

```bash
# Trigger manual pipeline run
curl -X POST http://your-domain.com/api/pipeline/run

# Check pipeline status
curl http://your-domain.com/api/pipeline/status
```

### 3. Configure Scheduler

1. Access dashboard at `http://your-domain.com`
2. Navigate to Settings → Scheduler
3. Set desired schedule (e.g., daily at 6 AM)
4. Enable scheduler

### 4. Monitor Logs

```bash
# Docker
docker-compose logs -f backend

# Systemd
sudo journalctl -u ai-pulse-pro -f

# File logs
tail -f logs/app.log
```

---

## Monitoring & Maintenance

### Health Monitoring

Set up automated health checks:

```bash
# Cron job for health check alerts
*/5 * * * * curl -f http://your-domain.com/health || echo "Health check failed" | mail -s "AI Pulse Pro Alert" admin@yourdomain.com
```

### Database Backups

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
sqlite3 /path/to/data/app.db ".backup '/path/to/backups/app-$DATE.db'"

# Keep only last 7 days
find /path/to/backups -name "app-*.db" -mtime +7 -delete
```

Add to crontab:

```bash
0 2 * * * /path/to/backup-script.sh
```

### Log Rotation

Create `/etc/logrotate.d/ai-pulse-pro`:

```
/path/to/ai-pulse-pro/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 your-user your-user
}
```

---

## Troubleshooting

### Issue: Health Check Fails

**Symptoms:** `/health` endpoint returns 503 or errors

**Solutions:**

1. Check if Ollama is running: `ollama list`
2. Verify database exists: `ls -la data/app.db`
3. Check disk space: `df -h`
4. Review logs: `tail -f logs/app.log`

### Issue: Pipeline Not Running

**Symptoms:** Scheduler shows enabled but pipeline doesn't run

**Solutions:**

1. Check scheduler status: `curl http://localhost:5000/api/scheduler/status`
2. Verify cron trigger is set correctly
3. Check for errors in logs
4. Manually trigger: `curl -X POST http://localhost:5000/api/pipeline/run`

### Issue: Out of Memory

**Symptoms:** Process killed, high memory usage

**Solutions:**

1. Increase server memory
2. Reduce `ANALYSIS_LIMIT` and `CONTENT_TOP_LIMIT` in `.env`
3. Use smaller Ollama model
4. Enable swap space

### Issue: Slow Performance

**Symptoms:** API responses take >2 seconds

**Solutions:**

1. Run index migration: `python -m backend.migrations.add_performance_indexes`
2. Check database size: `du -h data/app.db`
3. Optimize Ollama settings
4. Enable caching (see Performance Optimization section)

---

## Performance Optimization

### 1. Enable Response Compression

Already implemented in enhanced health endpoint. Verify with:

```bash
curl -H "Accept-Encoding: gzip" -I http://your-domain.com/api/stories
```

### 2. Database Optimization

```bash
# Run VACUUM to optimize database
sqlite3 data/app.db "VACUUM;"

# Analyze for query optimization
sqlite3 data/app.db "ANALYZE;"
```

### 3. Ollama Performance

```bash
# Use GPU acceleration if available
OLLAMA_GPU=1 ollama serve

# Adjust context window
OLLAMA_NUM_CTX=2048 ollama serve
```

---

## Security Hardening

### 1. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 2. SSL/TLS with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 3. Rate Limiting

Add to nginx configuration:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api {
    limit_req zone=api burst=20;
    proxy_pass http://127.0.0.1:5000;
}
```

---

## Scaling Considerations

### Horizontal Scaling

For high traffic, consider:

1. **Load Balancer**: Nginx or HAProxy
2. **Multiple Backend Instances**: Use gunicorn with workers
3. **Shared Database**: PostgreSQL instead of SQLite
4. **Redis Cache**: For session and query caching

### Vertical Scaling

Recommended specs by usage:

- **Light** (< 100 articles/day): 2 CPU, 4GB RAM
- **Medium** (100-500 articles/day): 4 CPU, 8GB RAM
- **Heavy** (500+ articles/day): 8 CPU, 16GB RAM

---

## Support & Resources

- **Documentation**: See `README.md`
- **Issues**: GitHub Issues
- **Logs**: Check `logs/app.log` for detailed error messages
- **Health Check**: Monitor `/health` endpoint regularly

---

**Last Updated:** 2026-02-05
**Version:** 1.0.0
