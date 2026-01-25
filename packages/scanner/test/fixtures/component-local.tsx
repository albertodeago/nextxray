const LocalButton = ({ children }: { children: any }) => (
  <button>{children}</button>
);

export const ComponentWithLocal = () => {
  return (
    <div>
      <LocalButton>Click me</LocalButton>
    </div>
  );
};
