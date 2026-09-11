import React, { useState } from 'react';
import type { PropertyShapeWire } from '@_linked/core/shapes/nodeShapeWire';
import { Root as Toggle } from '@_linked/primitives/components/Toggle';

export interface ToggleEditorProps {
  onPressedChange?: (e) => void;
  of?: Record<string, any>;
  property?: PropertyShapeWire;
  children: React.ReactNode;
  /**
   *  Converts the value returned by the shape, to the input string for the toggle
   * @param shapePropertyValue
   * @returns
   */
  preConvertValueFn?: (shapePropertyValue: any) => string;
  /**
   * Converts the value of the toggle to a value that can be provided to the set method of the shape
   * @param inputValue
   * @returns
   */
  postConvertValueFn?: (inputValue: string) => any;
}

export const ToggleEditor = ({
  onPressedChange,
  of,
  property,
  children,
  preConvertValueFn,
  postConvertValueFn,
  ...restProps
}: ToggleEditorProps) => {
  const onChangeHandler = (value) => {
    console.log(value, 'value toggle');
    if (!of) return;
    if (postConvertValueFn) {
      value = postConvertValueFn(value);
    }
    of[property.label] = value;
    console.log(of[property.label], 'of[property.label] toggle');

    if (onPressedChange) {
      onPressedChange(value);
    }
  };

  return (
    <Toggle
      pressed={of[property.label]}
      onPressedChange={onChangeHandler}
      defaultPressed={
        of
          ? preConvertValueFn
            ? preConvertValueFn(of[property.label])
            : of[property.label]
          : ''
      }
      {...restProps}
    >
      {children}
    </Toggle>
  );
};
