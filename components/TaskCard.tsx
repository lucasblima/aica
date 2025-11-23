import React from 'react';
import { WorkItemB2B } from '../types';
import { Check, Clock } from 'lucide-react';

interface TaskCardProps {
  item: WorkItemB2B;
}

// Componente simplificado para possíveis usos em modais de detalhe
export const TaskCard: React.FC<TaskCardProps> = ({ item }) => {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
       <div>
         <h4 className="font-bold text-slate-800">{item.title}</h4>
         <p className="text-xs text-slate-500">{item.associationName}</p>
       </div>
       <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
          <Clock className="w-3 h-3" />
          {item.dueDate}
       </div>
    </div>
  );
};