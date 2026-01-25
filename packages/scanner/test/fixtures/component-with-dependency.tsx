import React from "react";
import { Button } from "./client-component";

export const ComponentWithDependency = () => {
  return (
    <div>
      <h1>Container</h1>
      <Button appName="Scanner">Click me</Button>
    </div>
  );
};
