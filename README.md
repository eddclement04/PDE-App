# PDE Project & Invoice App

Private web app for recording Perspective Designs & Estimates clients, projects, invoices, payments, and project notes.

## Live app setup for this repository

Repository: `eddclement04/PDE-App`

To launch the app with GitHub Pages:

1. Open the repository on GitHub.
2. Go to **Settings**.
3. Click **Pages** on the left side.
4. Under **Build and deployment**, use these settings:

```text
Source: Deploy from a branch
Branch: main
Folder: /root
```

5. Click **Save**.
6. After GitHub publishes it, the app should be available at:

```text
https://eddclement04.github.io/PDE-App/
```

## Files required for the app

These files must stay in the repository root:

```text
index.html
style.css
app.js
README.md
```

Do not upload only the ZIP file. GitHub Pages needs the actual files, especially `index.html`, in the root of the repository.

## What the app does

- Saves clients
- Saves projects
- Tracks project status, fees, paid amount, and balance
- Creates invoices from projects
- Adds invoice line items
- Calculates totals, paid amounts, and balances
- Prints invoices or saves them as PDF
- Exports and imports backup files

## Important data note

This version saves data in your browser using Local Storage.

That means:

- It is free.
- It does not need a database.
- It works on GitHub Pages.
- Your data stays on the device/browser you use.
- You should use **Export Backup** regularly.

## First settings to enter inside the app

Open **Settings / Backup** inside the app and enter:

```text
Business Name: Perspective Designs and Estimates
Phone: (758) 488-4111
Email: eddclement04@gmail.com
Address: Marisule, Gros Islet, Saint Lucia
Invoice Prefix: PDE-INV
```

Suggested payment note:

```text
Payment may be made by bank transfer, cash, or cheque.
Banking details can be provided upon request.
Thank you for your business.
```

## How to save invoice as PDF

1. Open the app.
2. Go to **Invoices**.
3. Click **Preview** on an invoice.
4. Click **Print / Save PDF**.
5. In the print window, choose **Save as PDF**.

## Suggested next upgrades

- Login protection
- Cloud database with Supabase or Firebase
- Company logo upload
- Direct PDF export button
- Receipt generation
- Expense tracking
- BOQ / estimate module
- Project document checklist
