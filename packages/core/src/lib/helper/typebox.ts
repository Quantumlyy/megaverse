import { Type } from "@sinclair/typebox";

/**
 * A TypeBox utility that converts an array of provided strings into a string enum.
 * @param allowedValues array of strings for the enum
 * @returns TypeBox.Type
 * @note Based on https://github.com/feathersjs/feathers/blob/3c3da6d688e62a1f832f549d3271c80ce3a47b01/packages/typebox/src/index.ts#L53
 */
export function StringEnum<T extends readonly string[]>(
  allowedValues: T,
  options?: { default: T[number] }
) {
  return Type.Unsafe<T[number]>({
    type: "string",
    enum: allowedValues,
    ...options,
  });
}
