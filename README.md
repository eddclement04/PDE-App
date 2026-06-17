# PDE Project & Invoice App

A simple private web app for recording small business clients, projects, invoices, payments, and project notes.

## What it does

- Saves clients
- Saves projects
- Tracks project status, fees, paid amount, and balance
- Creates invoices from projects
- Adds invoice line items
- Calculates totals, paid amounts, and balances
- Prints invoices or saves them as PDF
- Exports and imports backup files

## Important

This version saves data in your browser using Local Storage.

That means:

- It is free.
- It does not need a database.
- It works on GitHub Pages.
- Your data stays on the device/browser you use.
- You should use **Export Backup** regularly.

## How to run on your computer

1. Download or unzip the app folder.
2. Open `index.html` in your browser.
3. Start adding clients, projects, and invoices.

## How to upload to GitHub

1. Create a new GitHub repository.
2. Upload these files:
   - `index.html`
   - `style.css`
   - `app.js`
   - `README.md`
3. Go to repository **Settings**.
4. Open **Pages**.
5. Under **Build and deployment**, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. Save.
7. GitHub will give you a link like:

```text
https://yourusername.github.io/your-repository-name/
```

## How to save invoice as PDF

1. Open the app.
2. Go to Invoices.
3. Click **Preview** on an invoice.
4. Click **Print / Save PDF**.
5. In the print window, choose **Save as PDF**.

## Suggested next upgrades

- Login protection
- Cloud database with Supabase or Firebase
- Company logo upload
- Invoice PDF export button
- Receipt generation
- Expense tracking
- BOQ / estimate module
- Project document checklist
