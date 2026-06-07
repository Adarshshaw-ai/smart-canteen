# CI/CD Implementation Guide

This guide outlines how the automated CI/CD pipeline works for the Smart Canteen System.

## 1. Automated Quality Checks (CI)

We use **GitHub Actions** to automatically check every push and pull request.

### What is checked?
- **Dependencies**: All packages are installed to ensure no broken references.
- **Linting**: We use **ESLint** to catch potential bugs and style issues.
- **Building**: The React frontend is built to ensure it compiles correctly.
- **Testing**: Placeholder tests are run (ready for you to add real logic).

### How to run locally:
- **Lint all**: `npm run lint`
- **Test all**: `npm run test`
- **Install all**: `npm run install-all`

## 2. Continuous Integration (GitHub Actions)

The configuration is in `.github/workflows/ci.yml`. It runs automatically on GitHub.

## 3. Continuous Deployment (CD)

### 3.1 Frontend (Vercel)
1. Go to [Vercel](https://vercel.com).
2. Click **New Project** and import your GitHub repository.
3. Set the **Root Directory** to `client`.
4. Vercel will deploy automatically on every push to `main`.

### 3.2 Backend (Render)
1. Go to [Render](https://render.com).
2. Click **New > Web Service** and connect your GitHub repo.
3. Set the **Root Directory** to `server`.
4. **Build Command**: `npm install`
5. **Start Command**: `npm start`
6. **Environment**: Add your `.env` variables in the "Environment" tab.

## 4. Maintenance

### Adding New Rules
To change linting rules, edit `client/eslint.config.js` or `server/eslint.config.js`.

### Adding Tests
Replace the `echo` commands in the `test` scripts of `package.json` with your test runner (e.g., Vitest, Jest).
