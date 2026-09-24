import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Política de Privacidade" };

const EMAIL_CONTATO = "contato@veyloagenda.com.br";

export default function PaginaPrivacidade() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-text">
      <Link href="/" className="text-sm text-text-muted hover:text-text">
        ← Voltar
      </Link>

      <h1 className="mt-4 font-heading text-2xl font-extrabold sm:text-3xl">Política de Privacidade</h1>
      <p className="mt-1 text-sm text-text-faint">Última atualização: 24 de setembro de 2026.</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-text-muted">
        <p>
          O Veylo Agenda é um sistema de agendamento online usado por profissionais e estabelecimentos de beleza
          (chamados aqui de <strong className="text-text">estabelecimento</strong>) para organizar horários com suas
          clientes. Esta página explica quais dados pessoais tratamos, para quê, e quais direitos você tem sobre
          eles, conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
        </p>

        <section>
          <h2 className="font-heading text-lg font-bold text-text">Quais dados coletamos</h2>
          <p className="mt-2">
            Se você é <strong className="text-text">cliente de um estabelecimento</strong> (marcou um horário pelo
            link público de agendamento): nome e telefone, além da data/horário e do serviço escolhido.
          </p>
          <p className="mt-2">
            Se você é <strong className="text-text">dona/dono de um estabelecimento</strong> cadastrado no Veylo
            Agenda: nome, e-mail, senha (armazenada com hash — nunca em texto puro), nome e endereço do
            estabelecimento, e os dados que você cadastra sobre sua equipe e serviços.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-text">Por que usamos esses dados</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Viabilizar o agendamento em si (sem nome/telefone, não tem como marcar ou avisar sobre um horário).</li>
            <li>Enviar confirmação e lembrete do horário marcado, por SMS ou WhatsApp.</li>
            <li>Permitir que o estabelecimento organize sua própria agenda, clientes e relatórios.</li>
          </ul>
          <p className="mt-2">Não vendemos nem alugamos dados pessoais a terceiros, e não usamos esses dados para publicidade.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-text">Com quem compartilhamos</h2>
          <p className="mt-2">
            Usamos fornecedores que processam dados em nosso nome, só na medida necessária para o serviço funcionar:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong className="text-text">Twilio</strong> — envia as mensagens de SMS/WhatsApp de confirmação e
              lembrete (recebe nome do estabelecimento, serviço, data/horário e o telefone da cliente).
            </li>
            <li>
              <strong className="text-text">Netlify</strong> — hospeda o sistema e o banco de dados.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-text">Cada estabelecimento só vê os próprios dados</h2>
          <p className="mt-2">
            O Veylo Agenda atende vários estabelecimentos independentes. Os dados de clientes, agendamentos e
            serviços de um estabelecimento nunca ficam visíveis para outro — cada dona/dono só acessa a própria
            agenda e sua própria carteira de clientes.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-text">Por quanto tempo guardamos</h2>
          <p className="mt-2">
            Mantemos os dados enquanto a conta do estabelecimento estiver ativa, para preservar o histórico de
            agendamentos. Se você quiser que os dados de um agendamento específico ou de uma conta sejam removidos,
            pode pedir pelo contato abaixo.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-text">Seus direitos</h2>
          <p className="mt-2">Conforme a LGPD, você pode pedir a qualquer momento:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Confirmação de que tratamos seus dados, e acesso a eles;</li>
            <li>Correção de dados incompletos, desatualizados ou incorretos;</li>
            <li>Exclusão dos seus dados pessoais;</li>
            <li>Informação sobre com quem compartilhamos esses dados.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-text">Contato</h2>
          <p className="mt-2">
            Para dúvidas sobre esta política ou para exercer seus direitos, escreva para{" "}
            <a href={`mailto:${EMAIL_CONTATO}`} className="font-medium text-text underline">
              {EMAIL_CONTATO}
            </a>
            . Se sua dúvida é sobre um agendamento específico, o mais rápido é falar direto com o estabelecimento
            onde você marcou.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-text">Mudanças nesta política</h2>
          <p className="mt-2">
            Podemos atualizar esta página conforme o serviço evolui. A data no topo sempre mostra a versão mais
            recente.
          </p>
        </section>
      </div>
    </main>
  );
}
