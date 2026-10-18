# CLAUDE.md - Mashahir Danesh Law School Platform Guidelines

## Project Overview
"پشتیبانی آموزشی مشاهیر دانش" (Mashahir Danesh Law School 360-Degree Academic Support Platform).
High-scale academic coaching platform for 200,000+ Iranian legal bar examination candidates (کانون وکلا و مرکز وکلا), mentors, supervisors, and executive leadership.

## Architecture & Tech Stack
- **Framework:** Next.js 15 (App Router, React Server Components, Server Actions)
- **Language:** TypeScript 5+ (Strict mode, zero `any` types)
- **Database:** PostgreSQL 16 + Drizzle ORM
- **Cache/Session:** In-memory store with Redis interface fallback
- **UI & Direction:** Tailwind CSS with CSS Logical Properties (`ms-*`, `pe-*`, `start-*`, `end-*`), RTL native (`dir="rtl"`), Radix UI Primitives, Lucide React
- **Typography:** Vazirmatn font
- **Temporal Engine:** Jalali calendar (Saturday-to-Friday study weeks)

## Key Commands
- `npm run dev` - Start development server (Port 3000)
- `npm run build` - Build production bundle
- `npm run lint` - Lint codebase
- `npm test` - Run Vitest test suite
- `npm run db:push` - Push schema to PostgreSQL
- `npm run db:seed` - Seed database with realistic legal bar exam candidates and test roles

## Code Conventions
- Zero `any` types allowed.
- All Server Actions must enforce RBAC via `requireRole` / `requireStudentProfile` guard.
- Never trust client IDs for authorization.
- Always use CSS logical properties for RTL layouts (`ms-*`, `pe-*`, `ps-*`, `text-start`, `text-end`).
