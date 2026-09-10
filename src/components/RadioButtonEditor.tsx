import React, { useEffect, useState } from 'react';
import type { PropertyShapeWire } from '@_linked/core/shapes/nodeShapeWire';
import { Root, Item, RadioGroup } from '@_linked/primitives/components/RadioGroup';
import styles from './RadioButtonEditor.module.css';
import { cl } from '@_linked/react/utils/ClassNames';

export interface RadioButtonProps {
  onValueChange?: (newValue) => void;
  of?: Record<string, any>;
  property?: PropertyShapeWire;
  children?: React.ReactNode;
  className?: string;
  /**
   *  Converts the value returned by the shape, to the radio input string for the radio input
   * @param shapePropertyValue
   * @returns
   */
  preConvertValueFn?: (shapePropertyValue: any) => string;
  /**
   * Converts the value of the radio input to a value that can be provided to the set method of the shape
   * @param radioInputValue
   * @returns
   */
  postConvertValueFn?: (radioInputValue: string) => any;
}

export const RadioButtonEditor: React.FC<RadioButtonProps> = ({
  onValueChange,
  of,
  property,
  preConvertValueFn,
  postConvertValueFn,
  children,
  className,
  ...props
}) => {
  const [labelHasLongString, setLabelHasLongString] = useState(false);

  const onChangeHandler = (newValue) => {
    if (!of) return;
    of[property.label] = newValue;

    if (onValueChange) {
      onValueChange(of[property.label]);
      // onValueChange(
      //   options.map((option) => {
      //     console.log(option, 'option');
      //     of[property.label] = newValue;
      //   }),
      // );
    }
  };

  useEffect(() => {
    //check if radio button label has a long string
    if (property.in) {
      const containsLongString = property.in.some((list) => {
        throw Error('TODO: property.in for RadioButtonEditor');
        // const wordCount = list.value.split(' ').length;
        // return wordCount > 5;
      });
      setLabelHasLongString(containsLongString);
    }
  }, [property.in]);

  // function cl(radioButtonField: any, arg1: any): string {
  //   throw new Error('Function not implemented.');
  // }

  console.log('of.label', of[property.label]);

  return (
    <>
      <RadioGroup.Root
        defaultValue="default"
        aria-label="View density"
        className={cl(styles.Root, labelHasLongString && styles.columnBased)}
      >
        {property.in ? (
          property.in.map((item) => (
            <label className={styles.radioButtonItem}>
              <RadioGroup.Item
                value={item.toString()}
                className={styles.radioButton}
              />
              TODO: item from property.in
              {/* {item.value.charAt(0).toUpperCase() + item.value.slice(1)} */}
            </label>
          ))
        ) : (
          <p>unimplemented single radio button</p>
        )}
      </RadioGroup.Root>
    </>
  );
};
