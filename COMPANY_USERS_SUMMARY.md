# COMPANY USERS SUMMARY

## Your Account
- **Email**: bossbcz@gmail.com
- **Company**: SiteProc Demo
- **Role**: member
- **User ID**: 35a57302-cfec-48ef-b964-b28448ee68c4

## All Users by Company

### 🏢 SiteProc Demo (Your Company)
- **bossbcz@gmail.com** (member) - That's you!

### 🏢 ASD Company
- **kuyraikub55501@gmail.com** (admin)

### 🏢 CC Company  
- **ismelllikepook@gmail.com** (viewer)

### 🏢 sde Company
- **yaibondiseiei@gmail.com** (admin)
- **testmysuperbase@gmail.com** (member)

### 🏢 TestCo Company
- **chayaponyaibandit@gmail.com** (admin)

### 🏢 No Company Assigned
- **yaibondisieie@gmail.com** (viewer)
- **thegrindseasonhomie@gmail.com** (viewer)

## Total Summary
- **Total Users**: 8
- **Total Companies**: 12 (some companies have no active users)
- **Users in Your Company**: Just you (bossbcz@gmail.com)
- **Your Role**: member (can create deliveries, but cannot approve/reject)

## How to Check Company Users Anytime

Use the script I created:

```bash
# Check all companies
node check-company-users.js --companies

# Check users in specific company  
node check-company-users.js --company "SiteProc Demo"

# Find which company a user belongs to
node check-company-users.js --user email@domain.com

# Show all users by role
node check-company-users.js --roles
```

## Notes
- You're currently the only user in "SiteProc Demo" company
- Most users don't have names set in their profiles
- Some companies exist but have no assigned users
- You have "member" role, so you can create deliveries but need someone with "manager" or higher role to approve them
