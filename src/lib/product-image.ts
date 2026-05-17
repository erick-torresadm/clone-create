import placeholder from "@/assets/product-placeholder.jpg";

/** Returns the product image URL or a branded placeholder when missing. */
export function productImage(src?: string | null): string {
  if (!src || src.trim() === "") return placeholder;
  return src;
}

export { placeholder as productPlaceholder };
