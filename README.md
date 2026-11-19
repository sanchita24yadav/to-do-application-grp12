# TaskFlow — React + TypeScript

A React and TypeScript recreation of the original TaskFlow task manager. The project retains the original prototype's features and browser-only storage model.

## Requirements

- Node.js 18.18+ (Node.js 20+ recommended)
- npm

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Production build

```bash
npm run build
npm run preview
```

The production build is generated in `dist/`.

## Features

- User registration, login, logout, and profile display
- User-specific task records
- Dashboard statistics for total, pending, in-progress, and completed tasks
- Recent five tasks
- Create, edit, and delete tasks
- Task title and description
- High, medium, and low priority
- Pending, in-progress, and completed status
- Due-date assignment and display
- Mark tasks complete and reopen them
- Search by task title
- Filter by status and priority
- Sort by newest, oldest, due date, and priority
- Responsive desktop and mobile layout with collapsible mobile navigation
- Toast notifications, empty states, and form validation
- Browser `localStorage` for users/tasks and `sessionStorage` for the active session

## Storage and security note

This is a frontend prototype, not a production authentication system. Data remains in the current browser's storage and is not synchronised between devices. Passwords are stored in browser local storage for demonstration purposes; do not use real passwords. A production deployment should use a backend, secure password hashing, server-side sessions, and access control.
