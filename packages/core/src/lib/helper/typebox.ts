import { type TString, Type } from "@sinclair/typebox";

/**
 * Builds a TypeBox string schema whose runtime `enum` matches the provided values.
 *
 * @typeParam T - Tuple of allowed string literals.
 * @param allowedValues - Literal values to expose as the schema enum.
 * @param options - Optional default value passed through to the TypeBox schema.
 * @returns A `Type.String` schema narrowed to the provided literal union.
 * @note Based on https://github.com/feathersjs/feathers/blob/3c3da6d688e62a1f832f549d3271c80ce3a47b01/packages/typebox/src/index.ts#L53
 */
export function StringEnum<T extends readonly string[]>(
  allowedValues: T,
  options?: { default: T[number] }
) {
  return Type.String({ ...options, enum: allowedValues as unknown as string[] }) as TString & {
    enum: T;
  } & { static: T[number] };
}
