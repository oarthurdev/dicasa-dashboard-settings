export function throwIfError(step: string, error: any) {
  if (!error) return;
  console.error(`[REPORT][${step}]`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
  });
  throw new Error(`Falha no passo: ${step} | ${error?.message || "Sem mensagem"}`);
}