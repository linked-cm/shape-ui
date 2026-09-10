import React, { useState } from 'react';
import { Input, InputProps } from '@_linked/primitives/components/Input';

export interface TextfieldProps extends InputProps {
  onChange?: (e) => void;
  value?: number | string;
  helperText?: string;
  of?: Record<string, any>;
  valueProperty?: string;
  property?;

  /**
   *  Converts the value returned by the shape, to the input string for the input field
   * @param shapePropertyValue
   * @returns
   */
  preConvertValueFn?: (shapePropertyValue: any) => string;
  /**
   * Converts the value of the input field to a value that can be provided to the set method of the shape
   * @param inputValue
   * @returns
   */
  postConvertValueFn?: (inputValue: string) => any;
}
export const TextfieldEditor = ({
  onChange,
  value,
  of,
  property,
  valueProperty,
  preConvertValueFn,
  postConvertValueFn,
  ...restProps
}: TextfieldProps) => {
  const onBlur = (e) => {
    let value = e.currentTarget.value;
    if (!of) return;
    if (postConvertValueFn) {
      value = postConvertValueFn(value);
    }
    of[property.label] = value;
    console.log('of', of);
    console.log('value', value);
  };

  const onChangeHandler = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <Input
      value={value}
      onChange={onChangeHandler}
      defaultValue={
        of
          ? preConvertValueFn
            ? preConvertValueFn(of[property.label])
            : of[property.label]
          : ''
      }
      onBlur={onBlur}
      {...restProps}
    />
  );
};
