/** Ekran powitalny pokazywany po zalogowaniu i po rejestracji. */
export const WELCOME_PATH = "/witaj";

/** Pulpit; pod `/` mieszka strona powitalna dla niezalogowanych. */
export const DASHBOARD_PATH = "/panel";

/** Panel administracyjny aplikacji — wyłącznie dla konta root. */
export const ROOT_PATH = "/root";

/**
 * Ekran, na który trafia konto po zalogowaniu.
 *
 * Root nie ma w aplikacji żadnych własnych danych, więc pulpit pokazywałby mu
 * same zera — jego miejscem jest panel administracyjny.
 *
 * Args:
 *     user ({ is_root: boolean }): Zalogowane konto.
 *
 * Returns:
 *     string: Ścieżka startowa dla tego konta.
 */
export function homePathFor(user: { is_root: boolean }): string {
  return user.is_root ? ROOT_PATH : DASHBOARD_PATH;
}
