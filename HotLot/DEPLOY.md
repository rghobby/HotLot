# HotLot — One-click Hosting Guide

## 1) Create the GitHub repo
- Go to https://github.com/new
- Repository name: **HotLot**
- Choose **Public** (you can switch to Private later)
- Click **Create repository**
- On the next page, click **Upload an existing file** and drag/drop everything from this folder.
- Scroll down and click **Commit changes**.

## 2) Deploy to Vercel
- Visit https://vercel.com/new
- Click **Continue with GitHub** and authorize if prompted.
- Click **Import** next to the **HotLot** repo.
- When asked for **Environment Variables**, add:
  - **Name**: `GOOGLE_MAPS_API_KEY`
  - **Value**: your Google Maps API key
- Click **Deploy**.

In ~1 minute you'll get a live URL, e.g. `https://hotlot.vercel.app`

## Optional
- In Vercel Project Settings → **Domains**, add your custom domain if you have one.
- In **Environment Variables**, you can add more keys later without redeploying manually.
