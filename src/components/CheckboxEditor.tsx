import React, { useState } from 'react';
import type { PropertyShapeWire } from '@_linked/core/shapes/nodeShapeWire';
import { Checkbox } from '@_linked/primitives/components/Checkbox';
import style from './CheckboxEditor.module.css';

export interface CheckboxEditorProps {
  onCheckedChange?: (e) => void;
  of?: Record<string, any>;
  property?: PropertyShapeWire;

  /**
   *  Converts the value returned by the shape, to the input string for the checkbox
   * @param shapePropertyValue
   * @returns
   */
  preConvertValueFn?: (shapePropertyValue: any) => string;
  /**
   * Converts the value of the checkbox to a value that can be provided to the set method of the shape
   * @param inputValue
   * @returns
   */
  postConvertValueFn?: (inputValue: string) => any;
}

export const CheckboxEditor = ({
  onCheckedChange,
  of,
  property,
  preConvertValueFn,
  postConvertValueFn,
  ...restProps
}: CheckboxEditorProps) => {
  const currentValues = of[property.label];

  const onChangeHandler = (item, checked) => {
    if (!of) return;

    if (property.in) {
      if (checked) {
        currentValues.add(item);
      } else {
        currentValues.delete(item);
      }
    } else {
      of[property.label] = checked;
    }

    if (onCheckedChange) {
      onCheckedChange(currentValues);
    }
  };

  return (
    <>
      {property.in ? (
        property.in.map((item, i) => {
          return (
            <label className={style.Root}>
              <Checkbox
                value={of[property.label]}
                onCheckedChange={onChangeHandler.bind(this, item)}
                defaultChecked={currentValues.has(item)}
                {...restProps}
              />
              TODO: {item.toString()}
            </label>
          );
        })
      ) : (
        <div>checkbox usage unimplemented</div>
        // <Checkbox
        //   value={of[property.label]}
        //   onCheckedChange={onChangeHandler}
        //   defaultChecked={
        //     of
        //       ? preConvertValueFn
        //         ? preConvertValueFn(of[property.label])
        //         : of[property.label]
        //       : ''
        //   }
        //   {...restProps}
        // />
      )}
    </>
  );
};
