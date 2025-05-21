# CotAi Production Environment Setup

This document describes the production environment setup for the CotAi application.

## Overview

The production environment is configured with the following components:

1. **Load Balancer**: Nginx with SSL termination
2. **Backend Services**: Horizontally scaled Python backend services
3. **Frontend Services**: Horizontally scaled frontend services
4. **Database**: PostgreSQL with primary-replica setup for high availability
5. **MongoDB**: For document storage
6. **Redis**: For caching and message broker
7. **Celery Workers**: For asynchronous task processing
8. **Monitoring**: Prometheus, Grafana, Node Exporter
9. **Logging**: Loki, Promtail for centralized logging
10. **Backup System**: Automated database backups
11. **SSL/TLS**: HTTPS with Let's Encrypt certificates
12. **High Availability**: Automatic failover and recovery

## Prerequisites

- Docker and Docker Compose
- Domain name with DNS configured
- Server with at least 8GB RAM and 4 CPU cores

## Deployment

### Initial Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/cotai.git
   cd cotai
   ```

2. Create the production environment file:
   ```bash
   cp .env.production.sample .env.production
   ```

3. Edit the `.env.production` file with your configuration:
   ```bash
   nano .env.production
   ```

4. Start the services:
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

### SSL Certificate Setup

For a production environment, you should use valid SSL certificates:

1. Initialize SSL certificates with Let's Encrypt:
   ```bash
   docker-compose -f docker-compose.production.yml run --rm certbot certonly --webroot -w /var/www/certbot -d yourdomain.com -d www.yourdomain.com
   ```

2. Configure Nginx to use the certificates:
   - The certificates will be automatically mounted in the Nginx container.
   - The renewal process is handled by the certbot service.

## Scaling Services

To scale services:

```bash
docker-compose -f docker-compose.production.yml up -d --scale backend=3 --scale frontend=2 --scale celery-worker=4
```

## Monitoring

The monitoring stack includes:

- **Prometheus**: http://yourdomain.com:9090
- **Grafana**: http://yourdomain.com:3000
- **Loki**: For log aggregation

## Backup and Restore

Automated backups run daily and are stored in the `/backups` directory. See the `DISASTER_RECOVERY.md` document for restore procedures.

## Health Checks

All services have health checks configured. You can monitor the health status:

```bash
docker-compose -f docker-compose.production.yml ps
```

## Troubleshooting

See the logs for any service:

```bash
docker-compose -f docker-compose.production.yml logs -f [service-name]
```

## Security Considerations

- All sensitive data is stored in the `.env.production` file
- Internal services are not exposed to the internet
- Regular security updates should be applied
- Database connections are only accessible within the Docker network

## Performance Tuning

- Adjust the number of workers based on server resources
- Tune PostgreSQL configuration based on available memory
- Configure Redis cache size for optimal performance
