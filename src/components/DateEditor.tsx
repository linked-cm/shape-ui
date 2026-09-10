import React, { useState } from 'react';

export interface DateEditorProps {
  onChange?: (e) => void;
  of?: Record<string, any>;
  property?: string;
  /**
   *  Converts the value returned by the shape, to the date string for the date field
   * @param shapePropertyValue
   * @returns
   */
  preConvertValueFn?: (shapePropertyValue: any) => string;
  /**
   * Converts the value of the date field to a value that can be provided to the set method of the shape
   * @param inputValue
   * @returns
   */
  postConvertValueFn?: (inputValue: string) => any;
}

export const DateEditor = ({
  onChange,
  of,
  property,
  preConvertValueFn,
  postConvertValueFn,

  ...restProps
}: DateEditorProps) => {
  const onChangeHandler = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <></>
    // <Input
    //   onChange={onChangeHandler}
    //   defaultValue={
    //     of
    //       ? preConvertValueFn
    //         ? preConvertValueFn(of[property])
    //         : of[property]
    //       : ''
    //   }
    //   {...restProps}
    // />
  );
};
