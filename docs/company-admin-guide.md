# SiteProc Company Admin Guide

**Version 1.0** | Last Updated: November 2025

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Initial Company Setup](#initial-company-setup)
3. [Team Management](#team-management)
4. [Project Creation & Management](#project-creation--management)
5. [Supplier Management](#supplier-management)
6. [Budget Tracking](#budget-tracking)
7. [Financial Reports](#financial-reports)
8. [System Settings](#system-settings)
9. [Security & Permissions](#security--permissions)
10. [Integration & API](#integration--api)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Getting Started

Welcome to SiteProc! As a Company Admin, you have full control over your organization's construction management platform.

### Admin Responsibilities

As a Company Admin, you can:
- ✅ Set up and configure company profile
- ✅ Add and manage team members
- ✅ Create and oversee projects
- ✅ Manage supplier relationships
- ✅ Monitor budgets and expenses
- ✅ Generate financial reports
- ✅ Configure system settings
- ✅ Set user permissions and roles
- ✅ Access all company data

---

## Initial Company Setup

### Step 1: Complete Company Profile

1. **Navigate to Settings** → **Company Profile**

2. **Basic Information**
   - Company legal name
   - Trading name (if different)
   - Business registration number
   - Tax ID / VAT number
   - Industry classification

3. **Contact Details**
   - Primary email address
   - Phone number (main office)
   - Physical address
   - Postal address (if different)
   - Website URL

4. **Business Information**
   - Year established
   - Number of employees
   - Primary services
   - Service areas/regions
   - Business hours

5. **Branding**
   - Upload company logo (PNG/JPG, 500x500px recommended)
   - Choose brand colors
   - Upload letterhead template (optional)

### Step 2: Financial Setup

1. **Banking Details**
   - Bank name
   - Account name
   - Account number
   - Sort code / Routing number
   - SWIFT/BIC (for international)

2. **Accounting Setup**
   - Fiscal year start date
   - Default currency
   - Tax rate
   - Chart of accounts (if applicable)

3. **Payment Terms**
   - Default supplier payment terms (e.g., Net 30)
   - Default client invoice terms
   - Late payment fees (if applicable)

### Step 3: Integration Setup

Connect existing tools:

1. **QuickBooks Integration** (Optional)
   - Click "Connect QuickBooks"
   - Authorize access
   - Map accounts
   - Enable auto-sync

2. **Email Integration**
   - Connect Microsoft 365 or Google Workspace
   - Set up email templates
   - Configure automated notifications

3. **Cloud Storage** (Optional)
   - Connect Google Drive, Dropbox, or OneDrive
   - Set default upload location
   - Configure automatic backups

---

## Team Management

### Adding Team Members

1. **Go to Team** → **Add Member**

2. **Enter User Details**
   - Full name
   - Email address
   - Phone number
   - Job title
   - Department

3. **Assign Role**
   - **Admin** - Full system access
   - **Project Manager** - Manage assigned projects
   - **Site Manager** - Site-level operations
   - **Accountant** - Financial access only
   - **Viewer** - Read-only access

4. **Set Permissions**
   - View projects
   - Create orders
   - Approve expenses
   - Manage suppliers
   - Access reports
   - Modify settings

5. **Send Invitation**
   - User receives email invitation
   - They create their password
   - Account activated upon first login

### Managing Existing Members

**Edit Member:**
1. Find member in team list
2. Click "Edit"
3. Update details/permissions
4. Save changes

**Deactivate Member:**
1. Select member
2. Click "Deactivate"
3. Confirm action
4. Their access is immediately revoked
5. Data remains intact

**Reactivate Member:**
1. Filter by "Inactive"
2. Select member
3. Click "Reactivate"
4. Reset password if needed

### Roles & Permissions Matrix

| Permission | Admin | PM | Site Mgr | Accountant | Viewer |
|------------|-------|----|----|------------|--------|
| Create projects | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create orders | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve orders | ✅ | ✅ | ✅* | ❌ | ❌ |
| View financials | ✅ | ✅ | Limited | ✅ | ❌ |
| Add suppliers | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage team | ✅ | ❌ | ❌ | ❌ | ❌ |
| System settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export data | ✅ | ✅ | ❌ | ✅ | ❌ |

*Within assigned budget

---

## Project Creation & Management

### Creating a New Project

1. **Navigate to Projects** → **Create Project**

2. **Project Details**
   - Project name
   - Project code/number
   - Client name and contact
   - Site address
   - Project type (Residential, Commercial, Infrastructure, etc.)
   - Project description

3. **Timeline**
   - Start date
   - Expected completion date
   - Key milestones
   - Critical deadlines

4. **Budget**
   - Total project budget
   - Budget breakdown by category:
     - Materials
     - Labor
     - Equipment
     - Subcontractors
     - Contingency
   - Payment schedule

5. **Team Assignment**
   - Project Manager
   - Site Manager(s)
   - Team members
   - External contractors

6. **Documents**
   - Upload contracts
   - Plans and drawings
   - Permits and licenses
   - Insurance documents

7. **Create Project**
   - Review all details
   - Click "Create Project"
   - Team receives notification

### Project Dashboard

Each project has a central dashboard showing:

**Overview:**
- Project status and health
- Current phase
- Days until completion
- Team members
- Recent activity

**Financial Summary:**
- Budget vs. actual
- Committed costs
- Outstanding payments
- Variance analysis
- Burn rate

**Progress Tracking:**
- Milestones completed
- Tasks in progress
- Upcoming deadlines
- Issues and risks

**Orders & Deliveries:**
- Active orders
- Pending deliveries
- Completed deliveries
- Order status breakdown

### Managing Projects

**Update Project Status:**
1. Open project
2. Click "Update Status"
3. Select: Planning, In Progress, On Hold, Completed, Cancelled
4. Add notes
5. Save

**Modify Budget:**
1. Go to Project → Budget
2. Click "Adjust Budget"
3. Update category amounts
4. Provide justification
5. Requires admin approval if over threshold
6. Save changes

**Add Project Documents:**
1. Project → Documents
2. Click "Upload"
3. Choose files
4. Add tags and categories
5. Upload

**Project Archive:**
- Completed projects can be archived
- Archived projects are read-only
- All data retained for compliance
- Can be unarchived if needed

---

## Supplier Management

### Adding New Suppliers

1. **Go to Suppliers** → **Add Supplier**

2. **Company Information**
   - Supplier company name
   - Business registration number
   - Tax ID
   - Category (Materials, Equipment, Services, etc.)
   - Products/services offered

3. **Contact Details**
   - Primary contact name
   - Email address
   - Phone number
   - Physical address
   - Website

4. **Business Terms**
   - Payment terms
   - Delivery terms
   - Minimum order value
   - Lead time
   - Warranty terms

5. **Bank Details** (for payments)
   - Bank name
   - Account details
   - Payment method preference

6. **Documents**
   - Insurance certificates
   - Trade licenses
   - Quality certifications
   - Product catalogs

7. **Send Invitation**
   - Supplier receives portal access
   - Can view and manage their orders

### Supplier Categories

Organize suppliers by:
- Materials (concrete, steel, lumber, etc.)
- Equipment rental
- Subcontractors
- Professional services
- Utilities

### Supplier Performance

Track supplier reliability:

**Metrics:**
- On-time delivery rate
- Order accuracy
- Quality ratings
- Response time
- Issue resolution

**Rating System:**
1. After each delivery
2. Rate 1-5 stars
3. Leave feedback
4. Track over time

**Supplier Reports:**
- View performance history
- Compare suppliers
- Identify top performers
- Flag problematic suppliers

### Supplier Portal Access

Suppliers can:
- View their orders
- Update delivery status
- Upload proof of delivery
- Submit invoices
- View payment history
- Update their profile

---

## Budget Tracking

### Budget Setup

**Initial Budget Allocation:**
1. Set total project budget
2. Break down by category
3. Allocate percentages
4. Set approval thresholds
5. Define contingency reserve

**Budget Categories:**
- Direct materials
- Labor costs
- Equipment rental
- Subcontractors
- Professional fees
- Permits and licenses
- Insurance
- Contingency (typically 10-15%)

### Monitoring Spend

**Real-Time Tracking:**
- View budget vs. actual at any time
- See committed costs (orders placed)
- Track pending approvals
- Monitor burn rate

**Budget Alerts:**
Configure alerts for:
- 75% budget consumed
- 90% budget consumed
- Budget overrun
- Unusual spending patterns
- Pending approval limits

**Variance Analysis:**
- Automatic calculation
- Favorable vs. unfavorable variance
- Trend analysis
- Forecast to completion

### Change Orders

When scope changes:

1. **Create Change Order**
   - Description of change
   - Reason for change
   - Cost impact
   - Schedule impact
   - Client approval

2. **Budget Adjustment**
   - Automatically adjusts budget
   - Tracked separately from base
   - Audit trail maintained

3. **Approval Workflow**
   - Requires client sign-off
   - Internal approval if needed
   - Updated budget takes effect

---

## Financial Reports

### Available Reports

**1. Project Financials**
- Budget vs. actual summary
- Category breakdown
- Variance analysis
- Forecasted completion cost

**2. Cash Flow Report**
- Money in (payments received)
- Money out (expenses paid)
- Pending payments
- Cash position

**3. Profit & Loss**
- Revenue by project
- Costs by category
- Gross profit margin
- Net profit

**4. Accounts Payable**
- Outstanding supplier invoices
- Payment due dates
- Aging report (30/60/90 days)
- Payment history

**5. Purchase Order Report**
- All POs issued
- PO status
- Delivered vs. pending
- Value by supplier

**6. Expense Report**
- All expenses by project
- Category breakdown
- Approval status
- Receipt documentation

### Generating Reports

1. **Go to Reports**
2. **Select Report Type**
3. **Set Parameters:**
   - Date range
   - Projects to include
   - Filters (supplier, category, status)
4. **Choose Format:**
   - View on screen
   - Export to PDF
   - Export to Excel/CSV
   - Schedule automated email
5. **Generate**

### Scheduled Reports

**Automate Regular Reports:**
1. Configure report settings
2. Set schedule (daily, weekly, monthly)
3. Add recipients
4. Report auto-emails on schedule

**Common Scheduled Reports:**
- Weekly cash flow (every Monday)
- Monthly P&L (1st of month)
- Daily order summary
- Weekly project status

---

## System Settings

### General Settings

**Company Settings:**
- Company name and details
- Time zone
- Date format
- Currency
- Language

**Notification Settings:**
- Email notification templates
- SMS settings (if enabled)
- Push notification preferences
- Notification frequency

**Display Settings:**
- Dashboard layout
- Default views
- Color theme
- Chart preferences

### Approval Workflows

**Configure Approvals:**

1. **Order Approvals**
   - Set threshold amounts
   - Define approval chain
   - Automatic vs. manual approval

2. **Expense Approvals**
   - Approval limits by role
   - Multi-level approvals
   - Automatic routing

3. **Change Order Approvals**
   - Client approval required
   - Internal approval workflow
   - Documentation requirements

**Example Workflow:**
```
Order Value < $1,000: Auto-approved
Order Value $1,000-$5,000: Site Manager approval
Order Value $5,000-$20,000: Project Manager approval
Order Value > $20,000: Admin approval required
```

### Email Templates

Customize automated emails:

1. **Order Confirmation**
2. **Delivery Notification**
3. **Payment Reminder**
4. **Team Invitation**
5. **Project Update**

**Template Editor:**
- Add company branding
- Include dynamic fields
- Preview before saving
- Test send to yourself

### Backup & Data Export

**Automatic Backups:**
- Daily automatic backups
- 30-day retention
- One-click restore

**Manual Export:**
1. Go to Settings → Data Export
2. Select data to export
3. Choose format (CSV, JSON, Excel)
4. Download file

**Data Includes:**
- Projects
- Orders
- Suppliers
- Team members
- Financial records
- Documents

---

## Security & Permissions

### Security Settings

**Password Policy:**
- Minimum 8 characters
- Require special characters
- Password expiration (optional)
- Password history (prevent reuse)

**Two-Factor Authentication:**
- Require for all admins
- Optional for other users
- SMS or authenticator app
- Backup codes

**Session Management:**
- Auto-logout after inactivity
- Maximum session duration
- Concurrent session limits

**IP Whitelisting:**
- Restrict access by IP address
- Useful for office-only access
- Add trusted IPs

### Audit Logs

Track all system activity:

**Logged Events:**
- User logins/logouts
- Permission changes
- Order creation/modification
- Budget adjustments
- Document uploads/deletes
- Setting changes

**View Audit Logs:**
1. Settings → Audit Logs
2. Filter by:
   - User
   - Action type
   - Date range
   - Project
3. Export for compliance

### Data Privacy

**GDPR Compliance:**
- Data processing agreements
- User consent management
- Right to access data
- Right to deletion
- Data portability

**Data Retention:**
- Active project data: Indefinite
- Completed projects: 7 years default
- Audit logs: 5 years
- Deleted user data: 30-day grace period

---

## Integration & API

### API Access

**Enable API:**
1. Settings → Integrations → API
2. Generate API key
3. View API documentation
4. Test endpoints

**API Capabilities:**
- Create/read/update projects
- Manage orders
- Access reports
- Webhook notifications
- User management

**API Documentation:**
- Base URL: https://api.siteproc.com
- Authentication: Bearer token
- Rate limits: 1000 requests/hour
- Full docs: https://docs.siteproc.com/api

### Webhooks

**Set Up Webhooks:**
1. Settings → Webhooks
2. Add webhook URL
3. Select events to monitor:
   - Order created
   - Order delivered
   - Payment received
   - Project status changed
4. Test webhook
5. Save

**Webhook Payload:**
```json
{
  "event": "order.created",
  "timestamp": "2025-11-07T10:30:00Z",
  "data": {
    "order_id": "ORD-12345",
    "project_id": "PRJ-001",
    "supplier_id": "SUP-789",
    "total_amount": 5000.00
  }
}
```

### Third-Party Integrations

**Available Integrations:**
- QuickBooks Online
- Xero
- Sage
- Microsoft 365
- Google Workspace
- Slack
- Microsoft Teams
- Dropbox
- Google Drive

**Setup Process:**
1. Go to Integrations
2. Select app to integrate
3. Click "Connect"
4. Authorize access
5. Configure sync settings
6. Test connection

---

## Best Practices

### Company Setup

✅ **Complete Profile Fully**
- Fill in all company details
- Upload logo and branding
- Configure all settings before inviting team

✅ **Set Up Approvals Early**
- Define clear approval limits
- Document approval workflows
- Train team on process

✅ **Organize Suppliers**
- Use categories consistently
- Maintain up-to-date contact info
- Rate supplier performance regularly

### Team Management

✅ **Clear Role Definition**
- Assign appropriate permissions
- Document responsibilities
- Regular permission audits

✅ **Onboarding Process**
- Create welcome email template
- Provide training materials
- Assign mentor for first week

✅ **Regular Reviews**
- Quarterly permission review
- Remove inactive users promptly
- Update team structure as needed

### Project Management

✅ **Consistent Naming**
- Use standard project codes
- Clear, descriptive names
- Include client name or location

✅ **Budget Discipline**
- Review budget weekly
- Address variances immediately
- Keep contingency for emergencies

✅ **Documentation**
- Upload all key documents
- Use clear file naming
- Tag documents for easy search

### Financial Management

✅ **Regular Reconciliation**
- Reconcile weekly minimum
- Review outstanding payments
- Address discrepancies quickly

✅ **Cash Flow Monitoring**
- Review cash position daily
- Plan for upcoming large expenses
- Maintain reserve fund

✅ **Supplier Payments**
- Pay on time to maintain relationships
- Take early payment discounts
- Communicate delays in advance

---

## Troubleshooting

### Common Issues

#### "Cannot add team member"

**Check:**
- Email address is correct
- User doesn't already exist
- You have admin permissions
- Email domain isn't blocked

**Solution:**
Try inviting from different admin account

#### "Budget not updating"

**Check:**
- Orders are approved
- Refresh dashboard
- Clear browser cache

**Solution:**
Go to Project → Refresh Data

#### "Report not generating"

**Check:**
- Date range has data
- All required fields selected
- Internet connection stable

**Solution:**
Try narrowing date range or clearing filters

#### "Integration failing"

**Check:**
- Third-party service is online
- API credentials still valid
- Token hasn't expired

**Solution:**
Disconnect and reconnect integration

#### "Can't upload documents"

**Check:**
- File size under limit (10MB)
- File format supported
- Storage quota not exceeded

**Solution:**
Compress file or archive old documents

---

## Advanced Features

### Custom Fields

Add custom fields to projects:
1. Settings → Custom Fields
2. Add field (text, number, date, dropdown)
3. Choose where it appears
4. Make required/optional

### Automated Workflows

Create automation rules:
- When order is delivered → send notification
- When budget reaches 80% → alert admin
- When payment overdue → send reminder

### Mobile App

**Features:**
- Full dashboard access
- Create orders on-site
- Approve expenses
- Upload photos
- Receive push notifications

**Download:**
- iOS: App Store
- Android: Google Play

### Advanced Reporting

**Custom Reports:**
1. Reports → Create Custom
2. Select data sources
3. Choose metrics
4. Add filters
5. Save for reuse

**Dashboard Widgets:**
- Drag-and-drop customization
- Choose metrics to display
- Set refresh intervals

---

## Support & Resources

### Help Center
📚 https://help.siteproc.com
- Video tutorials
- Step-by-step guides
- FAQ database

### Contact Support
📧 **Email:** support@siteproc.com
📞 **Phone:** Available 24/7
💬 **Live Chat:** In-app support

### Training
🎓 **Free Training Sessions**
- Weekly webinars
- One-on-one training
- Certification program

### Community
👥 **User Community**
- Forum discussions
- Best practice sharing
- Feature requests

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Quick search | `Ctrl + K` |
| New project | `Ctrl + Shift + P` |
| New order | `Ctrl + Shift + O` |
| View notifications | `Ctrl + N` |
| Settings | `Ctrl + ,` |
| Help | `F1` |
| Dashboard | `Ctrl + H` |
| Reports | `Ctrl + R` |

---

## Appendix

### Glossary of Terms

**Change Order** - Modification to original project scope
**POD** - Proof of Delivery
**Variance** - Difference between budgeted and actual cost
**Committed Cost** - Orders placed but not yet paid
**Burn Rate** - Rate at which budget is being consumed
**RFQ** - Request for Quote

### Compliance Requirements

Ensure your use of SiteProc complies with:
- Local construction regulations
- Data protection laws (GDPR, CCPA)
- Industry standards (ISO 9001)
- Tax reporting requirements
- Safety regulations

### Data Security

**Your Data:**
- Encrypted at rest and in transit (AES-256)
- Regular security audits
- SOC 2 Type II certified
- GDPR compliant
- Regular backups
- 99.9% uptime SLA

---

**© 2025 SiteProc. All rights reserved.**

Document Version: 1.0
Last Updated: November 2025

For support: support@siteproc.com
Latest docs: https://docs.siteproc.com
