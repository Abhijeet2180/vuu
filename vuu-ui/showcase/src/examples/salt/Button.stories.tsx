import { Button } from "@salt-ds/core";
import { CSSProperties } from "react";

export const DefaultButton = () => {
  const handleClick = () => {
    console.log("Button click");
  };
  return <Button onClick={handleClick}>Button</Button>;
};

export const IconButtons = () => {
  return (
    <div
      style={
        {
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          "--vuu-icon-size": "12px",
        } as CSSProperties
      }
    >
      <Button data-icon="filter" />
      <Button data-icon="filter">Filter</Button>
    </div>
  );
};
