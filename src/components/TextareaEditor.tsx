import React, { useState } from 'react';
import { Textarea } from '@_linked/primitives/components/Textarea';

export interface TextareaEditorProps {
  onChange?: (e) => void;
  value?: string[];
  of?: Record<string, any>;
  property?: string;
  children?;
  className?;
  /**
   *  Converts the value returned by the shape, to the text area string for the text area
   * @param shapePropertyValue
   * @returns
   */
  preConvertValueFn?: (shapePropertyValue: any) => string;
  /**
   * Converts the value of the text area to a value that can be provided to the set method of the shape
   * @param textAreaValue
   * @returns
   */
  postConvertValueFn?: (textAreaValue: string) => any;
}
export const TextareaEditor = ({
  onChange,
  value,
  of,
  property,
  preConvertValueFn,
  postConvertValueFn,
  children,
  className,
  ...props
}: TextareaEditorProps) => {
  const onChangeHandler = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <Textarea
      onChange={onChangeHandler}
      defaultValue={
        of
          ? preConvertValueFn
            ? preConvertValueFn(of[property])
            : of[property]
          : ''
      }
      value={value}
      {...props}
    />
  );
};
