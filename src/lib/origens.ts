// Opções de origem do cliente (como conheceu a clínica).
// String livre no banco, mas padronizada na UI para permitir relatórios.
export const ORIGENS_CLIENTE = [
  "Indicação de amigo",
  "Indicação de outro cliente",
  "Google / Busca",
  "Instagram",
  "Facebook",
  "WhatsApp",
  "Fachada / Passou em frente",
  "Site",
  "Anúncio / Propaganda",
  "Cliente antigo",
  "Outro",
] as const;

export type OrigemCliente = (typeof ORIGENS_CLIENTE)[number];
