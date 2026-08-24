// Stałe wspólne dla akcji serwerowej i formularza. Nie mogą mieszkać
// w `actions/privacy.ts`, bo plik z „use server" eksportuje wyłącznie funkcje
// asynchroniczne.

/** Słowo, które trzeba przepisać, żeby potwierdzić usunięcie konta. */
export const DELETE_CONFIRMATION = "USUWAM";
