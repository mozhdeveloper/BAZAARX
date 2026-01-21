import React from 'react';
import { motion } from 'framer-motion';


interface CategoryCardProps {
  category: any;
  rotation: number;
  xOffset: number;
}

const CategoryChip: React.FC<CategoryCardProps> = ({ category, rotation, xOffset }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotate: 0 }}
      whileInView={{ 
        opacity: 1, 
        y: 0, 
        rotate: rotation,
        x: xOffset 
      }}
      whileHover={{ 
        y: -30, 
        scale: 1.05, 
        zIndex: 50,
        rotate: 0, 
        transition: { type: "spring", stiffness: 300 } 
      }}
      transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
      viewport={{ once: true }}
      className="absolute w-44 h-56 bg-white rounded-2xl shadow-2xl overflow-hidden border-[6px] border-white cursor-pointer group"
    >
      <img 
        src={category.icon} 
        alt={category.name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
    
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
        <p className="text-white font-bold text-sm">{category.name}</p>
        <p className="text-white/60 text-[10px] uppercase tracking-tighter">
          {category.count.toLocaleString()} items
        </p>
      </div>
    </motion.div>
  );
};

export default CategoryChip;