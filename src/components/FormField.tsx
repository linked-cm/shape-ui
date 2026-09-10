import React from 'react';
import { Label } from '@_linked/primitives/components/Label';
import style from './FormField.module.css';
import { TextfieldEditor } from './TextfieldEditor.js'; // import input field that already connected with shape

interface FormFieldProps {
  of?;
  property?;
  label?: string;
  name?: string;
  type: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onChange?: (e: any) => void;
  onBlur?: (e: any) => void;
  value?: string | number;
  required?: boolean;
  defaultValue?;
}

const FormField = ({
  of,
  property,
  label,
  name,
  type,
  placeholder = '',
  className,
  onChange,
  value,
  required,
  onBlur,
  defaultValue,
  ...restProps
}: FormFieldProps) => {
  return (
    <div className={style.Root}>
      {label && <Label htmlFor={name}>{label}</Label>}
      <TextfieldEditor
        of={of}
        type={type}
        name={name}
        placeholder={placeholder}
        className={className}
        onChange={onChange}
        onBlur={onBlur}
        value={value}
        defaultValue={defaultValue}
        required={required}
        readOnly={false}
        disabled={false}
        {...restProps}
      />
    </div>
  );
};

export { FormField };
