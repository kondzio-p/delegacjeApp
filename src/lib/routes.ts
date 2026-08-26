/** Ekran powitalny pokazywany po zalogowaniu i po rejestracji. */
export const WELCOME_PATH = "/witaj";

/**
 * Pulpit zalogowanego użytkownika.
 *
 * Nie jest pod `/`, bo tam mieszka strona powitalna dla niezalogowanych —
 * ktoś, kto dostaje link do aplikacji, musi najpierw dowiedzieć się, czym ona
 * jest, zanim zobaczy formularz logowania.
 */
export const DASHBOARD_PATH = "/panel";
