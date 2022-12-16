import React, { HTMLAttributes, MouseEvent, useCallback } from "react";
import { Column } from "./dataTableTypes";
import cx from "classnames";

import "./TableHeaderCell.css";

const classBase = "vuuTable-headerCell";

export interface TableHeaderCellProps
  extends HTMLAttributes<HTMLTableCellElement> {
  column: Column;
  debugString?: string;
  onDragStart?: (evt: MouseEvent) => void;
  onDragEnd?: () => void;
}

export const TableHeaderCell = ({
  column,
  className: classNameProp,
  onDragEnd,
  onDragStart,
  ...props
}: TableHeaderCellProps) => {
  const handleMouseDown = useCallback(
    (evt: MouseEvent) => {
      onDragStart?.(evt);
    },
    [onDragStart]
  );
  const handleMouseUp = useCallback(() => {
    onDragEnd?.();
  }, [onDragEnd]);

  const className = cx(classBase, classNameProp, {
    vuuPinLeft: column.pin === "left",
  });
  return (
    <th
      className={className}
      {...props}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {column.name}
    </th>
  );
};