# Livotale Production Server Runbook

This document explains how the current VPS production deployment works, where files are located, how to operate the app over SSH, and what to do during a security incident.

## Current Server

- VPS IP: `93.127.185.78`
- OS: Ubuntu 24.04 LTS
- App URL before domain mapping: `http://93.127.185.78`
- Public API example: `http://93.127.185.78/api/v1/public/packages`
- Deployment directory on server: `/opt/livotale`
- Runtime: Docker Compose
- Compose project: `livotale-prod`

The codebase was uploaded to the server under `/opt/livotale`.

The upload excluded local-only items:

- `.git`
- local `.env` files
- dependency folders such as `node_modules`
- build outputs such as `dist`
- Python virtualenvs

The production server has its own `/opt/livotale/.env.production`.

## Production Architecture

The app runs as a Docker Compose stack from `/opt/livotale/docker-compose.yml`.

Services:

- `nginx`: public gateway on port `80`
- `ui`: built React/Vite frontend served by nginx
- `api`: FastAPI backend on internal port `4000`
- `worker`: background job worker using ARQ
- `postgres`: PostgreSQL database
- `redis`: Redis for realtime/background infrastructure
- `db-init`: one-time migration job
- `seed-init`: one-time bootstrap seed job

Public traffic flow:

```text
Browser
  -> http://93.127.185.78
  -> nginx container
  -> ui container for frontend pages
  -> api container for /api/*
  -> api container for /ws/*
```

Database and Redis are not exposed publicly. They are only available inside the Docker network.

## Important Folders

On the VPS:

```bash
/opt/livotale
```

Important files and folders:

```bash
/opt/livotale/docker-compose.yml
/opt/livotale/.env.production
/opt/livotale/apps/api
/opt/livotale/apps/ui
/opt/livotale/packages/database/migrations
/opt/livotale/docker/nginx/nginx.prod.conf
/opt/livotale/docker/api/Dockerfile.prod
/opt/livotale/docker/ui/Dockerfile.prod
```

Docker volume:

```bash
livotale-prod_pg_data
```

This volume stores the PostgreSQL database data. Do not delete it unless you intentionally want to wipe production data.

## SSH Login

Login:

```bash
ssh root@93.127.185.78
```

After login:

```bash
cd /opt/livotale
```

Recommended security improvement: rotate the root password and move to SSH key login as soon as possible.

## Daily Operations

Check running services:

```bash
cd /opt/livotale
docker compose --env-file .env.production ps
```

View all logs:

```bash
cd /opt/livotale
docker compose --env-file .env.production logs -f
```

View API logs:

```bash
cd /opt/livotale
docker compose --env-file .env.production logs -f api
```

View nginx logs:

```bash
cd /opt/livotale
docker compose --env-file .env.production logs -f nginx
```

Restart the full app:

```bash
cd /opt/livotale
docker compose --env-file .env.production restart
```

Restart only API:

```bash
cd /opt/livotale
docker compose --env-file .env.production restart api worker
```

Stop the app:

```bash
cd /opt/livotale
docker compose --env-file .env.production down
```

Start the app:

```bash
cd /opt/livotale
docker compose --env-file .env.production up -d
```

Rebuild after code changes:

```bash
cd /opt/livotale
docker compose --env-file .env.production up -d --build
```

## Deployment Steps

When new code is uploaded to `/opt/livotale`, run:

```bash
cd /opt/livotale
docker compose --env-file .env.production --profile init run --rm db-init
docker compose --env-file .env.production up -d --build
```

Only run the seed job intentionally:

```bash
cd /opt/livotale
docker compose --env-file .env.production --profile init run --rm seed-init
```

The seed job is idempotent, but it may create or update bootstrap users, packages, service zones, and pincodes.

## CI/CD Production Deployment

Production deployment is configured in:

```bash
.github/workflows/production-deploy.yml
```

Pipeline order:

1. Build check
2. Publish production bundle to the VPS over SSH

The workflow runs automatically on pushes to `main`. It can also be run manually from GitHub Actions with `workflow_dispatch`.

Build check includes:

- API dependency install with `uv`
- API tests with `pytest`
- UI dependency install with `pnpm`
- UI lint
- UI tests
- UI production build
- Docker Compose config validation
- Production Docker image build for `api`, `worker`, `ui`, `nginx`, and `db-backup`

Publish step:

- Builds a production-only archive in GitHub Actions.
- Includes app/runtime paths such as `apps/api/app`, `apps/api/scripts`, `apps/ui/src`, `apps/ui/public`, `packages/database/migrations`, `docker/`, and `docker-compose.yml`.
- Excludes development-only repository content such as `.specify/`, `.github/agents/`, `.github/prompts/`, docs/specs, tests, and local planning material.
- Uploads the archive to `/opt/livotale/releases/livotale-production.tar.gz`.
- SSHs into the VPS.
- Preserves `/opt/livotale/.env.production`.
- Replaces the deployed runtime files from the production archive.
- Removes macOS `._*` metadata files if present.
- Runs database migrations.
- Rebuilds and starts Docker Compose.
- Verifies the frontend and public packages API.

### Required GitHub Secrets

Add these in GitHub:

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

Required secrets:

```text
PROD_SSH_HOST
PROD_SSH_USER
PROD_SSH_PRIVATE_KEY
PROD_APP_DIR
```

Recommended values:

```text
PROD_SSH_HOST=93.127.185.78
PROD_SSH_USER=root
PROD_APP_DIR=/opt/livotale
```

`PROD_SSH_PRIVATE_KEY` should be a private SSH key that can log in to the VPS. Do not use the root password in GitHub Actions.

### First CI/CD Server Setup

The workflow uploads a production-only archive over SSH. The VPS does not need GitHub repository access.

Recommended setup:

1. Create the app directory.
2. Create `.env.production` on the server.
3. Ensure the SSH user from GitHub Actions can write to the app directory and run Docker Compose.

```bash
mkdir -p /opt/livotale/releases
nano /opt/livotale/.env.production
```

### Manual CI/CD Deploy

From GitHub:

```text
Actions -> Production Deploy -> Run workflow
```

The workflow will deploy the selected branch/ref to production after the build check passes.

### CI/CD Failure Recovery

If build check fails:

- Fix tests, lint, Docker build, or dependency issues locally.
- Push again.

If publish fails:

SSH into the server and inspect:

```bash
ssh root@93.127.185.78
cd /opt/livotale
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=200
```

You can manually rerun the deploy commands:

```bash
cd /opt/livotale
docker compose --env-file .env.production --profile init run --rm db-init
docker compose --env-file .env.production up -d --build
```

## Environment File

Production environment file:

```bash
/opt/livotale/.env.production
```

Check keys without printing values:

```bash
cd /opt/livotale
awk -F= 'NF && $1 !~ /^#/ {print $1}' .env.production
```

Edit:

```bash
cd /opt/livotale
nano .env.production
```

After changing `.env.production`, restart affected services:

```bash
cd /opt/livotale
docker compose --env-file .env.production up -d
```

Current known production blockers:

- S3/AWS values were created as placeholders during initial deployment.
- File upload/storage features need real S3 credentials.
- CORS currently allows the VPS IP. After domain mapping, set `CORS_ORIGINS` to the real domain.
- HTTPS is not configured yet.

## Domain Mapping

In DNS, create an `A` record:

```text
your-domain.com -> 93.127.185.78
```

After DNS resolves, update:

```bash
cd /opt/livotale
nano .env.production
```

Set:

```bash
CORS_ORIGINS=https://your-domain.com
```

Then restart:

```bash
cd /opt/livotale
docker compose --env-file .env.production up -d
```

After that, configure HTTPS with Certbot or a TLS reverse proxy.

## Health Checks

Check frontend:

```bash
curl -I http://127.0.0.1/
curl -I http://93.127.185.78/
```

Check public API:

```bash
curl http://127.0.0.1/api/v1/public/packages
curl http://93.127.185.78/api/v1/public/packages
```

Expected result: JSON data containing public package records.

Note: backend `/health` exists inside the API app, but the current production nginx config only proxies `/api/` and `/ws/`, so `/health` is not exposed publicly.

## Database Management

Open a Postgres shell:

```bash
cd /opt/livotale
docker compose --env-file .env.production exec postgres psql -U livotale_user -d livotale_prod
```

List tables:

```sql
\dt *.*
```

Exit:

```sql
\q
```

The production stack includes an automated `db-backup` service. By default it runs daily
at `DB_BACKUP_CRON` and uploads compressed dumps to:

```text
s3://$S3_BUCKET/backub/YYYY/MM/DD/YYYYMMDDTHHMMSSZ/livotale_prod_YYYYMMDDTHHMMSSZ.sql.gz
```

Check the scheduler logs:

```bash
cd /opt/livotale
docker compose --env-file .env.production logs --tail=100 db-backup
```

Run one backup immediately:

```bash
cd /opt/livotale
docker compose --env-file .env.production run --rm db-backup /usr/local/bin/backup.sh
```

Manual local database backup, if S3 upload is unavailable:

```bash
cd /opt/livotale
mkdir -p backups
docker compose --env-file .env.production exec -T postgres \
  pg_dump -U livotale_user -d livotale_prod \
  > backups/livotale_prod_$(date +%Y%m%d_%H%M%S).sql
```

Copy backup from server to local machine:

```bash
scp root@93.127.185.78:/opt/livotale/backups/backup-file.sql .
```

Do not run `docker compose down -v` on production unless you intentionally want to remove the database volume.

## Logs And Troubleshooting

Check recent container status:

```bash
cd /opt/livotale
docker compose --env-file .env.production ps
```

Check failed/restarting containers:

```bash
docker ps -a
```

Check disk:

```bash
df -h
docker system df
```

Check memory:

```bash
free -h
```

Check port 80:

```bash
ss -tulpn | grep ':80'
```

Check nginx config inside container:

```bash
cd /opt/livotale
docker compose --env-file .env.production exec nginx nginx -t
```

## Attack Or Compromise Scenario

Use this section if you suspect hacking, malware, unknown logins, defacement, abnormal traffic, data leak, or stolen credentials.

### 1. Preserve Evidence First

Do not delete files immediately. Capture the current state:

```bash
date
who
last -a | head -50
docker ps -a
cd /opt/livotale
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --since=24h > incident_logs_$(date +%Y%m%d_%H%M%S).log
```

Check SSH auth logs:

```bash
journalctl -u ssh --since "24 hours ago" > ssh_incident_$(date +%Y%m%d_%H%M%S).log
```

### 2. Contain The Server

If the app is actively being abused, stop public nginx first:

```bash
cd /opt/livotale
docker compose --env-file .env.production stop nginx
```

This keeps database containers available for investigation while taking the public site offline.

If compromise is severe, stop all containers:

```bash
cd /opt/livotale
docker compose --env-file .env.production stop
```

### 3. Rotate Credentials

Rotate immediately:

- VPS root password
- SSH keys
- `JWT_SECRET`
- `INTERNAL_NOTIFICATIONS_KEY`
- database password
- S3/AWS keys
- Twilio keys
- SendGrid keys
- payment gateway keys
- any admin/staff passwords

Edit:

```bash
cd /opt/livotale
nano .env.production
```

Then restart:

```bash
cd /opt/livotale
docker compose --env-file .env.production up -d
```

### 4. Check For Suspicious Access

SSH logins:

```bash
last -a
journalctl -u ssh --since "7 days ago"
```

Unexpected users:

```bash
cat /etc/passwd
ls -la /root/.ssh
cat /root/.ssh/authorized_keys
```

Unexpected cron jobs:

```bash
crontab -l
ls -la /etc/cron*
```

Unexpected processes:

```bash
ps aux --sort=-%cpu | head -30
ps aux --sort=-%mem | head -30
```

Unexpected listening ports:

```bash
ss -tulpn
```

### 5. Backup Before Rebuild

Backup the database:

```bash
cd /opt/livotale
mkdir -p backups
docker compose --env-file .env.production exec -T postgres \
  pg_dump -U livotale_user -d livotale_prod \
  > backups/incident_backup_$(date +%Y%m%d_%H%M%S).sql
```

Copy logs and backup off the server:

```bash
scp root@93.127.185.78:/opt/livotale/incident_logs_*.log .
scp root@93.127.185.78:/opt/livotale/backups/incident_backup_*.sql .
```

### 6. Recovery Recommendation

For a serious compromise, the safest recovery is:

1. Create a fresh VPS.
2. Install Docker.
3. Deploy a clean copy of the code.
4. Restore only a verified database backup.
5. Rotate all credentials.
6. Point DNS to the new VPS.

Do not rely on cleaning a compromised server if root access may have been exposed.

## Hardening Checklist

Recommended next actions:

- Replace password SSH with SSH keys.
- Disable root password login after adding a sudo user.
- Enable firewall rules for only `22`, `80`, and `443`.
- Add HTTPS.
- Monitor the scheduled `db-backup` container and periodically test restores.
- Add monitoring for disk, CPU, memory, and container restarts.
- Use real S3 credentials and least-privilege IAM permissions.
- Change all bootstrap/default user passwords.
- Store production secrets outside chat and outside git.

Basic firewall setup:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

## Current Known Login Seeds

The bootstrap script creates initial users from:

```bash
/opt/livotale/apps/api/scripts/bootstrap_constants.py
```

Change default seeded passwords after first login. Do not keep demo/default passwords in production.

## Commands Quick Reference

```bash
ssh root@93.127.185.78
cd /opt/livotale
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs -f
docker compose --env-file .env.production restart
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production --profile init run --rm db-init
curl -I http://127.0.0.1/
curl http://127.0.0.1/api/v1/public/packages
```
