import Image, { type ImageProps } from "next/image";

type IconProps = {
  name: string;
  width?: number;
  height?: number;
  className?: string;
} & Partial<Pick<ImageProps, "unoptimized">>;

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z0-9])/g, "$1-$2")
    .replace(/([0-9])([a-zA-Z])/g, "$1-$2")
    .toLowerCase();
}

export default function Icon({ name, width = 24, height = 24, className, unoptimized }: IconProps) {
  const kebabName = toKebabCase(name);
  
  return (
    <Image
      src={`https://thesvg.org/icons/${kebabName}/default.svg`}
      alt={name}
      width={width}
      height={height}
      className={className}
      unoptimized={unoptimized}
    />
  );
}