function formatarDataIcs(data: Date): string {
  return data.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escaparTextoIcs(texto: string): string {
  return texto.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}

export function gerarIcs(params: {
  titulo: string;
  descricao: string;
  localizacao: string;
  inicio: Date;
  fim: Date;
  uid: string;
}): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Veylo Agenda//PT-BR",
    "BEGIN:VEVENT",
    `UID:${params.uid}@veylo-agenda`,
    `DTSTAMP:${formatarDataIcs(new Date())}`,
    `DTSTART:${formatarDataIcs(params.inicio)}`,
    `DTEND:${formatarDataIcs(params.fim)}`,
    `SUMMARY:${escaparTextoIcs(params.titulo)}`,
    `DESCRIPTION:${escaparTextoIcs(params.descricao)}`,
    `LOCATION:${escaparTextoIcs(params.localizacao)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function baixarArquivo(nomeArquivo: string, conteudo: string, tipoMime: string): void {
  const blob = new Blob([conteudo], { type: tipoMime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
