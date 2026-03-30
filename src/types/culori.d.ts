declare module "culori" {
  type Color = Record<string, number | undefined> & { mode: string };

  /** Named CSS colors — keys are lowercase color names, values are numeric RGB integers. */
  const colorsNamed: Record<string, number>;

  /** Returns a difference function measuring Euclidean distance between two colors. */
  function differenceEuclidean(): (a: Color | string, b: Color | string) => number;

  /**
   * Returns a nearest-neighbor lookup function.
   * @param colors - The collection to search against.
   * @param metric - A difference function (e.g. differenceEuclidean()).
   * @param accessor - Maps each item in `colors` to a color value for comparison.
   */
  function nearest<T>(
    colors: T[],
    metric: (a: Color | string, b: Color | string) => number,
    accessor?: (item: T) => Color | string,
  ): (color: Color | string, n?: number, maxDistance?: number) => T[];

  /** Parses a CSS color string into a Color object, or undefined if unparseable. */
  function parse(color: string): Color | undefined;

  /** Formats a Color (or string) as a lowercase hex string (e.g. "#ff5733"). */
  function formatHex(color: Color | string): string;
}
