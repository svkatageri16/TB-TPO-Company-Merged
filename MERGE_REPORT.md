# VEGA Company-Side Merge Report

## Merge source

- Base project: `vega_backup`
- Company-side source: `TB-Updated-Company-UI`
- Output: `VEGA_Updated_Company_UI`

## Integrated company-side functionality

- Updated company dashboard and KPI filters
- Active/ended/all job and applicant statistics
- Hiring pipeline and hiring-time analytics
- Pending actions and company to-do management
- Collapsible company sidebar and responsive company layout
- Live company notification panel and mark-all-read support
- HR management and Sub-HR account support
- Role/permission-aware company access
- Candidate and job assignment to HR users
- Company audit trail
- Company preferences, notification settings, timezone, password, team, and billing UI/API
- Stage-specific assessment/test improvements
- Company-managed job visibility for Sub-HR users
- Pipeline refresh events after applications/interviews

## Backend/database integration

Merged updates in:

- `server/db.ts`
- `server/routes/analytics.ts`
- `server/routes/auth.ts`
- `server/routes/company.ts`
- `server/routes/job.ts`

Added/initialized company tables:

- `company_preferences`
- `company_pending_actions`
- `company_todos`
- `company_hr_profiles`
- `company_job_assignments`
- `company_application_assignments`
- `company_audit_logs`

The source company project referenced `company_audit_logs` but did not initialize it. This merge adds the missing table so the Audit Trail feature can work.

## Branding

New recruiter/Sub-HR emails use VEGA branding instead of TalentBridge branding.

## Validation completed

- `npm run lint` — passed
- `npm run build` — passed
- Frontend company components/pages match the supplied company-side source
- New company routes are registered in `src/App.tsx`
- Required dashboard/settings/HR/notification endpoints are present
- Company route SQL table references were checked against database definitions

## Local setup

1. Copy your environment values into `.env` using `.env.example` as the template.
2. Run `npm install`.
3. Run `npm run dev` for development.
4. Run `npm run build` for a production build.

The `.env`, `.git`, `node_modules`, generated `dist`, and uploaded runtime documents are intentionally excluded from the distributable ZIP.
