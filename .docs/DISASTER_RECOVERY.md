# CotAi Disaster Recovery Plan

This document outlines the disaster recovery procedures for the CotAi application running in a production environment.

## Backup Strategy

The system automatically performs daily backups of all critical data:

1. **PostgreSQL database**: Complete database dumps are created and compressed.
2. **MongoDB database**: Complete backups using `mongodump` are created and compressed.
3. **Application data**: Critical application data is backed up from volumes.

Backups are stored in the `/backups` directory within the backup service container and can be configured to be uploaded to external storage (S3, GCS, etc.).

## Disaster Recovery Scenarios

### 1. Database Failure

#### PostgreSQL Master Failure

In case of PostgreSQL master failure:

1. The system will automatically switch to the PostgreSQL replica.
2. To manually promote the replica to master:

```bash
docker exec -it cotai-postgres-replica bash
pg_ctl promote -D /var/lib/postgresql/data
```

3. Update the application configuration to point to the new master.
4. Start a new replica server.

#### MongoDB Failure

In case of MongoDB failure:

1. Stop the affected MongoDB container.
2. Start a new MongoDB container.
3. Restore from the latest backup:

```bash
docker exec -it cotai-backup bash
mongorestore --host mongodb --username $MONGO_USER --password $MONGO_PASSWORD --authenticationDatabase admin --gzip --archive=/backups/latest_mongodb_backup.gz
```

### 2. Application Server Failure

If the application services (backend, frontend) fail:

1. Docker will automatically restart the container due to the `restart: always` policy.
2. If the issue persists, manually restart the services:

```bash
docker compose -f docker compose.production.yml stop backend frontend
docker compose -f docker compose.production.yml up -d backend frontend
```

### 3. Complete System Failure

In case of a complete system failure:

1. Provision a new server with Docker and Docker Compose.
2. Clone the application repository.
3. Copy the `.env.production` file to the new server.
4. Pull the latest Docker images or build them.
5. Restore databases from backups.
6. Start the services:

```bash
docker compose -f docker compose.production.yml up -d
```

## Backup Restoration

### PostgreSQL Restoration

```bash
docker exec -it cotai-backup bash
gunzip -c /backups/postgres_YYYYMMDD_HHMMSS.sql.gz | PGPASSWORD=$POSTGRES_PASSWORD psql -h postgres-master -U $POSTGRES_USER $POSTGRES_DB
```

### MongoDB Restoration

```bash
docker exec -it cotai-backup bash
tar -xzf /backups/mongodb_YYYYMMDD_HHMMSS.tar.gz -C /tmp
mongorestore --host mongodb --username $MONGO_USER --password $MONGO_PASSWORD --authenticationDatabase admin /tmp
```

## Monitoring and Alert System

The monitoring system will alert administrators in case of any failures:

1. **Service Unavailability**: Alerts when services become unresponsive.
2. **High Resource Usage**: Alerts for CPU, memory, or disk usage exceeding thresholds.
3. **Database Replication Issues**: Alerts when PostgreSQL replication lag exceeds thresholds.
4. **Backup Failures**: Alerts if backup processes fail.

## Testing Recovery Procedures

It is recommended to test the recovery procedures quarterly:

1. Restore databases to a test environment.
2. Verify application functionality with restored data.
3. Simulate various failure scenarios and practice recovery steps.

## Contact Information

For immediate assistance during a disaster recovery situation, contact:

- Primary Contact: [Name], [Phone], [Email]
- Secondary Contact: [Name], [Phone], [Email]
