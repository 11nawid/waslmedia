# WaslMedia Without Docker

This guide is for running the Next.js app without running the web server in Docker.

You have 2 ways:

1. Run the app locally and keep MinIO in Docker.
2. Run both the app and MinIO locally.

The easiest option is:

- run the app locally
- keep MinIO in Docker

That gives you fast app development and avoids installing MinIO manually.

## Option 1: App locally, MinIO in Docker

### 1. Start only MinIO and Redis

Open terminal in the `infra` folder and run:

```powershell
docker compose up -d minio createbuckets redis
docker compose ps
```

MinIO URLs:

- API: `http://localhost:9000`
- Console: `http://localhost:9001`

### 2. Prepare app env

Create `waslmedia/.env.local` if needed and make sure these values exist:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=waslmedia_v1
AUTH_SECRET=change-me-auth-secret
MEDIA_TOKEN_SECRET=change-me-media-token-secret
MINIO_ROOT_USER=replace-me-minio-user
MINIO_ROOT_PASSWORD=replace-me-minio-password
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_PUBLIC_URL=http://localhost:9000
STORAGE_USE_SSL=false
REDIS_URL=redis://127.0.0.1:6379
```

### 3. Start the app locally

In the app folder run:

```powershell
cd waslmedia
npm install
npm run dev
```

App URL:

- `http://localhost:9002`

### 4. If you change code

Just save the file. Next.js should hot reload automatically.

If the app gets stuck:

```powershell
Ctrl + C
npm run dev
```

### 5. Stop everything

Stop local app:

```powershell
Ctrl + C
```

Stop MinIO and Redis containers:

```powershell
cd ../infra
docker compose stop minio redis
```

## Option 2: App locally, MinIO locally too

Use this only if you do not want Docker at all.

### 1. Download MinIO

Download:

- MinIO server
- MinIO client (`mc`)

From:

- [https://min.io/download](https://min.io/download)

### 2. Start MinIO locally

Example PowerShell command:

```powershell
$env:MINIO_ROOT_USER="replace-me-minio-user"
$env:MINIO_ROOT_PASSWORD="replace-me-minio-password"
.\minio.exe server C:\minio-data --console-address ":9001"
```

### 3. Create buckets

In another terminal:

```powershell
.\mc.exe alias set local http://localhost:9000 replace-me-minio-user replace-me-minio-password
.\mc.exe mb --ignore-existing local/profile
.\mc.exe mb --ignore-existing local/banners
.\mc.exe mb --ignore-existing local/videos
.\mc.exe mb --ignore-existing local/thumbnails
.\mc.exe mb --ignore-existing local/postimages
.\mc.exe mb --ignore-existing local/freeaudio
.\mc.exe mb --ignore-existing local/feedback
.\mc.exe anonymous set none local/profile
.\mc.exe anonymous set none local/banners
.\mc.exe anonymous set none local/videos
.\mc.exe anonymous set none local/thumbnails
.\mc.exe anonymous set none local/postimages
.\mc.exe anonymous set none local/freeaudio
.\mc.exe anonymous set none local/feedback
```

### 4. Start the app locally

In the app folder run:

```powershell
cd waslmedia
npm install
npm run dev
```

### 5. Local URLs

- App: `http://localhost:9002`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

## MySQL note

This project currently expects your MySQL server to already be running.
If you use WAMP, make sure MySQL is on before you start the app.

The app will try to:

- create the database if it does not exist
- create the tables if they do not exist

## Simple answer

If you want the simplest non-Docker flow:

1. Start your local MySQL server.
2. Run `docker compose up -d minio createbuckets redis` in `infra`.
3. Run `npm run dev` in the `waslmedia` folder.

That means:

- app runs locally
- MinIO runs in Docker
- Redis runs in Docker
- MySQL runs from your local server
