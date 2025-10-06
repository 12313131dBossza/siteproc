# How to Create a Delivery (Step-by-Step Guide)

## 🚀 Quick Start

### Option 1: From Deliveries Page
1. Navigate to **Deliveries** in your sidebar
2. Click **"+ New Delivery"** button (green button, top right)

### Option 2: From Orders Page
1. Go to **Orders** page
2. Click **"View Deliveries"** on any order
3. Click **"+ Create Delivery"** button in the modal

---

## 📋 Form Fields Explained

### **1. Order ID (Optional)**
- **What it is**: The purchase order reference
- **How to fill**: Leave blank - it will auto-generate like `ORDER-1728234567890`
- **Example**: `ORD-1759679182.640702`
- **Tip**: This gets linked to your purchase order automatically

### **2. Delivery Date (Required)** ⭐
- **What it is**: The date the delivery was made/scheduled
- **How to fill**: Click the calendar picker or type in format: `YYYY-MM-DD`
- **Example**: `2025-10-06` (today's date is pre-filled)

### **3. Driver Name (Optional)**
- **What it is**: Name of the person delivering
- **How to fill**: Type the driver's name
- **Example**: `John Doe`, `Michael Smith`, `Maria Garcia`

### **4. Vehicle Number (Optional)**
- **What it is**: License plate or truck identification
- **How to fill**: Type the vehicle identifier
- **Example**: `TRK-123`, `ABC-1234`, `VAN-01`

### **5. Status (Required)** ⭐
- **What it is**: Current status of the delivery
- **Options**:
  - **Pending**: Delivery scheduled but not started
  - **In Transit (Partial)**: On the way or partially delivered
  - **Delivered**: Fully completed
- **Default**: Pending
- **Example**: Select "Delivered" when items are received

### **6. Project (Optional)**
- **What it is**: Link this delivery to a specific project
- **How to fill**: Select from dropdown or leave blank
- **Example**: `Downtown Mall Construction`, `Highway Expansion`

---

## 📦 Adding Delivery Items (Required) ⭐

This is the most important section! You must add at least one item.

### For Each Item, Fill:

#### **Product Name (Required)** ⭐
- **What it is**: The material/product being delivered
- **How to fill**: 
  - Start typing and suggestions will appear
  - Or type your own product name
- **Common Products**:
  - Portland Cement
  - Steel Rebar 12mm
  - Concrete Blocks
  - Sand (Fine)
  - Gravel
  - Lumber 2x4
  - Plywood 18mm
  - Roofing Tiles
- **Example**: `Portland Cement`

#### **Quantity (Required)** ⭐
- **What it is**: How many units are being delivered
- **How to fill**: Enter a number (can be decimal like `5.5`)
- **Example**: `5` (for 5 bags of cement)

#### **Unit (Required)** ⭐
- **What it is**: The measurement unit
- **Options**:
  - pieces
  - bags
  - cubic meters
  - sheets
  - tons
  - liters
  - meters
  - square meters
- **Example**: `bags` (for cement)

#### **Unit Price (Required)** ⭐
- **What it is**: Price per single unit
- **How to fill**: Enter amount in dollars (can be decimal)
- **Example**: `12.50` (means $12.50 per bag)

**Total** is calculated automatically: `Quantity × Unit Price`

### Adding Multiple Items:
1. Click **"+ Add Item"** button
2. Fill in the new item fields
3. Repeat as needed
4. To remove an item, click the red trash icon 🗑️

---

## 📝 Example: Complete Delivery Form

Here's how you would fill out a form for the remaining 5 bags of cement:

```
Order ID:           [Leave blank - auto-generates]
Delivery Date:      2025-10-06
Driver Name:        John Doe
Vehicle Number:     TRK-123
Status:             Delivered
Project:            [Leave blank or select project]

--- Items ---
Item 1:
  Product Name:     Portland Cement
  Quantity:         5
  Unit:             bags
  Unit Price:       12.50
  Total:            $62.50 (auto-calculated)

Grand Total:        $62.50

Delivery Notes:     Final delivery - Order complete
Photo Proof:        [Optional - click Upload Images]
```

---

## 📸 Photo Proof (Optional)

- **What it is**: Upload images as delivery confirmation
- **How to use**: 
  1. Click **"Upload Images"** button
  2. Select up to 5 photos from your device
  3. Preview thumbnails will appear
- **Example**: Photos of delivered materials, signed receipts, truck at site

---

## 💡 Pro Tips

### ✅ For Partial Deliveries:
- Enter only the quantity being delivered now
- Set status to "In Transit (Partial)"
- The system will calculate remaining quantities automatically

### ✅ For Complete Deliveries:
- Enter all remaining quantities
- Set status to "Delivered"
- Order will automatically mark as complete

### ✅ To Complete Your Test Order:
Since you already delivered 5 bags out of 10:
1. Create new delivery with 5 bags
2. Status: "Delivered"
3. Submit
4. Order status will change from "Partially Delivered" to "Completed" ✨

---

## 🎯 Quick Example Scenarios

### **Scenario 1: First Partial Delivery**
```
Quantity: 5 bags
Status: In Transit (Partial)
Result: Order shows "Partially Delivered" with 5 remaining
```

### **Scenario 2: Final Delivery**
```
Quantity: 5 bags (remaining)
Status: Delivered
Result: Order shows "Completed" with green badge ✓
```

### **Scenario 3: Multiple Products**
```
Item 1: Portland Cement - 20 bags @ $12.50 = $250.00
Item 2: Steel Rebar - 50 pieces @ $8.00 = $400.00
Item 3: Sand - 2 cubic meters @ $45.00 = $90.00
Grand Total: $740.00
```

---

## ⚠️ Common Mistakes to Avoid

❌ **Forgetting to fill required fields** (marked with *)
✅ Always fill: Delivery Date, at least one item with Product Name, Quantity, Unit, and Unit Price

❌ **Entering wrong quantities**
✅ Double-check the numbers match your delivery note

❌ **Wrong unit selection**
✅ Cement = "bags", not "pieces"

❌ **Negative or zero values**
✅ Quantity and Unit Price must be greater than 0

---

## 🔄 After Submitting

The system will automatically:
1. ✅ Save the delivery to database
2. ✅ Update order quantities (ordered, delivered, remaining)
3. ✅ Update order status (pending → partially delivered → completed)
4. ✅ Show delivery in "View Deliveries" modal
5. ✅ Calculate totals and remaining amounts

---

## 🆘 Need Help?

- The form shows errors in red if required fields are missing
- Grand Total updates automatically as you fill items
- If upload fails, delivery still saves (images are optional)
- You can edit deliveries later if needed

---

**Ready to create your first delivery? Go to /deliveries and click "+ New Delivery"!** 🚀
