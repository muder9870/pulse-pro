FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama (optional, usually better to run as separate service or use host)
# RUN curl -fsSL https://ollama.com/install.sh | sh

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip list | grep -E "(redis|pybreaker)"

# Copy app
COPY . .

# Create directories for data and logs
RUN mkdir -p data logs

# Make entrypoint executable
RUN chmod +x entrypoint.sh

# Expose port
EXPOSE 5000

# ENTRYPOINT runs entrypoint.sh (migrations + start).
# CMD provides the default command passed to entrypoint.sh.
# The celery-worker service overrides CMD with the celery command,
# so it reuses the same image without running gunicorn.
ENTRYPOINT ["./entrypoint.sh"]
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--worker-class", "gthread", "--threads", "10", "--timeout", "0", "backend.wsgi:app"]
