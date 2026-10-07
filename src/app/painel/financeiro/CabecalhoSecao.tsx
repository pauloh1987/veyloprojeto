/** Título de uma seção do Financeiro, com a explicação curta embaixo e o total à direita. */
export function CabecalhoSecao({
  id,
  titulo,
  descricao,
  total,
}: {
  id: string;
  titulo: string;
  descricao: string;
  total?: string | null;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="font-heading text-lg font-bold text-text">
          {titulo}
        </h2>
        <p className="text-xs text-text-faint">{descricao}</p>
      </div>
      {total && <p className="shrink-0 font-heading text-xl font-extrabold text-text">{total}</p>}
    </div>
  );
}
