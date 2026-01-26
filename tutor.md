# Deploy Guide (Vercel & Render)

## 1. Vercel (Web App)

Deploy the Frontend (`apps/web`) to Vercel.

1.  **New Configuration**: Import your Git repository.
2.  **Root Directory**: Click "Edit" and select `apps/web`.
3.  **Framework Preset**: Ensure "Next.js" is selected.
4.  **Build & Development Settings** (Override):
    *   **Build Command**: `cd ../.. && npm run -w @payflow/shared build && npm run -w @payflow/web build`
    *   **Install Command**: `cd ../.. && npm install`
    *   **Output Directory**: `.next` (Default)
5.  **Environment Variables**:
    *   `NEXT_PUBLIC_API_URL`: Your Render API URL (e.g., `https://payflow-api.onrender.com`)
    *   Copy other necessary vars from `.env.local`.

> **Note**: These override commands (`cd ../..`) allow Vercel to install dependencies from the workspace root and build using npm workspaces, ensuring the shared package is built before the web app.

---

## 2. Render (API & Database)

Deploy the Backend (`apps/api`) and Database to Render using Blueprints.

1.  **New Blueprint**: In Render dashboard, click "New" -> "Blueprint".
2.  **Connect Repo**: Connect your repository.
3.  **Configuration**: Render will automatically detect the `render.yaml` file in the root.
4.  **Resources Detected**:
    *   `payflow-api` (Web Service - Docker)
    *   `payflow-db` (Postgres Database)
5.  **Apply**: Click "Apply" to create the resources.

### Manual Configuration (If not using Blueprint)

If you prefer to set it up manually as a "Web Service":

*   **Runtime**: Docker
*   **Root Directory**: `.` (Leave empty/default)
*   **Dockerfile Path**: `./docker/api.Dockerfile`
*   **Build Context**: `.`
*   **Environment Variables**:
    *   `DATABASE_URL`: Connection string to your Postgres DB (Internal URL strongly recommended).
    *   `JWT_SECRET`: A secure random string.
    *   `PORT`: `3333`
    *   `FRONTEND_URL`: Your Vercel URL (e.g., `https://payflow-platform.vercel.app`).

## Summary of File Structure

*   **Root**:
    *   `render.yaml`: Blueprint for API + DB.
    *   `vercel.json`: Fallback configuration.
    *   `tutor.md`: This guide.
*   **apps/web**:
    *   `vercel.json`: Specific redirects and project settings.
*   **apps/api**:
    *   `render.yaml`: API-specific service config (referenced by root blueprint).
    *   `package.json`: Contains `start:prod` script for Docker.
