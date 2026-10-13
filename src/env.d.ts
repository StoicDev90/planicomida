declare namespace App {
  interface Locals {
    /** Usuario de la sesión; lo carga el middleware (módulo identity). */
    user?: { id: number; email: string; name: string };
  }
}
