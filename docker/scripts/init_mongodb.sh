#!/bin/bash
# MongoDB replica set initialization script

set -e

# Wait for MongoDB to be available
until mongosh --host mongodb --eval "print(\"waited for connection\")"
do
    echo "Waiting for MongoDB to be available..."
    sleep 2
done

# Initialize the replica set
echo "Initializing MongoDB replica set..."
mongosh --host mongodb <<EOF
rs.initiate({
  _id: "cotaiRS",
  members: [
    { _id: 0, host: "mongodb:27017", priority: 2 }
  ]
})
EOF

echo "MongoDB replica set initialized"

# Allow time for the replica set to initialize
sleep 5

# Create admin user if doesn't exist
echo "Setting up MongoDB users..."
mongosh --host mongodb <<EOF
use admin
if (db.getUser("${MONGO_INITDB_ROOT_USERNAME}") == null) {
  db.createUser({
    user: "${MONGO_INITDB_ROOT_USERNAME}",
    pwd: "${MONGO_INITDB_ROOT_PASSWORD}",
    roles: [ { role: "root", db: "admin" } ]
  })
}
EOF

# Create application database and user
mongosh --host mongodb -u "${MONGO_INITDB_ROOT_USERNAME}" -p "${MONGO_INITDB_ROOT_PASSWORD}" --authenticationDatabase admin <<EOF
use ${MONGO_INITDB_DATABASE}
if (db.getUser("cotai_app") == null) {
  db.createUser({
    user: "cotai_app",
    pwd: "${MONGO_APP_PASSWORD}",
    roles: [
      { role: "readWrite", db: "${MONGO_INITDB_DATABASE}" },
      { role: "dbAdmin", db: "${MONGO_INITDB_DATABASE}" }
    ]
  })
}
EOF

echo "MongoDB setup completed"
