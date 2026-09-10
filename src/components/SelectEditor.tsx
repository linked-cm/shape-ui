import React, { useState } from 'react';
import type { PropertyShapeWire } from '@_linked/core/shapes/nodeShapeWire';
import {
  Root,
  Group,
  Value,
  Trigger,
  Content,
  Label,
  Item,
  Separator,
  ScrollUpButton,
  ScrollDownButton,
} from '@_linked/primitives/components/Select';

export interface SelectEditorProps {
  onValueChange?: (e) => void;
  of?: Record<string, any>;
  property?: PropertyShapeWire;
  /**
   *  Converts the value returned by the shape, to the input string for the select
   * @param shapePropertyValue
   * @returns
   */
  preConvertValueFn?: (shapePropertyValue: any) => string;
  /**
   * Converts the value of the select to a value that can be provided to the set method of the shape
   * @param inputValue
   * @returns
   */
  postConvertValueFn?: (inputValue: string) => any;
}

// interface RootSelectProps extend  {
//   of?: Record<string, any>;
//   property?: PropertyShapeWire;
// }
// const RootSelect = () => {
//   return <Root></Root>;
// };

export const SelectEditor = ({
  onValueChange,
  of,
  property,
  preConvertValueFn,
  postConvertValueFn,
  ...restProps
}: SelectEditorProps) => {
  const onChangeHandler = (value) => {
    console.log(value, 'value select');
    if (!of) return;
    if (postConvertValueFn) {
      value = postConvertValueFn(value);
    }
    of[property.label] = value;
    console.log(of[property.label], 'of[property.label] switch');

    if (onValueChange) {
      onValueChange(value);
    }
  };

  return (
    <Root
      value={of[property.label]}
      onValueChange={onChangeHandler}
      defaultValue={
        of
          ? preConvertValueFn
            ? preConvertValueFn(of[property.label])
            : of[property.label]
          : ''
      }
      {...restProps}
    >
      {/* <Trigger className="SelectTrigger" aria-label="Food">
        <Select.Value placeholder="Select a fruit…" />
        <Select.Icon className="SelectIcon">
          <ChevronDownIcon />
        </Select.Icon>
      </Trigger> */}
    </Root>
  );
};
