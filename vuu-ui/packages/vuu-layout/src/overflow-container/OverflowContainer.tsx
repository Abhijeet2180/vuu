import React, {
  CSSProperties,
  ForwardedRef,
  forwardRef,
  HTMLAttributes,
} from "react";
import cx from "classnames";
import { PopupMenu } from "@finos/vuu-popups";
import { useOverflowContainer } from "./useOverflowContainer";
import { asReactElements } from "../utils";

import "./OverflowContainer.css";
import { OverflowItem } from "./overflow-utils";

const classBase = "vuuOverflowContainer";

export interface OverflowContainerProps extends HTMLAttributes<HTMLDivElement> {
  debugId?: string;
  height: number;
  onSwitchWrappedItemIntoView?: (overflowItem: OverflowItem) => void;
  overflowIcon?: string;
}

const InnerContainer = React.memo(
  ({
    children,
    height,
    onSwitchWrappedItemIntoView,
    overflowIcon,
  }: OverflowContainerProps) => {
    const { menuActionHandler, menuBuilder, rootRef } = useOverflowContainer({
      onSwitchWrappedItemIntoView,
    });
    // TODO measure the height
    const style = {
      "--overflow-container-height": `${height}px`,
    } as CSSProperties;

    return (
      <div className={`${classBase}-wrapContainer`} ref={rootRef} style={style}>
        {asReactElements(children).map((childEl, i) => {
          const {
            "data-overflow-priority": overflowPriority = "0",
            label = `Item ${i + 1}`,
          } = childEl.props;
          return (
            <div
              className={cx(`${classBase}-item`)}
              data-index={i}
              data-label={label}
              data-overflow-priority={overflowPriority}
              key={i}
            >
              {childEl}
            </div>
          );
        })}
        <div className={`${classBase}-OverflowIndicator`} data-index="overflow">
          <PopupMenu
            icon={overflowIcon}
            menuBuilder={menuBuilder}
            menuActionHandler={menuActionHandler}
          />
        </div>
      </div>
    );
  }
);

InnerContainer.displayName = "OverflowContainer.InnerContainer";

export const OverflowContainer = forwardRef(function OverflowContainer(
  {
    children,
    className,
    height = 44,
    onSwitchWrappedItemIntoView,
    overflowIcon,
    ...htmlAttributes
  }: OverflowContainerProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  return (
    <div
      {...htmlAttributes}
      className={cx(cx(classBase, className))}
      ref={forwardedRef}
    >
      <InnerContainer
        height={height}
        overflowIcon={overflowIcon}
        onSwitchWrappedItemIntoView={onSwitchWrappedItemIntoView}
      >
        {children}
      </InnerContainer>
    </div>
  );
});
