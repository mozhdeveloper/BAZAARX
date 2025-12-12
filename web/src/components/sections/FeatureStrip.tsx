import React from 'react';
import { motion } from 'framer-motion';

interface FeatureStripProps {
  title: string;
  description: string;
  image: string;
  features: string[];
  buttonText: string;
  buttonAction?: () => void;
  reverse?: boolean;
}

const FeatureStrip: React.FC<FeatureStripProps> = ({
  title,
  description,
  image,
  features,
  buttonText,
  buttonAction,
  reverse = false
}) => {
  return (
    <section className="py-12 lg:py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className={`grid lg:grid-cols-2 gap-12 items-center ${reverse ? 'lg:grid-flow-col-dense' : ''}`}>
          
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: reverse ? 50 : -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className={reverse ? 'lg:col-start-2' : ''}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-[var(--text-primary)] mb-4">
              {title}
            </h2>
            <p className="text-lg text-[var(--text-secondary)] mb-8">
              {description}
            </p>
            
            <div className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 bg-[var(--brand-primary)] rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-[var(--text-primary)] font-medium">{feature}</span>
                </motion.div>
              ))}
            </div>
            
            <button 
              onClick={buttonAction}
              className="btn-primary"
            >
              {buttonText}
            </button>
          </motion.div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: reverse ? -50 : 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className={reverse ? 'lg:col-start-1' : ''}
          >
            <div className="relative">
              <img
                src={image}
                alt={title}
                className="w-full h-80 lg:h-96 object-cover rounded-2xl shadow-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl" />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default FeatureStrip;