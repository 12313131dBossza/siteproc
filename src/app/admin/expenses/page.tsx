export const dynamic = 'force-dynamic';
"use client";
import React from 'react';
import DataTable from '@/components/ui/DataTable';
import { expenses } from '@/lib/mockData';
import { Button } from '@/components/ui/Button';

export default function ExpensesList(){
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Expenses</h1><Button onClick={()=>location.href='/admin/expenses/new'}>New Expense</Button></div>
      <DataTable columns={[
        { key:'id', header:'ID' },
        { key:'project', header:'Project' },
        { key:'category', header:'Category' },
        { key:'amount', header:'Amount' },
        { key:'date', header:'Date' }
      ]} rows={expenses as any} onRowClick={(r:any)=>location.href='/admin/expenses/'+r.id} />
    </div>
  );
}
