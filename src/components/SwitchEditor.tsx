import React, { useState } from 'react';
import type { PropertyShapeWire } from '@_linked/core/shapes/nodeShapeWire';
import { Switch } from '@_linked/primitives/components/Switch';

export interface SwitchEditorProps {
  onCheckedChange?: (e) => void;
  of?: Record<string, any>;
  property?: PropertyShapeWire;

  /**
   *  Converts the value returned by the shape, to the input string for the switch
   * @param shapePropertyValue
   * @returns
   */
  preConvertValueFn?: (shapePropertyValue: any) => string;
  /**
   * Converts the value of the switch to a value that can be provided to the set method of the shape
   * @param inputValue
   * @returns
   */
  postConvertValueFn?: (inputValue: string) => any;
}

export const SwitchEditor = ({
  onCheckedChange,
  of,
  property,
  preConvertValueFn,
  postConvertValueFn,
  ...restProps
}: SwitchEditorProps) => {
  const onChangeHandler = (value) => {
    console.log(value, 'value switch');
    if (!of) return;
    if (postConvertValueFn) {
      value = postConvertValueFn(value);
    }
    of[property.label] = value;
    console.log(of[property.label], 'of[property.label] switch');

    if (onCheckedChange) {
      onCheckedChange(value);
    }
  };

  return (
    <Switch
      value={of[property.label]}
      onCheckedChange={onChangeHandler}
      defaultChecked={
        of
          ? preConvertValueFn
            ? preConvertValueFn(of[property.label])
            : of[property.label]
          : ''
      }
      {...restProps}
    />
  );
};
