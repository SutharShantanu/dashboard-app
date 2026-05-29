declare module "react-undraw-illustrations" {
  import { SVGProps } from "react";
  type IllustrationProps = SVGProps<SVGSVGElement> & { primaryColor?: string; height?: string };
  export function UndrawLogin(props: IllustrationProps): JSX.Element;
  export function UndrawEmpty(props: IllustrationProps): JSX.Element;
  const _default: Record<string, (props: IllustrationProps) => JSX.Element>;
  export default _default;
}
