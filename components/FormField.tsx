
import React from 'react';
import { AlertTriangleIcon } from './icons';

interface FormFieldProps {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'select';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  rows?: number;
  error?: string;
  warning?: string;
}

const FormField: React.FC<FormFieldProps> = ({ id, label, type, value, onChange, required, options, placeholder, rows, error, warning }) => {
  const commonProps = {
    id,
    name: id,
    value,
    onChange,
    required,
    placeholder,
    className: `bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white ${error ? 'border-red-500' : ''} ${warning ? 'border-yellow-500' : ''}`
  };

  const renderInput = () => {
    if (type === 'textarea') {
      return <textarea {...commonProps} rows={rows}></textarea>;
    }
    if (type === 'select') {
      return (
        <select {...commonProps}>
          {options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      );
    }
    return <input type={type} {...commonProps} />;
  };

  return (
    <div>
      <label htmlFor={id} className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {renderInput()}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {warning && <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1"><AlertTriangleIcon className="w-3 h-3"/> {warning}</p>}
    </div>
  );
};

export default FormField;
