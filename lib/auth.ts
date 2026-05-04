// lib/auth.ts (PURE FRONTEND MODE)

export async function loginAdmin(email: string, password: string) {
  if (email === "admin@tfm.com" && password === "admin123") {
    localStorage.setItem("isAdmin", "true")
    return { email }
  }

  throw new Error("Invalid credentials")
}

export function logoutAdmin() {
  localStorage.removeItem("isAdmin")
}