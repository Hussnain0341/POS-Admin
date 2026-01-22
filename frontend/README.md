# Frontend Folder

This folder contains the React + TypeScript frontend application.

## Structure

```
frontend/
├── public/          # Static assets
├── src/
│   ├── components/ # Reusable React components
│   │   ├── Layout.tsx
│   │   ├── LicenseForm.tsx
│   │   └── PrivateRoute.tsx
│   ├── pages/      # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Licenses.tsx
│   │   ├── LicenseDetail.tsx
│   │   └── Login.tsx
│   ├── services/   # API service layer
│   │   └── api.ts
│   ├── App.tsx     # Main app component
│   └── index.tsx   # Entry point
├── package.json
└── tailwind.config.js
```

## Features

- **Login Page** - Admin authentication
- **Dashboard** - Statistics and overview
- **License Management** - Create, edit, revoke licenses
- **License Details** - View license info and activations
- **Responsive Design** - Tailwind CSS styling

## Environment Variables

Create `frontend/.env`:
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Running

```bash
# Development
npm run client
# or
cd frontend && npm start

# Build for production
npm run build
# or
cd frontend && npm run build
```

## Technologies

- React 19
- TypeScript
- Tailwind CSS
- React Router
- Axios
