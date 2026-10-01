export interface ColunaGrafico {
  rotulo: string;
  partes: { valor: number; classe: string }[];
}

/** Barras verticais (empilhadas quando a coluna tem mais de uma parte), só com CSS. O total de
 * cada coluna aparece em cima da barra. */
export function GraficoBarras({
  colunas,
  legenda,
  descricao,
}: {
  colunas: ColunaGrafico[];
  legenda?: { nome: string; classe: string }[];
  descricao: string;
}) {
  const totais = colunas.map((coluna) => coluna.partes.reduce((soma, parte) => soma + parte.valor, 0));
  const maximo = Math.max(1, ...totais);

  return (
    <div>
      <div role="img" aria-label={descricao} className="flex h-36 items-end gap-1 sm:gap-2">
        {colunas.map((coluna, indice) => (
          <div key={coluna.rotulo} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-semibold text-text-muted sm:text-[11px]">{totais[indice]}</span>
            <div
              className="flex w-full max-w-10 flex-col-reverse overflow-hidden rounded-t-md bg-surface-2"
              style={{ height: `${Math.max((totais[indice] / maximo) * 100, totais[indice] > 0 ? 6 : 2)}%` }}
            >
              {coluna.partes.map((parte, i) => (
                <div
                  key={i}
                  className={parte.classe}
                  style={{ height: totais[indice] > 0 ? `${(parte.valor / totais[indice]) * 100}%` : "0%" }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1 sm:gap-2">
        {colunas.map((coluna) => (
          <span key={coluna.rotulo} className="min-w-0 flex-1 truncate text-center text-[10px] text-text-faint sm:text-[11px]">
            {coluna.rotulo}
          </span>
        ))}
      </div>
      {legenda && (
        <div className="mt-3 flex flex-wrap gap-3">
          {legenda.map((item) => (
            <span key={item.nome} className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className={`h-2.5 w-2.5 rounded-sm ${item.classe}`} aria-hidden />
              {item.nome}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
