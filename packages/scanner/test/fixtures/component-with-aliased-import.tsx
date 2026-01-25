import React from "react";
import { Button as MyButton } from "./client-component";

export const ComponentWithAliasedImport = () => {
  return (
    <div>
      <h1>Aliased Import</h1>
      <MyButton appName="Scanner">Click me</MyButton>
    </div>
  );
};
