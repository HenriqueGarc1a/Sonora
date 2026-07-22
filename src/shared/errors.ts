export function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : String(error || "Erro inesperado.");
}

export function friendlyError(error: unknown): string {
  const message = messageFrom(error);
  if (/cannot access|chrome:\/\/|edge:\/\/|extensions gallery/i.test(message)) {
    return "O Chrome não permite controlar o áudio desta página interna.";
  }
  if (/activeTab|permission|not been invoked|gesture/i.test(message)) {
    return "Feche e abra a Sonora novamente nesta guia.";
  }
  if (/capture|stream|media/i.test(message)) {
    return "Não consegui capturar esta guia. Confirme que ela está reproduzindo áudio e reabra a Sonora.";
  }
  return message || "Ocorreu um erro ao iniciar o áudio.";
}
