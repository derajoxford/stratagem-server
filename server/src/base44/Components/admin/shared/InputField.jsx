import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const InputField = ({ label, name, value, onChange, type = "number", description, className = "", step, placeholder, min, max }) => {
    const handleInputChange = (e) => {
        if (!onChange) return; // Guard against missing onChange handler

        const rawValue = e.target.value;
        let processedValue;

        if (type === 'number') {
            if (rawValue === '' || rawValue === null) {
                processedValue = null; // Represent empty field as null
            } else {
                const num = parseFloat(rawValue);
                processedValue = isNaN(num) ? 0 : num; // Default to 0 if parsing fails
            }
        } else {
            processedValue = rawValue;
        }
        
        onChange(name, processedValue);
    };

    // Ensure the value displayed in the input is always a string.
    const displayValue = (value === null || typeof value === 'undefined') ? '' : String(value);

    return (
        <div className="space-y-2">
            <Label htmlFor={name} className="text-slate-300">{label}</Label>
            <Input
                type={type}
                id={name}
                name={name}
                value={displayValue}
                onChange={handleInputChange}
                className={`bg-slate-700 border-slate-600 text-white ${className}`}
                step={step}
                placeholder={placeholder}
                min={min}
                max={max}
            />
            {description && <p className="text-xs text-slate-400">{description}</p>}
        </div>
    );
};
