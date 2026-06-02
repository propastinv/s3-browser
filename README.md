# S3 Browser

A clean, modern web UI for browsing and managing S3-compatible object storage — built with Next.js and shadcn/ui.

Self-host it alongside your infrastructure and give your team a simple, access-controlled interface to any S3-compatible bucket.

---

## Features

### Browsing
- Navigate buckets and folders with a tree-style interface
- Thumbnail preview for images directly in the file list
- Sort by name, date, or size
- Search / filter within the current directory
- Recent files view across all buckets

### File Management
- **Upload** — proxy upload through the server or direct-to-S3 via presigned multipart URLs (configurable per bucket)
- **Download** — single file download via signed URL
- **Move** — interactive folder picker (Windows Explorer-style tree navigation)
- **Rename** — inline rename with locked file extension and prefix
- **Delete** — single file, folder (recursive), or bulk selection
- **Bulk Move** — move multiple selected items at once
- **Copy path / URL** — copy the S3 key or public URL to clipboard

### Upload options
- Auto-timestamp filenames on upload (configurable per bucket)
- Multipart upload with progress tracking
- Direct upload mode bypasses the server for large files

### Access control
- NextAuth-based authentication (credentials provider out of the box)
- Per-bucket group-based access control via `buckets.yaml`
- Superadmin group with full access to all buckets
- User management UI (with database backend)

### Infrastructure
- Works with **any S3-compatible provider**: AWS, Cloudflare R2, MinIO, Backblaze B2, DigitalOcean Spaces, etc.
- Optional Postgres database for user management, file index, and audit logs
- Stateless config via `buckets.yaml` — no database required for basic usage

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/propastinv/s3-browser.git
cd s3-browser
npm install
```

### 2. Configure buckets

Create a `buckets.yaml` in the project root:

```yaml
buckets:
  - id: my-bucket
    provider: aws
    bucket: my-bucket-name
    region: us-east-1
    endpoint: ""
    group: team
    accessKeyId: YOUR_ACCESS_KEY
    secretAccessKey: YOUR_SECRET_KEY
    uploadMethod: proxy        # or "direct" for presigned multipart
    publicUrlPrefix: ""        # optional: https://cdn.example.com/
    addTimestamp: false        # optional: prefix uploads with timestamp
```

For Cloudflare R2, MinIO, or other S3-compatible providers, set `endpoint` and `forcePathStyle: true`.

### 3. Configure environment

```bash
cp .env.example .env.local
```

```env
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# Optional: Postgres for user management and audit logs
DATABASE_URL=postgresql://user:password@localhost:5432/s3browser

# Optional: company name shown in the sidebar
COMPANY_NAME=Acme Inc
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment

Works as a standard Next.js app. Deploy anywhere that supports Node.js:

- **Docker** — build a standard Next.js Docker image
- **Vercel / Netlify** — zero-config deployment
- **PM2 / systemd** — run `npm run build && npm start`

Make sure `buckets.yaml` is available at the project root at runtime.

---

## Tech Stack

- [Next.js 15](https://nextjs.org) — App Router
- [shadcn/ui](https://ui.shadcn.com) — component library
- [Tailwind CSS v4](https://tailwindcss.com)
- [AWS SDK v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/) — S3 client
- [NextAuth.js](https://next-auth.js.org) — authentication
- [Prisma](https://www.prisma.io) — optional database ORM

---

## License

MIT — free to use, modify, and distribute.
