#!/bin/bash

# Backup script for CotAi production environment
# This script backs up PostgreSQL and MongoDB databases

# Set variables from environment or use defaults
BACKUP_DIR=${BACKUP_DIR:-/backups}
POSTGRES_HOST=${POSTGRES_HOST:-postgres-master}
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_DB=${POSTGRES_DB:-cotai}
MONGO_HOST=${MONGO_HOST:-mongodb}
MONGO_USER=${MONGO_INITDB_ROOT_USERNAME:-root}
MONGO_PASSWORD=${MONGO_INITDB_ROOT_PASSWORD:-password}
RETENTION_DAYS=${RETENTION_DAYS:-7}

# Create timestamp for backup files
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
POSTGRES_BACKUP_FILE="$BACKUP_DIR/postgres_$TIMESTAMP.sql.gz"
MONGO_BACKUP_DIR="$BACKUP_DIR/mongodb_$TIMESTAMP"

# Ensure backup directory exists
mkdir -p $BACKUP_DIR

# PostgreSQL backup
echo "[$(date)] Starting PostgreSQL backup..."
PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB | gzip > $POSTGRES_BACKUP_FILE
if [ $? -eq 0 ]; then
    echo "[$(date)] PostgreSQL backup completed successfully: $POSTGRES_BACKUP_FILE"
else
    echo "[$(date)] ERROR: PostgreSQL backup failed!" >&2
fi

# MongoDB backup
echo "[$(date)] Starting MongoDB backup..."
mkdir -p $MONGO_BACKUP_DIR
mongodump --host $MONGO_HOST --username $MONGO_USER --password $MONGO_PASSWORD --authenticationDatabase admin --out $MONGO_BACKUP_DIR
if [ $? -eq 0 ]; then
    # Compress the MongoDB backup
    tar -czf "$MONGO_BACKUP_DIR.tar.gz" -C $MONGO_BACKUP_DIR .
    rm -rf $MONGO_BACKUP_DIR
    echo "[$(date)] MongoDB backup completed successfully: $MONGO_BACKUP_DIR.tar.gz"
else
    echo "[$(date)] ERROR: MongoDB backup failed!" >&2
fi

# Clean up old backups
echo "[$(date)] Cleaning backups older than $RETENTION_DAYS days..."
find $BACKUP_DIR -name "postgres_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "mongodb_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup process completed."

# Optional: Copy backups to external storage (S3, GCS, etc.)
# Install AWS CLI for S3 backups
# aws s3 cp $BACKUP_DIR s3://your-backup-bucket/$(date +%Y/%m/%d)/ --recursive
