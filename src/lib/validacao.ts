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

export const configuracoesSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do estabelecimento."),
  telefone: telefoneSchema,
  endereco: z.string().trim().min(4, "Informe o endereço."),
  corDestaque: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida."),
  antecedenciaMinMin: z.coerce.number().int().min(0).max(1440),
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
