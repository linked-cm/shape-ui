import React, { useState } from 'react';
import type { PropertyShapeWire } from '@_linked/core/shapes/nodeShapeWire';
import { Root, Image } from '@_linked/primitives/components/Avatar';

export interface AvatarEditorProps {
  of?: Record<string, any>;
  property?: PropertyShapeWire;
  /**
   *  Converts the value returned by the shape, to the input string for the avatar
   * @param shapePropertyValue
   * @returns
   */
  preConvertValueFn?: (shapePropertyValue: any) => string;
  /**
   * Converts the value of the avatar to a value that can be provided to the set method of the shape
   * @param inputValue
   * @returns
   */
  postConvertValueFn?: (inputValue: string) => any;
}

export const AvatarEditor = ({
  of,
  property,
  preConvertValueFn,
  postConvertValueFn,
  ...restProps
}: AvatarEditorProps) => {
  return (
    <Root>
      <Image />
    </Root>
  );
};
