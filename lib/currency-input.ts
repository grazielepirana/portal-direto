export function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const numberValue = Number(digits);
  if (Number.isNaN(numberValue)) return "";
  return `R$ ${numberValue.toLocaleString("pt-BR")}`;
}

export function parseCurrencyInputToNumber(value: string) {
  const raw = value
    .replace(/[R$\s]/g, "")
    .replace(/[^\d,.-]/g, "")
    .trim();

  if (!raw) return null;

  const hasComma = raw.includes(",");
  const dotCount = (raw.match(/\./g) ?? []).length;

  let normalized = raw;

  if (hasComma) {
    // Padrão BR: pontos de milhar e vírgula decimal.
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (dotCount > 1) {
    // Vários pontos sem vírgula: assume pontos como milhar.
    normalized = raw.replace(/\./g, "");
  } else if (dotCount === 1) {
    const [left, right = ""] = raw.split(".");
    // Se tiver 1-2 casas após ponto, aceita como decimal.
    // Se tiver mais casas, trata ponto como separador de milhar.
    normalized = right.length <= 2 ? `${left}.${right}` : `${left}${right}`;
  }

  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

export function formatCurrencyFromNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "";
  return `R$ ${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function finalizeCurrencyInput(value: string) {
  const numberValue = parseCurrencyInputToNumber(value);
  return formatCurrencyFromNumber(numberValue);
}
