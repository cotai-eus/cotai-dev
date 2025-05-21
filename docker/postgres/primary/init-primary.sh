#!/bin/bash
# Primary PostgreSQL initialization script
# Creates replication user and configures replication

set -e

# Create replication user
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD '$REPLICATOR_PASSWORD';
    SELECT pg_create_physical_replication_slot('replica_slot');
EOSQL

# Update pg_hba.conf to allow replication
cat >> "$PGDATA/pg_hba.conf" <<EOF
# Allow replication connections from all hosts
host    replication     replicator      0.0.0.0/0               md5
EOF

echo "Primary PostgreSQL configured for replication"
