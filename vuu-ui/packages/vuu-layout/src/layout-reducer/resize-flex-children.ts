import React, { CSSProperties, ReactElement } from "react";
import { dimension } from "../common-types";
import { followPath, getProps } from "../utils";
import { LayoutResizeAction, SplitterResizeAction } from "./layoutTypes";
import { swapChild } from "./replace-layout-element";

export function resizeFlexChild(
  layoutRoot: ReactElement,
  { path, size }: LayoutResizeAction
) {
  const target = followPath(layoutRoot, path, true);

  const { style } = getProps(target);

  console.log(`resize ${path} to ${size}`, {
    style,
  });

  const newStyle = {
    ...style,
    width: size,
  };

  // const dimension = style.flexDirection === "column" ? "height" : "width";
  // const replacementChildren = applySizesToChildren(children, sizes, dimension);

  const replacement = React.cloneElement(target, { style: newStyle });

  return swapChild(layoutRoot, target, replacement);
}

export function resizeFlexChildren(
  layoutRoot: ReactElement,
  { path, sizes }: SplitterResizeAction
) {
  const target = followPath(layoutRoot, path, true);
  const { children, style } = getProps(target);

  const dimension = style.flexDirection === "column" ? "height" : "width";
  const replacementChildren = applySizesToChildren(children, sizes, dimension);

  const replacement = React.cloneElement(
    target,
    undefined,
    replacementChildren
  );

  return swapChild(layoutRoot, target, replacement);
}

function applySizesToChildren(
  children: ReactElement[],
  sizes: { currentSize: number; flexBasis: number }[],
  dimension: dimension
) {
  return children.map((child, i) => {
    const {
      style: { [dimension]: size, flexBasis: actualFlexBasis },
    } = getProps(child);
    const meta = sizes[i];
    const { currentSize, flexBasis } = meta;
    const hasCurrentSize = currentSize !== undefined;
    const newSize = hasCurrentSize ? meta.currentSize : flexBasis;

    if (
      newSize === undefined ||
      size === newSize ||
      actualFlexBasis === newSize
    ) {
      return child;
    }
    return React.cloneElement(child, {
      style: applySizeToChild(child.props.style, dimension, newSize),
    });
  });
}

function applySizeToChild(
  style: CSSProperties,
  dimension: dimension,
  newSize: number
) {
  const hasSize = typeof style[dimension] === "number";
  const { flexShrink = 1, flexGrow = 1 } = style;
  return {
    ...style,
    [dimension]: hasSize ? newSize : "auto",
    flexBasis: hasSize ? "auto" : newSize,
    flexShrink,
    flexGrow,
  };
}
