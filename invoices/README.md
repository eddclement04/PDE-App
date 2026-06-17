# Invoice Files

This folder is for storing exported invoice PDFs or invoice images.

## Recommended naming format

Use a clear file name that includes the **date the invoice was created**, the invoice number, client name, and project name.

Recommended format:

```text
YYYY-MM-DD_PDE-INV-001_client-name_project-name.pdf
YYYY-MM-DD_PDE-INV-002_client-name_project-name.png
```

Example:

```text
2026-06-17_PDE-INV-001_john-emmanuel_la-toc-apartments.pdf
2026-06-17_PDE-INV-002_mary-joseph_residential-extension.png
```

Use the date format **YYYY-MM-DD** because it keeps files sorted properly by year, month, and day.

## Important

The current PDE app is a static GitHub Pages app. It can generate/preview invoices and allow you to print or save them as PDF from the browser.

However, it cannot safely upload invoice PDFs or images directly into this repository without a secure backend or GitHub authentication flow.

For now, use this workflow:

1. Create the invoice in the app.
2. Click **Preview**.
3. Click **Print / Save PDF**.
4. Save the PDF on your computer using the recommended file name format.
5. Upload the saved PDF or image into this `invoices` folder on GitHub.

## Future upgrade option

A later version can store invoice files automatically using a secure backend such as Supabase Storage, Firebase Storage, or a private server.
