import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "spotify-audio": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
      };
    }
  }
}
