import React from 'react';

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export function ActionCard({ title, description, icon, onClick }: ActionCardProps) {
  return (
    <button 
      onClick={onClick} 
      className="group text-left rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-zinc-100 text-zinc-700 grid place-items-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
          {icon}
        </div>
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-sm text-zinc-500">{description}</div>
        </div>
      </div>
    </button>
  );
}
