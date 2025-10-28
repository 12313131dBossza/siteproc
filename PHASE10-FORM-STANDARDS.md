# 📝 STANDARDIZED FORM MODAL GUIDE
## Consistent Form Design Across SiteProc

This guide shows how to create consistent modal forms using the new standardized components.

---

## 🎨 Design Standard (Based on Best Practices)

### **Chosen Style Analysis:**

Looking at your existing forms, we'll combine the best elements:

1. **Payment Form** ✅ - Good:
   - Clean layout with 2-column grid
   - Proper spacing
   - Icon in header
   - Clear footer buttons

2. **Project Form** ✅ - Good:
   - Simple and focused
   - Clear labels
   - Minimal fields

3. **Product Form** ✅ - Good:
   - Organized sections with icons
   - Helpful descriptions
   - Good use of help text

4. **Expense Form** ⚠️ - Needs improvement:
   - Too cramped
   - Missing visual hierarchy
   - No section organization

5. **Delivery Form** ⚠️ - Needs improvement:
   - Very long form
   - No visual breaks
   - Hard to scan

### **Best Fit Standard:**
- ✅ Icon + Title in header
- ✅ Optional description
- ✅ Organized sections with visual separation
- ✅ 2-column layout for related fields
- ✅ Clear Cancel + Submit buttons in footer
- ✅ Consistent input styling
- ✅ Proper validation states

---

## 📋 Standard Form Template

```tsx
'use client';
import { useState } from 'react';
import { FormModal, FormModalActions } from '@/components/ui/FormModal';
import { Input, Select, TextArea } from '@/components/ui';

export function ExampleForm({ isOpen, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    amount: '',
    description: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.amount) newErrors.amount = 'Amount is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      // API call here
      await saveData(formData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Item"
      description="Fill in the details to create a new item"
      icon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      }
      size="md"
      footer={
        <FormModalActions
          onCancel={onClose}
          submitLabel="Create Item"
          isSubmitting={isSubmitting}
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Single column fields */}
        <Input
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter name"
          required
          error={errors.name}
        />

        {/* Two column layout for related fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            options={[
              { value: 'cat1', label: 'Category 1' },
              { value: 'cat2', label: 'Category 2' }
            ]}
            placeholder="Select category"
            required
            error={errors.category}
          />

          <Input
            label="Amount"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="0.00"
            required
            error={errors.amount}
          />
        </div>

        {/* Full width textarea */}
        <TextArea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Optional description"
          rows={3}
        />
      </form>
    </FormModal>
  );
}
```

---

## 🔧 Specific Form Examples

### 1. **Payment Form**

```tsx
<FormModal
  isOpen={isOpen}
  onClose={onClose}
  title="Add New Payment"
  icon={<DollarSignIcon />}
  size="lg"
  footer={<FormModalActions onCancel={onClose} submitLabel="Create Payment" isSubmitting={isSubmitting} />}
>
  <form onSubmit={handleSubmit} className="space-y-6">
    <Input
      label="Vendor Name"
      value={formData.vendorName}
      onChange={(e) => setFormData(prev => ({ ...prev, vendorName: e.target.value }))}
      placeholder="Enter vendor name"
      required
    />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input
        label="Amount"
        type="number"
        value={formData.amount}
        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
        placeholder="0.00"
        leftIcon={<span className="text-gray-500">$</span>}
        required
      />

      <Input
        label="Payment Date"
        type="date"
        value={formData.paymentDate}
        onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
        required
      />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Select
        label="Payment Method"
        value={formData.paymentMethod}
        onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
        options={[
          { value: 'check', label: 'Check' },
          { value: 'cash', label: 'Cash' },
          { value: 'bank_transfer', label: 'Bank Transfer' },
          { value: 'credit_card', label: 'Credit Card' }
        ]}
        required
      />

      <Select
        label="Status"
        value={formData.status}
        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
        options={[
          { value: 'unpaid', label: 'Unpaid' },
          { value: 'paid', label: 'Paid' },
          { value: 'pending', label: 'Pending' }
        ]}
        required
      />
    </div>

    <Input
      label="Reference Number"
      value={formData.reference}
      onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
      placeholder="Check #, Transaction ID, etc."
    />

    <TextArea
      label="Notes"
      value={formData.notes}
      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
      placeholder="Optional notes about this payment"
      rows={3}
    />
  </form>
</FormModal>
```

---

### 2. **Project Form**

```tsx
<FormModal
  isOpen={isOpen}
  onClose={onClose}
  title="New Project"
  size="md"
  footer={<FormModalActions onCancel={onClose} submitLabel="Create Project" isSubmitting={isSubmitting} />}
>
  <form onSubmit={handleSubmit} className="space-y-6">
    <Input
      label="Project Name"
      value={formData.name}
      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
      placeholder="e.g., Main Building Construction"
      required
    />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input
        label="Budget"
        type="number"
        value={formData.budget}
        onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
        placeholder="0"
        leftIcon={<span className="text-gray-500">$</span>}
        required
      />

      <Input
        label="Code"
        value={formData.code}
        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
        placeholder="PRJ-001"
      />
    </div>

    <Select
      label="Status"
      value={formData.status}
      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
      options={[
        { value: 'active', label: 'Active' },
        { value: 'planning', label: 'Planning' },
        { value: 'on-hold', label: 'On Hold' },
        { value: 'completed', label: 'Completed' }
      ]}
      required
    />
  </form>
</FormModal>
```

---

### 3. **Product Form** (With Sections)

```tsx
<FormModal
  isOpen={isOpen}
  onClose={onClose}
  title="Add New Product"
  description="Fill in the details to add a new product to your inventory"
  size="lg"
  footer={<FormModalActions onCancel={onClose} submitLabel="Add Product" isSubmitting={isSubmitting} />}
>
  <form onSubmit={handleSubmit} className="space-y-6">
    {/* Basic Information Section */}
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 pb-2 border-b">
        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
        Basic Information
      </div>

      <Input
        label="Product Name"
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        placeholder="Enter product name"
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Category"
          value={formData.category}
          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
          options={categories}
          placeholder="Select category"
          required
        />

        <Select
          label="Status"
          value={formData.status}
          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
          ]}
          required
        />
      </div>
    </div>

    {/* Pricing & Units Section */}
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 pb-2 border-b">
        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
        </svg>
        Pricing & Units
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Price"
          type="number"
          value={formData.price}
          onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
          placeholder="0.00"
          leftIcon={<span className="text-gray-500">$</span>}
          required
        />

        <Input
          label="Unit"
          value={formData.unit}
          onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
          placeholder="e.g., pcs, kg, liters"
          required
        />
      </div>
    </div>

    {/* Inventory Section */}
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 pb-2 border-b">
        <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
        Inventory Management
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Stock Quantity"
          type="number"
          value={formData.stockQuantity}
          onChange={(e) => setFormData(prev => ({ ...prev, stockQuantity: e.target.value }))}
          placeholder="0"
          required
        />

        <Input
          label="Min Stock Level"
          type="number"
          value={formData.minStock}
          onChange={(e) => setFormData(prev => ({ ...prev, minStock: e.target.value }))}
          placeholder="10"
          helpText="Alert triggers when stock reaches this level"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Reorder Point"
          type="number"
          value={formData.reorderPoint}
          onChange={(e) => setFormData(prev => ({ ...prev, reorderPoint: e.target.value }))}
          placeholder="15"
          helpText="Suggests reordering at this level"
        />

        <Input
          label="Reorder Quantity"
          type="number"
          value={formData.reorderQuantity}
          onChange={(e) => setFormData(prev => ({ ...prev, reorderQuantity: e.target.value }))}
          placeholder="50"
          helpText="Recommended quantity to order"
        />
      </div>
    </div>
  </form>
</FormModal>
```

---

## 🎯 Layout Guidelines

### **Single Column vs Two Column:**

✅ **Use Single Column for:**
- Primary identifier fields (name, title)
- Long text fields (descriptions)
- Unique or unrelated fields

✅ **Use Two Column for:**
- Related pairs (Amount + Date, Price + Unit)
- Status + Category
- Min/Max values
- Start/End dates

### **Section Organization:**

Use sections when forms have >6 fields:
- Group related fields under clear headings
- Add icons to section headers for visual appeal
- Use border or background to separate sections

---

## ✅ Consistency Checklist

When creating/updating a form modal:

- [ ] Uses `<FormModal>` component
- [ ] Has icon in header (relevant to form purpose)
- [ ] Has clear title
- [ ] Has optional description for complex forms
- [ ] Uses standardized `<Input>`, `<Select>`, `<TextArea>` components
- [ ] Has validation with error states
- [ ] Shows loading state during submission
- [ ] Has consistent footer with Cancel + Submit buttons
- [ ] Uses 2-column grid for related fields
- [ ] Has proper spacing (space-y-6 for form, gap-4 for grids)
- [ ] Has help text for complex fields
- [ ] Required fields marked with asterisk (*)
- [ ] Proper placeholder text
- [ ] Responsive (stacks on mobile)

---

## 🚀 Implementation Priority

1. ✅ Payment Form - Highest traffic
2. ✅ Project Form - Core functionality
3. ✅ Expense Form - Daily use
4. ✅ Product Form - Inventory management
5. ✅ Delivery Form - Operations

---

**Next Step:** Apply this standard to all existing forms systematically.
