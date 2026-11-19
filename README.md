# WargaKu RT

WargaKu RT is a web app for neighborhood (RT) administration. Residents can request official letters online and track each request's status, and RT administrators review requests, update their status, generate the letter as a PDF and publish announcements. The user interface is in Indonesian.

**Live demo:** https://wargaku-rt.vercel.app/

## Features

**Residents (`user` role)**
- Register and log in with email and password (Supabase Auth). Registration collects full name, a 16-digit NIK and address.
- Submit a letter request through a validated form. Five letter types are available: domicile (*domisili*), business (*usaha*), low-income (*tidak mampu*), RT cover letter (*pengantar RT*) and general (*umum*).
- Track requests by status (Pending, Diproses, Selesai, Ditolak), with search and status filters.
- See the rejection reason and resubmit a rejected request with the form pre-filled.
- Download the finished letter as a PDF.
- Read announcements from the RT.
- Get in-app notifications when a request's status changes or a new announcement is posted, and mark them as read.

**Administrators (`admin` role)**
- Admin dashboard showing request counts per status and the latest requests.
- Change a request's status, give a reason when rejecting, or delete a request.
- Preview the letter and generate an A4 PDF, numbered automatically, when a request is completed.
- Create announcements. Each one also creates a notification for every resident.

**Live updates**
- Request lists, announcements and notifications refresh in real time through Supabase Realtime (`postgres_changes` subscriptions).

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16.2 (App Router), React 19.2, TypeScript |
| Styling | Tailwind CSS 4 |
| Backend | Supabase: Auth, Postgres, Realtime (`@supabase/supabase-js` 2) |
| Validation | Zod 4 |
| PDF | Built-in generator in `lib/pdf` (no external PDF library) |
| Deployment | Vercel |

## Design

The UI was designed in Figma before development. The images below are **Figma hi-fi designs, not screenshots of the running app**.

| Dashboard | Submit a letter | Request status |
| --- | --- | --- |
| ![Dashboard hi-fi design](<public/HI-FI DASHBOARD.png>) | ![Letter request hi-fi design](<public/HI-FI Ajukan Surat 1.png>) | ![Request status hi-fi design](<public/HI-FI Status Pengajuan Surat.png>) |

Figma file: [WargaKu RT design](https://www.figma.com/design/GfDeMgNBKQOoHTpYPSFVKx/Tugas-4?node-id=28-1030)

## Project Structure

```
app/          Routes (App Router): /, /login, /dashboard, /ajukan-surat, /status,
              /pengumuman, /admin, /admin/pengumuman, /about, /services, /contact,
              plus the /api/services route handler
components/   Shared UI, auth provider, navbar, dashboards, letter preview
hooks/        useAuth, useToast
lib/          Supabase client and types, auth/profile helpers, announcements,
              notifications, NIK validation, PDF generation (lib/pdf)
constants/    Letter template metadata
public/       Logo and Figma design images
proxy.ts      Next.js proxy (middleware) that redirects logged-out users from
              /ajukan-surat and /status to /login
```

## Getting Started

**Requirements:** Node.js and npm, plus a Supabase project.

1. Install dependencies:
   ```bash
   npm ci
   ```
2. Copy `.env.example` to `.env.local` and fill in your Supabase project values:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   Then open http://localhost:3000.

Other scripts: `npm run build`, `npm run start`, `npm run lint`.

## Database

The app expects these tables in the Supabase `public` schema. The list comes from the TypeScript types in `lib/supabaseClient.ts`:

| Table | Purpose |
| --- | --- |
| `profiles` | User profile: full name, NIK, address, email, role (`admin` or `user`) |
| `pengajuan_surat` | Letter requests: applicant data, letter type, status, rejection reason, letter file name, link to the original request when resubmitted |
| `notifications` | Per-user notifications with type, message, metadata and read flag |
| `announcements` | Announcements with title, category, content and author |

> **Note:** The SQL schema, Row Level Security (RLS) policies and Realtime configuration are not in this repository. You have to set them up in your own Supabase project.

## Project Context

WargaKu RT was built as a team project during the VINIX7 Independent Study program (Studi Independen), February to June 2026.

## Contributions

My contributions to this project:

- Designed the user flow, wireframes and hi-fi designs in Figma
- Developed the app with Next.js, Tailwind CSS and Supabase
- Authentication
- Online letter request submission
- Admin dashboard
- Request status management
- Announcements
- Team collaboration with Git and GitHub
- Deployment on Vercel
