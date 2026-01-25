import dynamic from "next/dynamic";
import React from "react";

const LazyComponent = dynamic(() => import("./lazy-component"));
const ReactLazyComponent = React.lazy(() => import("./react-lazy-component"));

export const Component = () => (
  <div>
    <LazyComponent />
    <ReactLazyComponent />
  </div>
);
