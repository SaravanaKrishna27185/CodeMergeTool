/// <reference types="react" />
/// <reference types="react-dom" />

declare namespace React {
  interface HTMLAttributes<T> {
    className?: string;
  }

  interface ReactNode {}

  interface ReactElement {}
}

declare module "react" {
  export = React;
  export as namespace React;
}

declare module "react-dom" {
  export = ReactDOM;
  export as namespace ReactDOM;
}
