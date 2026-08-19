import { isValidSpaceToken } from "@denn/firebase/space-read";

export type SpaceLink =
  | { readonly kind: "inactive" }
  | { readonly kind: "invalid" }
  | { readonly kind: "valid"; readonly token: string };

export function readSpaceLink(search: unknown): SpaceLink {
  if (typeof search !== "string") return { kind: "invalid" };
  try {
    const values = new URLSearchParams(search).getAll("space");
    if (values.length === 0) return { kind: "inactive" };
    if (values.length !== 1 || !isValidSpaceToken(values[0])) return { kind: "invalid" };
    return { kind: "valid", token: values[0] };
  } catch {
    return { kind: "invalid" };
  }
}
