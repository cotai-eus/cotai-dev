#!/bin/bash
# PostgreSQL replication monitor and failover script

set -e

# Set variables from environment or use defaults
POSTGRES_MASTER=${POSTGRES_MASTER:-postgres-master}
POSTGRES_REPLICA=${POSTGRES_REPLICA:-postgres-replica}
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_DB=${POSTGRES_DB:-cotai}
CHECK_INTERVAL=${CHECK_INTERVAL:-60}
MAX_LAG_SECONDS=${MAX_LAG_SECONDS:-300}

# Send alert message
send_alert() {
    echo "[$(date)] ALERT: $1"
    # In production, add code to send alerts via email, Slack, etc.
    # Example: curl -X POST -H 'Content-type: application/json' --data "{\"text\":\"$1\"}" $WEBHOOK_URL
}

# Check if master is available
check_master() {
    PGPASSWORD=$POSTGRES_PASSWORD pg_isready -h $POSTGRES_MASTER -U $POSTGRES_USER
    return $?
}

# Check if replica is available
check_replica() {
    PGPASSWORD=$POSTGRES_PASSWORD pg_isready -h $POSTGRES_REPLICA -U $POSTGRES_USER
    return $?
}

# Check replication lag
check_replication_lag() {
    # Get current lag in seconds
    LAG=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_REPLICA -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::int;")
    
    if [ "$LAG" -gt "$MAX_LAG_SECONDS" ]; then
        send_alert "Replication lag is too high: $LAG seconds"
        return 1
    fi
    
    echo "[$(date)] Replication lag: $LAG seconds"
    return 0
}

# Promote replica to master (manual intervention required in production)
promote_replica() {
    echo "[$(date)] Promoting replica to master..."
    send_alert "Master PostgreSQL server is down! Manual intervention required to promote replica."
    
    # In a fully automated setup, you would uncomment the following:
    # PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_REPLICA -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT pg_promote();"
    
    # Update application configuration to use the new master
    # This would require updating environment variables and potentially restarting services
}

# Main monitoring loop
echo "[$(date)] Starting PostgreSQL replication monitoring"

while true; do
    # Check if master is available
    if ! check_master; then
        send_alert "Master PostgreSQL server is not responding!"
        
        # Check if replica is available
        if check_replica; then
            promote_replica
        else
            send_alert "Both master and replica PostgreSQL servers are down! Critical situation!"
        fi
    else
        # Master is available, check replica
        if ! check_replica; then
            send_alert "Replica PostgreSQL server is not responding!"
        else
            # Both are available, check replication lag
            check_replication_lag
        fi
    fi
    
    # Sleep before next check
    sleep $CHECK_INTERVAL
done
