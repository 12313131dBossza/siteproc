# 📖 SiteProc User Guide

> **Complete guide to using SiteProc for construction project management**

**Version:** 1.0.0  
**Last Updated:** October 23, 2025

---

## 📑 Table of Contents

1. [Getting Started](#getting-started)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Dashboard Overview](#dashboard-overview)
4. [Projects Management](#projects-management)
5. [Orders Management](#orders-management)
6. [Deliveries Management](#deliveries-management)
7. [Expenses Management](#expenses-management)
8. [Payments Management](#payments-management)
9. [Products Catalog](#products-catalog)
10. [Reports & Analytics](#reports--analytics)
11. [Activity Log](#activity-log)
12. [User Management](#user-management)
13. [Common Workflows](#common-workflows)
14. [Tips & Best Practices](#tips--best-practices)
15. [Troubleshooting](#troubleshooting)
16. [FAQ](#faq)

---

## 🚀 Getting Started

### **Your First Login**

1. **Access SiteProc**
   - Navigate to your SiteProc URL (e.g., `https://your-company.siteproc.com`)
   - You'll see the login page

2. **Enter Your Email**
   - Type your work email address
   - Click "Send Magic Link"

3. **Check Your Email**
   - Look for an email from SiteProc
   - Click the magic link (valid for 1 hour)

4. **Welcome to SiteProc!**
   - You'll land on the Dashboard
   - Your profile is automatically created
   - You're ready to start managing projects!

### **Understanding the Interface**

**Left Sidebar Navigation:**
- 🏠 **Dashboard** - Overview of all activities
- 📦 **Orders** - Manage purchase orders
- 🚚 **Deliveries** - Track deliveries and PODs
- 🏗️ **Projects** - Project budgets and tracking
- 💰 **Expenses** - Project expenses
- 💵 **Payments** - Payment tracking
- 📦 **Products** - Product catalog
- 📊 **Reports** - Financial reports
- 📋 **Activity Log** - Audit trail
- 👥 **Users** - Team management (Admins only)

**Top Right Corner:**
- 🔔 **Notifications** - System alerts
- 👤 **Profile Menu** - Settings and logout

---

## 👥 User Roles & Permissions

### **Role Hierarchy**

| Role | Access Level | Typical Use Case |
|------|--------------|------------------|
| **Owner** 👑 | Full access to everything | Company owner/founder |
| **Admin** 🛡️ | Full access except owner settings | General manager, operations lead |
| **Manager** 📋 | Create orders, approve expenses | Project manager, site supervisor |
| **Accountant** 💰 | Financial operations focus | Bookkeeper, financial controller |
| **Editor** ✏️ | Create and edit records | Office staff, data entry |
| **Viewer** 👀 | Read-only access | Subcontractors, stakeholders |

### **Detailed Permissions**

#### **Owner & Admin**
- ✅ Create, edit, delete all records
- ✅ Manage users and roles
- ✅ Approve/reject orders and expenses
- ✅ Access all reports
- ✅ View activity log
- ✅ Change company settings

#### **Manager**
- ✅ Create orders and deliveries
- ✅ View projects and expenses
- ✅ Approve expenses
- ❌ Cannot delete records
- ❌ Cannot manage users
- ❌ Cannot create/edit payments

#### **Accountant**
- ✅ Create and edit payments
- ✅ Approve expenses
- ✅ View financial reports
- ✅ View all orders and deliveries
- ❌ Cannot create orders/deliveries
- ❌ Cannot manage users

#### **Editor**
- ✅ Create orders and deliveries
- ✅ Edit own records
- ✅ Upload PODs
- ❌ Cannot approve/reject
- ❌ Cannot delete
- ❌ Cannot access payments

#### **Viewer**
- ✅ View all records
- ✅ View reports
- ❌ Cannot create or edit anything
- ❌ Read-only access

---

## 🏠 Dashboard Overview

### **What You'll See**

**1. Stat Cards (Top)**
- **Total Projects** - Active projects count
- **Active Orders** - Orders in progress
- **Pending Deliveries** - Deliveries not yet received
- **Total Expenses** - Month-to-date expenses

**2. Quick Actions**
- Create Project
- Create Order
- Record Delivery
- Add Expense

**3. Recent Activity Timeline**
- Last 10 actions across all entities
- Who did what and when
- Click to view details

**4. Charts & Visualizations** (if enabled)
- Budget vs Actual by Project
- Order Status Distribution
- Delivery Performance

### **Interpreting the Data**

**Green Numbers:** Good (on budget, on time)  
**Yellow Numbers:** Warning (approaching limits)  
**Red Numbers:** Alert (over budget, overdue)

---

## 🏗️ Projects Management

### **Creating a Project**

1. **Click "New Project"**
   - From Dashboard or Projects page

2. **Fill in Project Details:**
   - **Project Name:** e.g., "Downtown Office Renovation"
   - **Description:** Brief project overview
   - **Client Name:** Who the project is for
   - **Budget:** Total project budget (e.g., $250,000)
   - **Start Date:** Project start date
   - **End Date:** Expected completion date
   - **Status:** Planning, Active, Completed, On Hold

3. **Click "Create Project"**
   - Project appears in Projects list
   - Status badge shows current state

### **Project Detail View**

**Tabs:**
- **Overview** - Budget, actual costs, variance
- **Expenses** - All project expenses
- **Orders** - All orders linked to project
- **Deliveries** - Recent deliveries for this project
- **Activity** - Project-specific activity log

**Key Metrics:**
- **Budget:** Original budget amount
- **Actual Costs:** Sum of all deliveries + expenses
- **Remaining:** Budget - Actual
- **Variance:** % over/under budget
- **Profit Margin:** (Budget - Actual) / Budget × 100%

**Status Indicators:**
- 🟢 **On Budget** - Variance < 5%
- 🟡 **Warning** - Variance 5-10%
- 🔴 **Over Budget** - Variance > 10%

### **Editing a Project**

1. Open project detail page
2. Click "Edit Project"
3. Update fields as needed
4. Click "Save Changes"
5. Activity log records the update

### **Project Lifecycle**

```
Planning → Active → Completed
    ↓         ↓
  On Hold   On Hold
```

**Best Practice:** Move projects to "Completed" when done to keep dashboard clean.

---

## 📦 Orders Management

### **Creating an Order**

1. **Navigate to Orders Page**
   - Click "Orders" in sidebar

2. **Click "New Order"**
   - Order form modal opens

3. **Fill in Order Details:**
   - **Project:** Select from dropdown
   - **Description:** What you're ordering (e.g., "200 bags of cement")
   - **Amount:** Total order value (e.g., $5,000)
   - **Category:** Material, Equipment, Labor, Services, Other
   - **Ordered Quantity:** Total units (e.g., 200)
   - **Notes:** Additional information (optional)

4. **Click "Create Order"**
   - Order status: "Pending" (waiting for delivery)
   - Appears in Orders list

### **Order Status Flow**

```
Pending → Partially Delivered → Completed
   ↓
Rejected (if not approved)
```

**Status Meanings:**
- **Pending:** Waiting for first delivery
- **Partially Delivered:** Some items received, more expected
- **Completed:** All items delivered
- **Rejected:** Order was not approved (if approval workflow enabled)

### **Order Details**

**Click an order to view:**
- Order information
- Delivery progress bar
- List of deliveries for this order
- Delivered quantity vs ordered quantity
- Remaining quantity
- Activity history

**"View Deliveries" Button:**
- Opens modal with all deliveries
- Shows items, quantities, dates
- Links to POD if uploaded

### **Approving/Rejecting Orders**

**(Manager, Admin, Owner only)**

1. Find order with "Pending Approval" status
2. Click order to open details
3. Click "Approve" or "Reject"
4. If rejecting, enter reason
5. Status updates automatically
6. Activity log records decision

---

## 🚚 Deliveries Management

### **Recording a Delivery**

1. **Navigate to Deliveries Page**
   - Or click "Record Delivery" from Dashboard

2. **Click "New Delivery"**
   - Delivery form opens

3. **Select Order**
   - Choose which order this delivery is for
   - Order details appear (project, description, remaining qty)

4. **Add Delivery Items**
   - Click "Add Item"
   - Select product from catalog
   - Enter quantity delivered
   - Unit price (pre-filled from product)
   - Total price calculates automatically

5. **Add Delivery Details:**
   - **Delivery Date:** When items arrived
   - **Driver Name:** Who delivered (optional)
   - **Vehicle Number:** Delivery vehicle (optional)
   - **Status:** Pending, In Transit, Delivered
   - **Notes:** Special instructions or issues

6. **Click "Save Delivery"**
   - Delivery is recorded
   - Order status updates automatically
   - Project actual costs update
   - Activity log records delivery

### **Delivery Status Meanings**

- **Pending:** Scheduled but not yet dispatched
- **In Transit:** En route to site
- **Delivered:** Received and verified

### **Uploading Proof of Delivery (POD)**

**Why Upload POD?**
- Verify items were received
- Document condition on arrival
- Provide backup for billing disputes
- Required for compliance

**How to Upload:**

1. Find delivery in Deliveries list
2. Click "Upload POD" button
3. Select file (PDF, PNG, JPG up to 10MB)
4. File uploads to secure storage
5. POD link appears in delivery details
6. Click link to view/download POD

**Best Practices:**
- Upload within 24 hours of delivery
- Include signature, date, and condition notes
- Keep photos clear and readable
- Use PDF for multi-page receipts

### **Status Locking**

⚠️ **IMPORTANT:** Once a delivery is marked "Delivered", it cannot be edited or deleted. This prevents accidental or malicious changes to verified deliveries.

**If you need to change a delivered delivery:**
1. Contact an Admin
2. Provide reason for change
3. Admin can use service-role access
4. Change is logged in activity log

---

## 💰 Expenses Management

### **Creating an Expense**

1. **Go to Expenses Page**

2. **Click "New Expense"**

3. **Fill in Expense Details:**
   - **Project:** Link to project
   - **Description:** What the expense is for (e.g., "Tool rental - jackhammer")
   - **Amount:** Dollar amount
   - **Category:** Material, Labor, Equipment, Overhead, Other
   - **Expense Date:** When expense occurred
   - **Vendor:** Who you paid (optional)
   - **Receipt:** Upload receipt image/PDF (optional)

4. **Click "Create Expense"**
   - Expense status: "Pending Approval"
   - Appears in Expenses list

### **Expense Approval Workflow**

**For Managers/Admins:**

1. Go to Expenses page
2. Filter by "Pending Approval"
3. Click expense to review details
4. Check amount, category, receipt
5. Click "Approve" or "Reject"
6. If approved:
   - Project actual costs update
   - Expense status: "Approved"
7. If rejected:
   - Enter rejection reason
   - Employee is notified
   - Expense status: "Rejected"

**For Employees:**
- Check expense status regularly
- If rejected, fix issues and resubmit
- Keep receipts for all expenses

---

## 💵 Payments Management

**(Accountants, Admins, Owners only)**

### **Recording a Payment**

1. **Navigate to Payments Page**

2. **Click "New Payment"**

3. **Fill in Payment Details:**
   - **Project:** Link to project (optional)
   - **Order:** Link to order (optional)
   - **Expense:** Link to expense (optional)
   - **Amount:** Dollar amount paid
   - **Payment Date:** When payment was made
   - **Payment Method:** Check, Wire Transfer, Credit Card, Cash, Other
   - **Reference Number:** Check #, transaction ID
   - **Vendor/Payee:** Who received payment
   - **Status:** Paid, Unpaid, Overdue, Partial
   - **Notes:** Additional details

4. **Click "Create Payment"**
   - Payment is recorded
   - Appears in Payments list

### **Payment Status Meanings**

- **Paid:** Payment completed and cleared
- **Unpaid:** Payment scheduled but not yet made
- **Overdue:** Payment is past due date
- **Partial:** Some amount paid, balance remaining

### **Editing Payments**

**(Accountants only can edit, Admins can delete)**

1. Find payment in list
2. Click payment to open details
3. Click "Edit" button
4. Update fields
5. Click "Save"
6. Activity log records change

---

## 📦 Products Catalog

### **Managing Products**

**Products = Items you frequently order**

Examples:
- Cement (50 lb bag)
- 2x4 Lumber (8 ft)
- Drywall Sheet (4x8)
- Paint (1 gallon)

### **Adding a Product**

1. Go to Products (Toko) page
2. Click "New Product"
3. Fill in details:
   - **Name:** Product name
   - **SKU:** Stock keeping unit (optional)
   - **Category:** Classification
   - **Unit:** Each, Bag, Box, Bundle, etc.
   - **Unit Price:** Current price
   - **Supplier:** Vendor name
   - **Description:** Additional details
4. Click "Save"

### **Using Products**

**When Creating Deliveries:**
1. Click "Add Item"
2. Select product from dropdown
3. Quantity and price pre-fill
4. Adjust if needed
5. Add to delivery

**Benefits:**
- Faster delivery entry
- Consistent pricing
- Track which products are used most
- Easier reporting

---

## 📊 Reports & Analytics

### **Available Reports**

#### **1. Project Financial Report**

**Shows:**
- All projects with budget, actual costs, variance
- Profit margin percentage
- Over/under budget status

**How to Use:**
1. Go to Reports page
2. Click "Project Financial Report"
3. Select date range (optional)
4. Filter by project (optional)
5. Click "Generate Report"
6. View on-screen or click "Export CSV"

**Use Cases:**
- Monthly financial reviews
- Board presentations
- Budget vs actual analysis
- Identify over-budget projects

#### **2. Payment Summary Report**

**Shows:**
- Total payments by status (Paid, Unpaid, Overdue)
- Payment breakdown by project
- Payment method distribution
- Vendor payment summary

**How to Use:**
1. Go to Reports page
2. Click "Payment Summary Report"
3. Select date range
4. Filter by project or vendor
5. Click "Generate Report"
6. Export to CSV for accounting software

**Use Cases:**
- Cash flow analysis
- Accounts payable aging
- Vendor payment tracking
- Tax preparation

#### **3. Delivery Summary Report**

**Shows:**
- Total deliveries by status
- On-time delivery percentage
- Late deliveries (past needed date)
- Delivery performance by vendor

**How to Use:**
1. Go to Reports page
2. Click "Delivery Summary Report"
3. Select date range
4. Filter by project or status
5. Click "Generate Report"
6. Track delivery performance trends

**Use Cases:**
- Vendor performance evaluation
- Identify delivery delays
- Optimize delivery schedules
- Supply chain analysis

### **CSV Export Features**

**All CSV exports include:**
- Date in Eastern Time (ET)
- Currency formatted as $X,XXX.XX
- All relevant fields
- Compatible with Excel, Google Sheets, accounting software

**Exporting Data:**
1. Generate report
2. Click "Export CSV" button
3. File downloads automatically
4. Open in Excel or import to other tools

---

## 📋 Activity Log

### **What is the Activity Log?**

The Activity Log is a **comprehensive audit trail** of all actions in SiteProc. Every significant action is recorded with:
- **Who** did it (user name)
- **What** they did (action type)
- **When** they did it (timestamp in ET)
- **Where** they did it (entity type and ID)
- **Why** (metadata, notes, changes)

### **Using the Activity Log**

**Filtering:**
- **Search:** Type keywords (user name, description)
- **Entity Type:** Orders, Deliveries, Projects, Expenses, etc.
- **Action Type:** Create, Update, Delete, Approve, Reject
- **Date Range:** Custom date picker

**Example Searches:**
- "Find all orders created by John last week"
- "Show all approved expenses this month"
- "View all delivery updates for Project X"

**Activity Entry Details:**

Click any activity to see:
- Full description
- User who performed action
- Timestamp (exact time in ET)
- Entity details (name, ID)
- Metadata (what changed, old vs new values)
- Related entities (project, order links)

**Use Cases:**
- Investigate discrepancies
- Track who approved what
- Audit compliance
- Resolve disputes
- Performance reviews

---

## 👥 User Management

**(Admins and Owners only)**

### **Inviting a New User**

1. Go to Users page
2. Click "Invite User"
3. Enter email address
4. Select role (Viewer, Editor, Manager, Accountant, Admin)
5. Click "Send Invitation"
6. User receives magic link email
7. User clicks link and creates profile
8. User appears in Users list

### **Changing User Roles**

1. Find user in Users list
2. Click user to open details
3. Click "Edit"
4. Select new role from dropdown
5. Click "Save"
6. User's permissions update immediately
7. Activity log records role change

### **Deactivating a User**

1. Find user in Users list
2. Click user to open details
3. Click "Deactivate"
4. Confirm action
5. User can no longer log in
6. User's data remains in system
7. Can be reactivated later if needed

**Note:** You cannot delete users because their data is linked to orders, deliveries, etc. Deactivation is the proper way to remove access.

---

## 🔄 Common Workflows

### **Workflow 1: From Project to Completed Delivery**

```
Step 1: Create Project
└─> Name: "Office Renovation"
    Budget: $100,000

Step 2: Create Order
└─> Project: Office Renovation
    Description: "Drywall and framing materials"
    Amount: $5,000
    Quantity: 200 sheets

Step 3: Receive Partial Delivery
└─> Order: Drywall order
    Items: 100 sheets delivered
    Status: In Transit → Delivered
    POD: Upload receipt

Step 4: Order Status Auto-Updates
└─> Status: Pending → Partially Delivered
    Progress: 50% (100/200)

Step 5: Receive Final Delivery
└─> Order: Same order
    Items: 100 sheets (remaining)
    Status: Delivered

Step 6: Order Completes Automatically
└─> Status: Partially Delivered → Completed
    Progress: 100% (200/200)

Step 7: Project Costs Update
└─> Project Actual: $5,000 added
    Variance: Calculated automatically
```

### **Workflow 2: Expense Approval**

```
Step 1: Employee Creates Expense
└─> Project: Office Renovation
    Description: "Tool rental"
    Amount: $150
    Receipt: Upload photo

Step 2: Manager Receives Notification
└─> Check Expenses page
    Filter: Pending Approval

Step 3: Manager Reviews
└─> Check receipt image
    Verify amount is reasonable
    Check project is correct

Step 4: Manager Approves
└─> Click "Approve" button
    Expense status: Approved
    Employee notified

Step 5: Project Costs Update
└─> Project Actual: +$150
    Variance recalculated

Step 6: Accountant Records Payment
└─> Link payment to expense
    Payment method: Company check
    Status: Paid
```

### **Workflow 3: Monthly Financial Reporting**

```
Step 1: Generate Project Report
└─> Go to Reports
    Select "Project Financial"
    Date range: Last month

Step 2: Review Data On-Screen
└─> Identify over-budget projects
    Check profit margins
    Note any red flags

Step 3: Export to CSV
└─> Click "Export CSV"
    Open in Excel

Step 4: Create Presentation
└─> Import data to PowerPoint
    Add charts and commentary
    Highlight key findings

Step 5: Present to Management
└─> Show budget performance
    Explain variances
    Recommend actions
```

---

## 💡 Tips & Best Practices

### **For Project Managers**

1. **Create Projects First**
   - Before creating orders, set up the project
   - This ensures proper cost tracking

2. **Link Everything to Projects**
   - Orders, deliveries, expenses should all link to projects
   - This enables accurate budget tracking

3. **Update Project Status Regularly**
   - Move projects through lifecycle (Planning → Active → Completed)
   - Keeps dashboard clean and focused

4. **Review Variance Weekly**
   - Check project detail pages
   - Address over-budget projects quickly

5. **Use Descriptive Names**
   - Clear project names help everyone find what they need
   - Example: "123 Main St - Kitchen Remodel" not just "Kitchen"

### **For Delivery Coordinators**

1. **Record Deliveries Same Day**
   - Don't wait - enter data as deliveries arrive
   - Keeps order status accurate

2. **Always Upload POD**
   - Take photo of delivery receipt immediately
   - Upload before end of day
   - This protects you in disputes

3. **Verify Quantities**
   - Count items upon arrival
   - Note any shortages in delivery notes
   - Update remaining quantity if partial delivery

4. **Use Delivery Notes**
   - Document damaged items
   - Note special circumstances
   - Include driver/vehicle info for tracking

### **For Accountants**

1. **Link Payments to Orders/Expenses**
   - Always link payments to source records
   - This enables accurate reconciliation

2. **Update Payment Status Promptly**
   - Mark as "Paid" when check clears
   - Mark as "Overdue" if past due date

3. **Use Reference Numbers**
   - Always enter check numbers or transaction IDs
   - Makes bank reconciliation easier

4. **Export Reports Monthly**
   - Generate Payment Summary report
   - Export to CSV for QuickBooks/Xero import
   - Archive reports for audit trail

### **For Admins**

1. **Assign Appropriate Roles**
   - Don't give everyone Admin access
   - Use Viewer role for read-only users
   - Use Manager role for project leads

2. **Monitor Activity Log**
   - Check weekly for unusual activity
   - Review all deletions and approvals
   - Investigate any discrepancies

3. **Educate Users**
   - Show new users this guide
   - Demonstrate workflows in person
   - Answer questions promptly

4. **Backup Regularly**
   - Export reports to CSV monthly
   - Keep offline backups of critical data
   - Test restore procedures

---

## 🔧 Troubleshooting

### **Problem: Can't create orders**

**Possible Causes:**
- Not assigned to a company
- Insufficient role (need Editor or higher)
- Network connection issue

**Solutions:**
1. Check your role in Profile menu
2. Contact admin to verify company assignment
3. Try refreshing the page
4. Check internet connection

### **Problem: Dates showing in wrong timezone**

**Explanation:**
- SiteProc displays all dates in Eastern Time (ET)
- This is standard for U.S. construction industry

**If dates seem wrong:**
1. Check your device's date/time settings
2. Refresh the browser
3. Clear browser cache
4. Report to support if issue persists

### **Problem: Cannot upload POD**

**File Size Limits:**
- Maximum file size: 10MB
- Supported formats: PDF, PNG, JPG, JPEG

**Solutions:**
1. Compress large image files
2. Use online tools to reduce PDF size
3. Take photos in lower resolution
4. Split multi-page documents

### **Problem: Order status not updating**

**Auto-Update Conditions:**
- Delivery must be linked to order
- Delivery status must be "Delivered"
- Quantities must be entered correctly

**Solutions:**
1. Verify delivery is linked to correct order
2. Check delivery status is "Delivered"
3. Refresh the page to see updates
4. Check Activity Log for errors

### **Problem: Report not generating**

**Common Issues:**
- No data in selected date range
- Incorrect filters applied
- Browser blocking pop-ups (for CSV)

**Solutions:**
1. Adjust date range to include data
2. Remove filters and try again
3. Allow pop-ups for your SiteProc domain
4. Try different browser (Chrome recommended)

### **Problem: Can't see some features**

**Explanation:**
- Features are role-restricted

**Check:**
1. Your role in Profile menu
2. Permissions table in this guide
3. Contact admin if you need higher access

---

## ❓ FAQ

### **General Questions**

**Q: Is my data secure?**  
A: Yes. SiteProc uses:
- Row-Level Security (RLS) to isolate company data
- Encrypted connections (HTTPS)
- Regular backups
- Industry-standard security practices

**Q: Can I use SiteProc on my phone?**  
A: Yes! SiteProc is fully responsive and works on:
- iPhones (iOS 12+)
- Android phones
- Tablets
- Desktop computers

**Q: What browsers are supported?**  
A: SiteProc works best on:
- Chrome (recommended)
- Firefox
- Safari
- Edge
- Avoid Internet Explorer (not supported)

**Q: How much does SiteProc cost?**  
A: Contact sales@siteproc.com for pricing information.

### **Account Questions**

**Q: How do I reset my password?**  
A: SiteProc uses magic links, not passwords. Simply:
1. Go to login page
2. Enter your email
3. Check email for new magic link
4. Click link to log in

**Q: Can I have multiple companies?**  
A: No. Each user account is assigned to one company. If you work for multiple companies, you need separate accounts.

**Q: How do I change my email address?**  
A: Contact support@siteproc.com with your request.

### **Feature Questions**

**Q: Can I delete a delivery?**  
A: Only if status is NOT "Delivered". Delivered deliveries are locked to prevent data tampering. Contact an admin if you absolutely need to change a delivered delivery.

**Q: Why can't I create payments?**  
A: Only Accountants, Admins, and Owners can create payments. This is by design to maintain financial controls.

**Q: How do I export all my data?**  
A: Use the Reports module:
1. Generate each report type
2. Export to CSV
3. Combine in Excel if needed

**Q: Can I customize the dashboard?**  
A: Not currently. Custom dashboards are planned for a future release.

**Q: Does SiteProc integrate with QuickBooks?**  
A: Not yet. You can export CSV files and import to QuickBooks. Direct integration is planned for version 2.0.

### **Technical Questions**

**Q: What timezone is used?**  
A: All dates and times are displayed in America/New_York (Eastern Time). This is standard for the U.S. construction industry.

**Q: Is there an API?**  
A: Not currently public. If you need API access, contact support@siteproc.com.

**Q: Can I install SiteProc as an app?**  
A: Yes! SiteProc is a Progressive Web App (PWA):
- Chrome (desktop/mobile): Click install icon in address bar
- iOS Safari: Tap Share → Add to Home Screen
- Android: Tap menu → Install App

**Q: Does SiteProc work offline?**  
A: Limited offline support. You can view cached data, but creating/editing requires internet connection. Full offline mode is planned for future releases.

---

## 📞 Support & Resources

### **Need Help?**

**Email Support:**
- General: support@siteproc.com
- Privacy: privacy@siteproc.com
- Sales: sales@siteproc.com

**Documentation:**
- [README.md](./README.md) - Technical setup guide
- [CHANGELOG.md](./CHANGELOG.md) - Version history
- [Terms of Service](/terms) - Legal agreement
- [Privacy Policy](/privacy) - Data handling

**Response Times:**
- Critical issues: 4 hours
- General support: 24 hours
- Feature requests: 1 week

### **Training Resources**

**Available Training:**
1. **This User Guide** - Comprehensive written guide
2. **Video Tutorials** - Coming soon
3. **Live Training Sessions** - Contact sales@siteproc.com
4. **On-Site Training** - Available for enterprise customers

**Self-Service:**
- Explore each feature hands-on
- Use test project to practice workflows
- Refer to this guide frequently

---

## 🎓 Continuing Education

### **Stay Updated**

**What's New:**
- Check CHANGELOG.md for new features
- Watch for in-app announcements
- Subscribe to product updates newsletter

**Best Practices:**
- Review Activity Log weekly
- Audit user roles quarterly
- Back up critical reports monthly
- Train new users thoroughly

**Share Feedback:**
- Request features via support email
- Report bugs immediately
- Suggest improvements
- Participate in user surveys

---

**Thank you for using SiteProc!** 🏗️  
**Built for construction professionals • Eastern Time (ET)**

**Version 1.0.0 • October 23, 2025**
