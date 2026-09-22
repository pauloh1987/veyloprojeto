import "dotenv/config";
import type { StatusAgendamento, OrigemAgendamento } from "@prisma/client";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { db as prisma } from "../src/lib/db";
import { hashSenha } from "../src/lib/senha";
import { calcularHorariosDisponiveis, type ConfigDiaTrabalho, type FaixaHoraria } from "../src/lib/agenda/disponibilidade";
import { paraDataYMD, somarDias, diaDaSemana } from "../src/lib/tz";
import { textoConfirmacao, textoLembrete } from "../src/lib/mensagens/textos";

const FUSO = "America/Recife";

// RNG determinístico (mulberry32) para que o seed seja reproducível entre execuções.
function criarRng(sementeInicial: number) {
  let semente = sementeInicial;
  return function rng(): number {
    semente |= 0;
    semente = (semente + 0x6d2b79f5) | 0;
    let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = criarRng(20260909);

function escolher<T>(lista: T[]): T {
  return lista[Math.floor(rng() * lista.length)];
}
function inteiroEntre(min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}
function comProbabilidade(p: number): boolean {
  return rng() < p;
}

function tentativasDoDia(passado: boolean): number {
  const r = rng();
  if (passado) {
    if (r < 0.55) return 0;
    if (r < 0.85) return 1;
    if (r < 0.97) return 2;
    return 3;
  }
  if (r < 0.65) return 0;
  if (r < 0.93) return 1;
  return 2;
}

async function limparBanco() {
  await prisma.mensagem.deleteMany();
  await prisma.agendamento.deleteMany();
  await prisma.bloqueio.deleteMany();
  await prisma.servicoProfissional.deleteMany();
  await prisma.horarioFuncionamento.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.servico.deleteMany();
  await prisma.sessao.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.profissional.deleteMany();
  await prisma.estabelecimento.deleteMany();
  await prisma.relogioSimulado.deleteMany();
}

const NOMES_CLIENTES = [
  "Maria Eduarda Silva", "Francisca das Chagas Souza", "Antônia Beatriz Lima", "Juliana Cavalcanti Melo",
  "Márcia Regina Santos", "Fernanda Costa Barros", "Patrícia Gomes Andrade", "Aline Ferreira Dias",
  "Sandra Maria Rocha", "Camila Nascimento Alves", "Amanda Cristina Pereira", "Bruna Oliveira Teixeira",
  "Jéssica Ribeiro Monteiro", "Letícia Farias Correia", "Vanessa Moura Azevedo", "Simone Cordeiro Brito",
  "Rita de Cássia Freitas", "Cristina Vieira Nunes", "Rosana Barbosa Carvalho", "Roberta Lins Cavalcanti",
  "João Pedro Silva", "José Carlos Santos", "Antônio Marcos Oliveira", "Francisco das Chagas Souza",
  "Carlos Eduardo Lima Filho", "Paulo Roberto Pereira", "Pedro Henrique Costa", "Lucas Gabriel Barros",
  "Marcos Vinícius Andrade", "Rafael Augusto Dias", "Daniel Alves Rocha", "Bruno César Nascimento",
  "Eduardo Luiz Teixeira", "Felipe Cordeiro Melo", "Gabriel Henrique Monteiro", "Thiago Farias Correia",
  "Diego Moura Azevedo", "Anderson Brito Freitas", "Rodrigo Nunes Vieira", "Vitor Hugo Cavalcanti",
];

const NOTAS_CLIENTES = [
  "Prefere esmalte em tons de vermelho.",
  "Alérgica a acetona comum, usar removedor sem acetona.",
  "Cliente antiga, sempre pontual.",
  "Prefere horários pela manhã.",
  "Gosta de conversar sobre viagens durante o atendimento.",
  "Costuma trazer a filha pequena junto.",
  "Prefere corte bem curto na lateral.",
  "Sensível no couro cabeludo, avisar antes de qualquer produto novo.",
];

function telefonePE(indice: number): string {
  const numero = String((80000000 + indice * 9973) % 90000000).padStart(8, "0");
  return `(81) 9${numero.slice(0, 4)}-${numero.slice(4)}`;
}

function proximoDiaDaSemana(dataBaseYMD: string, alvoDiaSemana: number): string {
  for (let i = 0; i < 14; i++) {
    const candidato = somarDias(dataBaseYMD, i);
    if (diaDaSemana(candidato) === alvoDiaSemana) return candidato;
  }
  return dataBaseYMD;
}

interface ProfissionalContexto {
  id: string;
  nome: string;
  estabelecimentoId: string;
  fuso: string;
  clientesIds: string[];
  servicos: { id: string; duracaoMin: number }[];
  horarios: Map<number, ConfigDiaTrabalho | null>;
  bloqueios: FaixaHoraria[];
}

function preferirHorarioDePico(slots: Date[]): Date {
  const pico = slots.filter((slot) => {
    const hora = Number(formatInTimeZone(slot, FUSO, "H"));
    return (hora >= 9 && hora < 11) || (hora >= 15 && hora < 17);
  });
  const usarPico = pico.length > 0 && comProbabilidade(0.65);
  return escolher(usarPico ? pico : slots);
}

function escolherStatus(passado: boolean): StatusAgendamento {
  const r = rng();
  if (passado) {
    if (r < 0.75) return "ATENDIDO";
    if (r < 0.88) return "FALTOU";
    return "CANCELADO";
  }
  if (r < 0.65) return "CONFIRMADO";
  if (r < 0.9) return "PENDENTE";
  return "CANCELADO";
}

async function main() {
  console.log("Limpando banco...");
  await limparBanco();

  const hoje = paraDataYMD(new Date(), FUSO);

  // ---------- Estabelecimento 1: Studio Ana Nails ----------
  const studioAna = await prisma.estabelecimento.create({
    data: {
      nome: "Studio Ana Nails",
      slug: "studio-ana-nails",
      telefone: "(81) 98877-1234",
      endereco: "Rua do Amparo, 245 - Sítio Histórico, Olinda - PE",
      fuso: FUSO,
      corDestaque: "#D94E7F",
      plano: "SOLO",
      antecedenciaMinMin: 120,
    },
  });

  const ana = await prisma.profissional.create({
    data: { nome: "Ana Paula Cavalcanti", ativo: true, estabelecimentoId: studioAna.id },
  });

  await prisma.usuario.create({
    data: {
      nome: "Ana Paula Cavalcanti",
      email: "ana@studio.com",
      senhaHash: hashSenha("123456"),
      papel: "DONO",
      estabelecimentoId: studioAna.id,
      profissionalId: ana.id,
    },
  });

  const servicosAnaDef = [
    { nome: "Esmaltação em gel", descricao: "Esmaltação em gel com acabamento duradouro.", duracaoMin: 45, precoCentavos: 3500, cor: "#D94E7F" },
    { nome: "Alongamento em fibra de vidro", descricao: "Alongamento das unhas com fibra, acabamento natural.", duracaoMin: 150, precoCentavos: 14000, cor: "#8E5CD9" },
    { nome: "Manicure e pedicure", descricao: "Cuidado completo para mãos e pés.", duracaoMin: 75, precoCentavos: 5500, cor: "#E0A83E" },
    { nome: "Spa dos pés", descricao: "Esfoliação, hidratação e massagem para os pés.", duracaoMin: 60, precoCentavos: 4500, cor: "#4E9AD9" },
  ];
  const servicosAna = [];
  for (const def of servicosAnaDef) {
    const servico = await prisma.servico.create({ data: { ...def, ativo: true, estabelecimentoId: studioAna.id } });
    await prisma.servicoProfissional.create({ data: { servicoId: servico.id, profissionalId: ana.id } });
    servicosAna.push(servico);
  }

  // Terça a sexta 09-18 (almoço 12-13), sábado 08-14 sem almoço, domingo e segunda fechado.
  for (let dia = 0; dia <= 6; dia++) {
    if (dia === 0 || dia === 1) {
      await prisma.horarioFuncionamento.create({
        data: { profissionalId: ana.id, diaSemana: dia, abre: "09:00", fecha: "18:00", fechado: true },
      });
    } else if (dia === 6) {
      await prisma.horarioFuncionamento.create({
        data: { profissionalId: ana.id, diaSemana: dia, abre: "08:00", fecha: "14:00", fechado: false },
      });
    } else {
      await prisma.horarioFuncionamento.create({
        data: { profissionalId: ana.id, diaSemana: dia, abre: "09:00", fecha: "18:00", almocoInicio: "12:00", almocoFim: "13:00", fechado: false },
      });
    }
  }

  const bloqueiosAnaData = [
    { dataYMD: proximoDiaDaSemana(somarDias(hoje, 1), 3), horaInicio: "14:00", horaFim: "16:00", motivo: "Consulta médica" },
    { dataYMD: proximoDiaDaSemana(somarDias(hoje, 8), 5), horaInicio: "09:00", horaFim: "18:00", motivo: "Curso de nail art" },
  ];
  const bloqueiosAna: FaixaHoraria[] = [];
  for (const b of bloqueiosAnaData) {
    const registro = await prisma.bloqueio.create({
      data: {
        profissionalId: ana.id,
        inicio: dataHoraParaInstante(b.dataYMD, b.horaInicio),
        fim: dataHoraParaInstante(b.dataYMD, b.horaFim),
        motivo: b.motivo,
      },
    });
    bloqueiosAna.push({ inicio: registro.inicio, fim: registro.fim });
  }

  const nomesClientesAna = NOMES_CLIENTES.slice(0, 20);
  const clientesAnaIds: string[] = [];
  for (let i = 0; i < nomesClientesAna.length; i++) {
    const cliente = await prisma.cliente.create({
      data: {
        nome: nomesClientesAna[i],
        telefone: telefonePE(i),
        estabelecimentoId: studioAna.id,
        observacoes: comProbabilidade(0.25) ? escolher(NOTAS_CLIENTES) : null,
      },
    });
    clientesAnaIds.push(cliente.id);
  }

  // ---------- Estabelecimento 2: Barbearia Norte ----------
  const barbearia = await prisma.estabelecimento.create({
    data: {
      nome: "Barbearia Norte",
      slug: "barbearia-norte",
      telefone: "(81) 97766-5544",
      endereco: "Av. Conselheiro Aguiar, 1810 - Boa Viagem, Recife - PE",
      fuso: FUSO,
      corDestaque: "#2F6B4F",
      plano: "EQUIPE",
      antecedenciaMinMin: 120,
    },
  });

  const carlos = await prisma.profissional.create({ data: { nome: "Carlos Eduardo Lima", ativo: true, estabelecimentoId: barbearia.id } });
  const joao = await prisma.profissional.create({ data: { nome: "João Victor Souza", ativo: true, estabelecimentoId: barbearia.id } });
  const marcos = await prisma.profissional.create({ data: { nome: "Marcos Paulo Ferreira", ativo: true, estabelecimentoId: barbearia.id } });

  await prisma.usuario.create({
    data: {
      nome: "Carlos Eduardo Lima", email: "carlos@barbearianorte.com", senhaHash: hashSenha("123456"),
      papel: "DONO", estabelecimentoId: barbearia.id, profissionalId: carlos.id,
    },
  });
  await prisma.usuario.create({
    data: {
      nome: "João Victor Souza", email: "joao@barbearianorte.com", senhaHash: hashSenha("123456"),
      papel: "PROFISSIONAL", estabelecimentoId: barbearia.id, profissionalId: joao.id,
    },
  });

  const servicosBarbeariaDef = [
    { nome: "Corte masculino", descricao: "Corte de cabelo masculino, do clássico ao moderno.", duracaoMin: 30, precoCentavos: 3500, cor: "#3E6BD9" },
    { nome: "Barba completa", descricao: "Barba alinhada com toalha quente e navalha.", duracaoMin: 30, precoCentavos: 3000, cor: "#D9A23E" },
    { nome: "Corte + barba", descricao: "Combo de corte e barba com preço especial.", duracaoMin: 60, precoCentavos: 6000, cor: "#3EA05C" },
    { nome: "Sobrancelha na navalha", descricao: "Design de sobrancelha masculina na navalha.", duracaoMin: 15, precoCentavos: 1500, cor: "#8A8A8A" },
  ];
  const servicosBarbearia = [];
  for (const def of servicosBarbeariaDef) {
    const servico = await prisma.servico.create({ data: { ...def, ativo: true, estabelecimentoId: barbearia.id } });
    servicosBarbearia.push(servico);
  }
  const [corte, barba, corteEBarba, sobrancelha] = servicosBarbearia;
  for (const prof of [carlos, joao]) {
    for (const servico of servicosBarbearia) {
      await prisma.servicoProfissional.create({ data: { servicoId: servico.id, profissionalId: prof.id } });
    }
  }
  // Marcos não faz sobrancelha na navalha.
  for (const servico of [corte, barba, corteEBarba]) {
    await prisma.servicoProfissional.create({ data: { servicoId: servico.id, profissionalId: marcos.id } });
  }

  for (let dia = 0; dia <= 6; dia++) {
    const fechadoFixo = dia === 0 || dia === 1;
    for (const prof of [carlos, joao, marcos]) {
      const fechadoSabadoMarcos = dia === 6 && prof.id === marcos.id;
      if (fechadoFixo || fechadoSabadoMarcos) {
        await prisma.horarioFuncionamento.create({
          data: { profissionalId: prof.id, diaSemana: dia, abre: "09:00", fecha: "19:00", fechado: true },
        });
      } else if (dia === 6) {
        await prisma.horarioFuncionamento.create({
          data: { profissionalId: prof.id, diaSemana: dia, abre: "09:00", fecha: "15:00", fechado: false },
        });
      } else {
        await prisma.horarioFuncionamento.create({
          data: { profissionalId: prof.id, diaSemana: dia, abre: "09:00", fecha: "19:00", almocoInicio: "12:30", almocoFim: "13:30", fechado: false },
        });
      }
    }
  }

  const bloqueiosCarlosData = [
    { dataYMD: proximoDiaDaSemana(somarDias(hoje, 3), 2), horaInicio: "09:00", horaFim: "19:00", motivo: "Curso de barbearia" },
  ];
  const bloqueiosCarlos: FaixaHoraria[] = [];
  for (const b of bloqueiosCarlosData) {
    const registro = await prisma.bloqueio.create({
      data: { profissionalId: carlos.id, inicio: dataHoraParaInstante(b.dataYMD, b.horaInicio), fim: dataHoraParaInstante(b.dataYMD, b.horaFim), motivo: b.motivo },
    });
    bloqueiosCarlos.push({ inicio: registro.inicio, fim: registro.fim });
  }
  const bloqueiosJoaoData = [
    { dataYMD: proximoDiaDaSemana(somarDias(hoje, 2), 4), horaInicio: "16:00", horaFim: "18:00", motivo: "Compromisso pessoal" },
  ];
  const bloqueiosJoao: FaixaHoraria[] = [];
  for (const b of bloqueiosJoaoData) {
    const registro = await prisma.bloqueio.create({
      data: { profissionalId: joao.id, inicio: dataHoraParaInstante(b.dataYMD, b.horaInicio), fim: dataHoraParaInstante(b.dataYMD, b.horaFim), motivo: b.motivo },
    });
    bloqueiosJoao.push({ inicio: registro.inicio, fim: registro.fim });
  }

  const nomesClientesBarbearia = NOMES_CLIENTES.slice(20, 40);
  const clientesBarbeariaIds: string[] = [];
  for (let i = 0; i < nomesClientesBarbearia.length; i++) {
    const cliente = await prisma.cliente.create({
      data: {
        nome: nomesClientesBarbearia[i],
        telefone: telefonePE(20 + i),
        estabelecimentoId: barbearia.id,
        observacoes: comProbabilidade(0.25) ? escolher(NOTAS_CLIENTES) : null,
      },
    });
    clientesBarbeariaIds.push(cliente.id);
  }

  // ---------- Horários de funcionamento (mapa em memória, para o gerador de agendamentos) ----------
  async function carregarHorarios(profissionalId: string): Promise<Map<number, ConfigDiaTrabalho | null>> {
    const linhas = await prisma.horarioFuncionamento.findMany({ where: { profissionalId } });
    const mapa = new Map<number, ConfigDiaTrabalho | null>();
    for (const linha of linhas) {
      mapa.set(
        linha.diaSemana,
        linha.fechado ? null : { abre: linha.abre, fecha: linha.fecha, almocoInicio: linha.almocoInicio, almocoFim: linha.almocoFim },
      );
    }
    return mapa;
  }

  const contextos: ProfissionalContexto[] = [
    {
      id: ana.id, nome: ana.nome, estabelecimentoId: studioAna.id, fuso: FUSO,
      clientesIds: clientesAnaIds,
      servicos: servicosAna.map((s) => ({ id: s.id, duracaoMin: s.duracaoMin })),
      horarios: await carregarHorarios(ana.id),
      bloqueios: bloqueiosAna,
    },
    {
      id: carlos.id, nome: carlos.nome, estabelecimentoId: barbearia.id, fuso: FUSO,
      clientesIds: clientesBarbeariaIds,
      servicos: servicosBarbearia.map((s) => ({ id: s.id, duracaoMin: s.duracaoMin })),
      horarios: await carregarHorarios(carlos.id),
      bloqueios: bloqueiosCarlos,
    },
    {
      id: joao.id, nome: joao.nome, estabelecimentoId: barbearia.id, fuso: FUSO,
      clientesIds: clientesBarbeariaIds,
      servicos: servicosBarbearia.map((s) => ({ id: s.id, duracaoMin: s.duracaoMin })),
      horarios: await carregarHorarios(joao.id),
      bloqueios: bloqueiosJoao,
    },
    {
      id: marcos.id, nome: marcos.nome, estabelecimentoId: barbearia.id, fuso: FUSO,
      clientesIds: clientesBarbeariaIds,
      servicos: [corte, barba, corteEBarba].map((s) => ({ id: s.id, duracaoMin: s.duracaoMin })),
      horarios: await carregarHorarios(marcos.id),
      bloqueios: [],
    },
  ];

  console.log("Gerando agendamentos...");
  const usadas = new Map<string, FaixaHoraria[]>();
  let totalCriados = 0;

  for (let offset = -60; offset <= 21; offset++) {
    const dataYMD = somarDias(hoje, offset);
    const diaSemana = diaDaSemana(dataYMD);
    const passado = offset < 0;
    const ehHoje = offset === 0;

    for (const prof of contextos) {
      const configDia = prof.horarios.get(diaSemana) ?? null;
      if (!configDia) continue;

      // Hoje ganha mais tentativas garantidas, para a tela "Hoje" nunca aparecer vazia na demo.
      const tentativas = ehHoje ? inteiroEntre(2, 4) : tentativasDoDia(passado);
      const jaUsadas = usadas.get(prof.id) ?? [];

      for (let t = 0; t < tentativas; t++) {
        const servico = escolher(prof.servicos);
        const slots = calcularHorariosDisponiveis({
          data: dataYMD,
          fuso: prof.fuso,
          duracaoMin: servico.duracaoMin,
          configDia,
          bloqueios: prof.bloqueios,
          agendamentos: jaUsadas,
          agora: new Date(0),
          antecedenciaMinMin: 0,
        });
        if (slots.length === 0) continue;

        const inicio = preferirHorarioDePico(slots);
        const fim = new Date(inicio.getTime() + servico.duracaoMin * 60_000);
        jaUsadas.push({ inicio, fim });

        // Para hoje, o status considera o horário real: já passou vira atendido/faltou/cancelado,
        // ainda não chegou vira confirmado/pendente/cancelado.
        const status = ehHoje ? escolherStatus(inicio.getTime() < Date.now()) : escolherStatus(passado);
        const origem: OrigemAgendamento = comProbabilidade(0.6) ? "LINK" : "MANUAL";
        const clienteId = escolher(prof.clientesIds);

        const agendamento = await prisma.agendamento.create({
          data: {
            estabelecimentoId: prof.estabelecimentoId,
            profissionalId: prof.id,
            clienteId,
            servicoId: servico.id,
            inicio,
            fim,
            status,
            origem,
          },
        });
        totalCriados++;

        await criarMensagensSeed(agendamento.id);
      }

      usadas.set(prof.id, jaUsadas);
    }
  }

  await prisma.relogioSimulado.create({ data: { id: 1, offsetMin: 0 } });

  console.log(`Concluído: ${totalCriados} agendamentos criados.`);

  async function criarMensagensSeed(agendamentoId: string) {
    const agendamento = await prisma.agendamento.findUniqueOrThrow({
      where: { id: agendamentoId },
      include: { cliente: true, servico: true, estabelecimento: true },
    });
    const dadosTexto = {
      nomeEstabelecimento: agendamento.estabelecimento.nome,
      nomeServico: agendamento.servico.nome,
      inicio: agendamento.inicio,
      fuso: agendamento.estabelecimento.fuso,
    };

    const agendadaConfirmacao = new Date(agendamento.inicio.getTime() - inteiroEntre(2, 240) * 60 * 60_000);
    await prisma.mensagem.create({
      data: {
        agendamentoId,
        tipo: "CONFIRMACAO",
        canal: "SMS",
        status: "ENVIADA",
        texto: textoConfirmacao(dadosTexto),
        agendadaPara: agendadaConfirmacao,
        enviadaEm: agendadaConfirmacao,
      },
    });

    const agendadaLembrete = new Date(agendamento.inicio.getTime() - 24 * 60 * 60_000);
    const cancelado = agendamento.status === "CANCELADO";
    const jaVenceu = agendadaLembrete.getTime() <= Date.now();
    await prisma.mensagem.create({
      data: {
        agendamentoId,
        tipo: "LEMBRETE",
        canal: "SMS",
        status: cancelado ? "CANCELADA" : jaVenceu ? "ENVIADA" : "PENDENTE",
        texto: textoLembrete(dadosTexto),
        agendadaPara: agendadaLembrete,
        enviadaEm: !cancelado && jaVenceu ? agendadaLembrete : null,
      },
    });
  }
}

function dataHoraParaInstante(dataYMD: string, horaHHmm: string): Date {
  return fromZonedTime(`${dataYMD}T${horaHHmm}:00`, FUSO);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (erro) => {
    console.error(erro);
    await prisma.$disconnect();
    process.exit(1);
  });
