#!/bin/bash
# Replica PostgreSQL initialization script
# Configures PostgreSQL to replicate from primary

set -e

# Stop PostgreSQL and clear data directory
pg_ctl -D "$PGDATA" -m fast -w stop

# Empty data directory
rm -rf "$PGDATA"/*

# Run pg_basebackup to clone the primary server
pg_basebackup -h postgres-master -p 5432 -U replicator -D "$PGDATA" -Fp -Xs -P -R

# Create recovery.conf file for replication (for Postgres < 12)
if [ $(pg_config --version | cut -d " " -f 2 | cut -d "." -f 1) -lt 12 ]; then
    cat > "$PGDATA/recovery.conf" <<EOF
standby_mode = 'on'
primary_conninfo = 'host=postgres-master port=5432 user=replicator password=$REPLICATOR_PASSWORD application_name=replica'
primary_slot_name = 'replica_slot'
recovery_target_timeline = 'latest'
EOF
else
    # For PostgreSQL 12 and above
    touch "$PGDATA/standby.signal"
    cat >> "$PGDATA/postgresql.conf" <<EOF
primary_conninfo = 'host=postgres-master port=5432 user=replicator password=$REPLICATOR_PASSWORD application_name=replica'
primary_slot_name = 'replica_slot'
recovery_target_timeline = 'latest'
EOF
fi

# Ensure proper permissions
chmod 700 "$PGDATA"

echo "Replica PostgreSQL configured to replicate from primary"
