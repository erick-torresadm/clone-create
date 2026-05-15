// Traduz mensagens de erro do Supabase Auth para PT-BR
export function translateAuthError(message: string | undefined | null, fallback = "Erro ao autenticar"): string {
  if (!message) return fallback;
  const m = message.toLowerCase();

  if (m.includes("password is known to be weak") || m.includes("pwned") || m.includes("known to be weak"))
    return "Essa senha é muito comum e fácil de adivinhar. Escolha uma senha diferente e mais segura.";
  if (m.includes("password should be at least"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("invalid login credentials"))
    return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed"))
    return "Confirme seu e-mail antes de entrar.";
  if (m.includes("user already registered") || m.includes("already registered"))
    return "Este e-mail já está cadastrado. Faça login.";
  if (m.includes("rate limit") || m.includes("too many requests"))
    return "Muitas tentativas. Aguarde um momento e tente novamente.";
  if (m.includes("invalid email"))
    return "E-mail inválido.";
  if (m.includes("network") || m.includes("failed to fetch"))
    return "Falha de conexão. Verifique sua internet e tente novamente.";

  return message;
}
