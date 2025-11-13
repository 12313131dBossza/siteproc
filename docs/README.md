# SiteProc Documentation

Welcome to the SiteProc documentation repository! This folder contains comprehensive guides for all users.

## 📚 Available Guides

### 1. **Supplier Guide** (`supplier-guide.md`)
**For:** Material suppliers, vendors, contractors providing services

**Contents:**
- Account setup and verification
- Receiving and acknowledging orders
- Updating delivery status
- Uploading proof of delivery
- Managing supplier profile
- Best practices and troubleshooting

**Length:** ~30 pages | **Time to read:** 45 minutes

---

### 2. **Company Admin Guide** (`company-admin-guide.md`)
**For:** Company owners, administrators, operations managers

**Contents:**
- Initial company setup
- Team member management
- Project creation and oversight
- Supplier relationship management
- Budget tracking and financial reports
- System settings and configurations
- Security and permissions
- API and integrations

**Length:** ~45 pages | **Time to read:** 60 minutes

---

### 3. **Site Manager Guide** (`site-manager-guide.md`)
**For:** Site managers, foremen, project supervisors

**Contents:**
- Daily dashboard usage
- Creating and tracking orders
- Confirming deliveries
- Managing contractors
- Change order management
- Progress monitoring
- On-site documentation
- Mobile app usage

**Length:** ~35 pages | **Time to read:** 50 minutes

---

### 4. **Quick Start Guide** (`quick-start-guide.md`)
**For:** Everyone - new users getting started

**Contents:**
- 5-minute setup walkthrough
- Creating your first project
- Adding suppliers
- Placing your first order
- Essential tips and shortcuts
- Next steps checklist

**Length:** ~15 pages | **Time to read:** 15 minutes

---

### 5. **API Documentation** (`api-documentation.md`)
**For:** Developers, system integrators, technical staff

**Contents:**
- Authentication and security
- Complete API reference
- Webhooks setup
- Code examples (JavaScript, Python, cURL)
- Error handling
- Rate limiting
- SDKs and libraries

**Length:** ~25 pages | **Time to read:** 40 minutes

---

### 6. **FAQ & Troubleshooting** (`faq-troubleshooting.md`)
**For:** Everyone - quick answers to common questions

**Contents:**
- Account and login issues
- Orders and deliveries
- Projects and budgets
- Suppliers
- Documents and photos
- Team and permissions
- Billing and payments
- Mobile app
- Integrations
- Technical issues

**Length:** ~30 pages | **Time to read:** Variable (reference guide)

---

## 🚀 Which Guide Should You Read?

### I'm brand new to SiteProc
→ Start with **Quick Start Guide**

### I'm a supplier receiving orders
→ Read **Supplier Guide**

### I'm managing the site daily
→ Read **Site Manager Guide**

### I'm setting up SiteProc for my company
→ Read **Company Admin Guide**

### I'm building an integration
→ Read **API Documentation**

### I have a specific question or problem
→ Check **FAQ & Troubleshooting**

---

## 📄 Converting to PDF

These markdown files can be converted to professional PDFs using several methods:

### Method 1: Pandoc (Recommended)

```bash
# Install Pandoc: https://pandoc.org/installing.html

# Convert single file
pandoc supplier-guide.md -o supplier-guide.pdf

# Convert with styling
pandoc supplier-guide.md -o supplier-guide.pdf \
  --pdf-engine=xelatex \
  --variable mainfont="Arial" \
  --variable fontsize=11pt \
  --toc \
  --toc-depth=2

# Convert all files
for file in *.md; do
  pandoc "$file" -o "${file%.md}.pdf" \
    --pdf-engine=xelatex \
    --variable mainfont="Arial" \
    --toc
done
```

### Method 2: VS Code Extension

1. Install "Markdown PDF" extension
2. Open markdown file
3. Right-click → "Markdown PDF: Export (pdf)"
4. PDF saved in same folder

### Method 3: Online Converter

- https://www.markdowntopdf.com/
- Upload `.md` file
- Download PDF

### Method 4: Print to PDF

1. Open markdown in GitHub/VS Code preview
2. Print (Ctrl+P)
3. Select "Save as PDF"
4. Adjust margins and styling

---

## 📦 Creating a Documentation Package

### For Distribution

1. **Convert all to PDF**
   ```bash
   # Using Pandoc
   ./convert-all-to-pdf.sh
   ```

2. **Create ZIP archive**
   ```bash
   zip -r SiteProc-Documentation.zip *.pdf
   ```

3. **Or create folder structure**
   ```
   SiteProc-Documentation/
   ├── For-Suppliers/
   │   └── Supplier-Guide.pdf
   ├── For-Admins/
   │   └── Company-Admin-Guide.pdf
   ├── For-Site-Managers/
   │   └── Site-Manager-Guide.pdf
   ├── Getting-Started/
   │   └── Quick-Start-Guide.pdf
   ├── For-Developers/
   │   └── API-Documentation.pdf
   └── Support/
       └── FAQ-Troubleshooting.pdf
   ```

---

## 🎨 Branding PDFs

To add company branding to PDFs:

### Option 1: LaTeX Template

Create `template.tex`:
```latex
\documentclass{article}
\usepackage{graphicx}
\usepackage{fancyhdr}

\pagestyle{fancy}
\fancyhead[L]{\includegraphics[width=2cm]{logo.png}}
\fancyhead[R]{SiteProc Documentation}
\fancyfoot[C]{\thepage}

\begin{document}
$body$
\end{document}
```

Use with Pandoc:
```bash
pandoc guide.md -o guide.pdf --template=template.tex
```

### Option 2: Post-Processing

Use PDF editing tools:
- Adobe Acrobat Pro
- PDF Expert (Mac)
- PDFtk (Command line)
- Online: Sejda, SmallPDF

---

## 🔄 Keeping Documentation Updated

### Update Workflow

1. **Edit Markdown Files**
   - Make changes in `.md` files
   - Commit to version control
   - Update version number and date

2. **Regenerate PDFs**
   - Run conversion script
   - Review PDFs
   - Update in distribution package

3. **Deploy**
   - Upload to website
   - Update documentation links
   - Notify users of updates

### Version Control

Each document includes:
- Version number (e.g., 1.0, 1.1, 2.0)
- Last updated date
- Changelog (for major updates)

---

## 📱 Hosting Documentation

### Option 1: Website Integration

Upload PDFs to:
```
https://siteproc1.vercel.app/docs/
├── supplier-guide.pdf
├── company-admin-guide.pdf
├── site-manager-guide.pdf
├── quick-start-guide.pdf
├── api-documentation.pdf
└── faq-troubleshooting.pdf
```

Update landing page links:
```html
<a href="/docs/supplier-guide.pdf" download>Download PDF Guide</a>
```

### Option 2: Documentation Portal

Use tools like:
- GitBook
- Read the Docs
- Docusaurus
- MkDocs

### Option 3: Help Center

Integrate with:
- Zendesk
- Intercom
- Help Scout
- Freshdesk

---

## 🌐 Translations

To translate documentation:

### Using AI (Quick)

```bash
# Using GPT or Claude
"Translate this markdown document to Spanish/French/German"
```

### Professional Translation

1. Export to XLIFF format
2. Send to translation service
3. Import translated XLIFF
4. Generate PDFs in each language

### Naming Convention

```
supplier-guide-en.pdf    (English)
supplier-guide-es.pdf    (Spanish)
supplier-guide-fr.pdf    (French)
supplier-guide-de.pdf    (German)
supplier-guide-zh.pdf    (Chinese)
```

---

## ✅ Documentation Checklist

Before publishing:

- [ ] Spell check all documents
- [ ] Verify all links work
- [ ] Test code examples
- [ ] Check screenshots are current
- [ ] Verify version numbers
- [ ] Update "Last Updated" dates
- [ ] Test PDF generation
- [ ] Review table of contents
- [ ] Check branding/logos
- [ ] Test on mobile devices
- [ ] Get peer review
- [ ] Legal/compliance review

---

## 📊 Documentation Analytics

Track which guides are most helpful:

### Using Website Analytics

```javascript
// Track PDF downloads
gtag('event', 'download', {
  'file_name': 'supplier-guide.pdf',
  'file_type': 'pdf',
  'content_category': 'documentation'
});
```

### Using URL Parameters

```
/docs/supplier-guide.pdf?source=landing-page
/docs/supplier-guide.pdf?source=email-campaign
/docs/supplier-guide.pdf?source=in-app
```

### Feedback Collection

Add feedback form:
- Was this guide helpful? (Yes/No)
- What information was missing?
- Rate the quality (1-5 stars)
- Suggestions for improvement

---

## 🎓 Training Materials

Use documentation for:

### Onboarding New Users
- Email PDF after signup
- Include in welcome email
- Link in first-time user tutorial

### Training Sessions
- Use as reference during webinars
- Share screen with PDF
- Provide as follow-up material

### Support Tickets
- Link to relevant section
- "See page 12 of Supplier Guide"
- Reduces repetitive support queries

---

## 🤝 Contributing

To improve documentation:

1. **Identify Gap**
   - What's missing?
   - What's unclear?
   - User feedback

2. **Make Changes**
   - Edit markdown file
   - Follow existing format
   - Keep tone conversational

3. **Review**
   - Peer review
   - Test instructions
   - Check for clarity

4. **Publish**
   - Update version number
   - Regenerate PDFs
   - Deploy to website

---

## 📧 Support

For documentation questions:
- **Email:** docs@siteproc.com
- **Edit Requests:** Use GitHub issues
- **Quick Questions:** Live chat in app

---

## 📝 License

These documentation files are:
- © 2025 SiteProc. All rights reserved.
- For use with SiteProc platform only
- May not be redistributed without permission

---

**Happy documenting! 📚✨**

Last Updated: November 2025
