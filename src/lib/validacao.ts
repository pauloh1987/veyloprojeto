import { z } from "zod";
import { telefoneValido, somenteDigitos } from "@/lib/formatadores";

const REGEX_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;
const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;

export const telefoneSchema = z
  .string()
  .min(1, "Informe o telefone.")
  .refine(telefoneValido, "Telefone inválido. Use DDD + número.")
  .transform((valor) => somenteDigitos(valor));

export const loginSchema = z.object({
  email: z.string().min(1, "Informe o e-mail.").email("E-mail inválido."),
  senha: z.string().min(1, "Informe a senha."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const clienteSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome completo."),
  telefone: telefoneSchema,
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  observacoes: z.string().max(2000).optional().or(z.literal("")),
});
export type ClienteInput = z.infer<typeof clienteSchema>;

export const servicoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do serviço."),
  descricao: z.string().trim().max(500).optional().or(z.literal("")),
  duracaoMin: z.coerce.number().int().min(5, "Duração mínima de 5 minutos.").max(600),
  precoCentavos: z.coerce.number().int().min(0, "Preço não pode ser negativo."),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida."),
  ativo: z.coerce.boolean().default(true),
  profissionaisIds: z.array(z.string().min(1)).min(1, "Selecione ao menos uma profissional."),
});
export type ServicoInput = z.infer<typeof servicoSchema>;

export const horarioDiaSchema = z.object({
  profissionalId: z.string().min(1),
  diaSemana: z.coerce.number().int().min(0).max(6),
  fechado: z.coerce.boolean(),
  abre: z.string().regex(REGEX_HORA, "Hora inválida."),
  fecha: z.string().regex(REGEX_HORA, "Hora inválida."),
  almocoInicio: z
    .union([z.string().regex(REGEX_HORA), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
  almocoFim: z
    .union([z.string().regex(REGEX_HORA), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
});
export type HorarioDiaInput = z.infer<typeof horarioDiaSchema>;

export const bloqueioSchema = z
  .object({
    profissionalId: z.string().min(1, "Selecione a profissional."),
    data: z.string().regex(REGEX_DATA, "Data inválida."),
    horaInicio: z.string().regex(REGEX_HORA, "Hora inválida."),
    horaFim: z.string().regex(REGEX_HORA, "Hora inválida."),
    motivo: z.string().trim().min(1, "Informe o motivo."),
  })
  .refine((dados) => dados.horaInicio < dados.horaFim, {
    message: "O horário final deve ser depois do inicial.",
    path: ["horaFim"],
  });
export type BloqueioInput = z.infer<typeof bloqueioSchema>;

// O logo é enviado já redimensionado/recodificado em PNG pelo navegador (ver
// ConfiguracoesClient) e guardado como data URL direto na coluna `foto` — evita depender de
// um serviço de armazenamento de arquivos externo só para um logo pequeno. O limite de
// tamanho aqui é a rede de segurança do lado do servidor (o cliente já limita bem antes disso).
const REGEX_LOGO_DATA_URL = /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/;

export const configuracoesSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do estabelecimento."),
  telefone: telefoneSchema,
  endereco: z.string().trim().min(4, "Informe o endereço."),
  corDestaque: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida."),
  antecedenciaMinMin: z.coerce.number().int().min(0).max(1440),
  plano: z.enum(["SOLO", "EQUIPE"]),
  foto: z
    .string()
    .max(500_000, "Imagem muito grande. Escolha uma menor ou mais simples.")
    .refine((v) => v === "" || REGEX_LOGO_DATA_URL.test(v), "Formato de imagem inválido.")
    .transform((v) => (v === "" ? null : v)),
});
export type ConfiguracoesInput = z.infer<typeof configuracoesSchema>;

export const novoAgendamentoPublicoSchema = z.object({
  profissionalId: z.string().min(1, "Selecione a profissional."),
  servicoId: z.string().min(1, "Selecione o serviço."),
  inicioIso: z.string().datetime({ message: "Horário inválido." }),
  nome: z.string().trim().min(2, "Informe seu nome completo."),
  telefone: telefoneSchema,
});
export type NovoAgendamentoPublicoInput = z.infer<typeof novoAgendamentoPublicoSchema>;

export const novoAgendamentoManualSchema = z.object({
  profissionalId: z.string().min(1, "Selecione a profissional."),
  servicoId: z.string().min(1, "Selecione o serviço."),
  inicioIso: z.string().datetime({ message: "Horário inválido." }),
  clienteId: z.string().min(1).optional(),
  clienteNome: z.string().trim().min(2).optional(),
  clienteTelefone: telefoneSchema.optional(),
  observacao: z.string().max(500).optional().or(z.literal("")),
});
export type NovoAgendamentoManualInput = z.infer<typeof novoAgendamentoManualSchema>;

export const atualizarStatusAgendamentoSchema = z.object({
  agendamentoId: z.string().min(1),
  status: z.enum(["PENDENTE", "CONFIRMADO", "ATENDIDO", "FALTOU", "CANCELADO"]),
});
export type AtualizarStatusAgendamentoInput = z.infer<typeof atualizarStatusAgendamentoSchema>;

export const alternarArquivadoServicoSchema = z.object({
  servicoId: z.string().min(1),
  ativo: z.boolean(),
});

export const idSchema = z.string().min(1, "Identificador inválido.");

const REGEX_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PALAVRAS_RESERVADAS = new Set([
  "login", "cadastro", "painel", "api", "_next", "favicon.ico", "icon.png", "admin",
]);

export const cadastroSchema = z.object({
  nomeEstabelecimento: z.string().trim().min(2, "Informe o nome do seu negócio.").max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Pelo menos 3 caracteres.")
    .max(50)
    .regex(REGEX_SLUG, "Use só letras minúsculas, números e hífen (ex: studio-da-ana).")
    .refine((v) => !PALAVRAS_RESERVADAS.has(v), "Esse endereço é reservado. Escolha outro."),
  plano: z.enum(["SOLO", "EQUIPE"]),
  nomeDono: z.string().trim().min(2, "Informe seu nome.").max(80),
  email: z.string().trim().toLowerCase().min(1, "Informe o e-mail.").email("E-mail inválido."),
  senha: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
  telefone: telefoneSchema,
  endereco: z.string().trim().min(4, "Informe o endereço.").max(200),
});
export type CadastroInput = z.infer<typeof cadastroSchema>;

const comissaoPercentualSchema = z
  .union([z.coerce.number().int().min(0, "Entre 0 e 100.").max(100, "Entre 0 e 100."), z.literal("")])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

export const novoProfissionalSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(80),
  criarLogin: z.coerce.boolean().default(false),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").optional().or(z.literal("")),
  senha: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres.").optional().or(z.literal("")),
  comissaoPercentual: comissaoPercentualSchema,
});
export type NovoProfissionalInput = z.infer<typeof novoProfissionalSchema>;

export const atualizarComissaoSchema = z.object({
  profissionalId: idSchema,
  comissaoPercentual: comissaoPercentualSchema,
});
export type AtualizarComissaoInput = z.infer<typeof atualizarComissaoSchema>;
