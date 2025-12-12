import React from 'react';
import { Category } from '../types';

interface CategoryChipProps {
  category: Category;
  isActive?: boolean;
  onClick?: () => void;
}

const CategoryChip: React.FC<CategoryChipProps> = ({ category, isActive = false, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap
        ${isActive 
          ? 'bg-[var(--brand-primary)] text-white shadow-lg' 
          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-primary)]'
        }
      `}
    >
      <span className="text-lg">{category.icon}</span>
      <span>{category.name}</span>
      <span className={`text-xs ${isActive ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
        ({category.count.toLocaleString()})
      </span>
    </button>
  );
};

export default CategoryChip;