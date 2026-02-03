// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture
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
