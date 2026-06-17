# Invoice Files

This folder is for storing exported invoice PDFs or invoice images.

## Recommended naming format

Use a clear file name so invoices stay organized:

```text
PDE-INV-001-client-name-project-name.pdf
PDE-INV-002-client-name-project-name.png
```

## Important

The current PDE app is a static GitHub Pages app. It can generate/preview invoices and allow you to print or save them as PDF from the browser.

However, it cannot safely upload invoice PDFs or images directly into this repository without a secure backend or GitHub authentication flow.

For now, use this workflow:

1. Create the invoice in the app.
2. Click **Preview**.
3. Click **Print / Save PDF**.
4. Save the PDF on your computer.
5. Upload the saved PDF or image into this `invoices` folder on GitHub.

## Future upgrade option

A later version can store invoice files automatically using a secure backend such as Supabase Storage, Firebase Storage, or a private server.
