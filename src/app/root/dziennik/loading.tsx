import { ListSkeleton } from "../skeletons";

/**
 * Granica ładowania ekranu — pozwala Next pobrać tę trasę zawczasu.
 *
 * Returns:
 *     ReactNode: Szkielet listy na czas ładowania.
 */
export default function Loading() {
  return <ListSkeleton rows={4} />;
}
