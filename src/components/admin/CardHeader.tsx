import React from 'react';

interface CardHeaderProps {
  fields: string[];
}

const CardHeader: React.FC<CardHeaderProps> = ({ fields }) => {
  return (
    <div className="bg-gray-100 rounded-lg p-4 mb-4 w-full sticky top-0 z-10 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pl-16">
        {/* First column has a placeholder for select/serial number area */}
        {fields.map((field, index) => (
          <div key={field} className="flex flex-col">
            <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              {field}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CardHeader; 