import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * PrivacyPolicyPage Component
 *
 * Displays the v2.0 privacy policy for AICA Life OS.
 * Covers LGPD, GDPR, CCPA/CPRA, Marco Civil da Internet, and CDC compliance.
 */
export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ceramic-base">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-ceramic-base border-b border-[#E8E6E0]">
        <div className="max-w-[900px] mx-auto px-6 md:px-8 h-16 flex items-center">
          <button
            onClick={() => navigate('/landing')}
            className="flex items-center gap-2 text-[#5C554B] hover:text-[#2B1B17] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B9EFF] rounded-lg p-2"
            aria-label="Voltar para a pagina inicial"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Voltar</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[900px] mx-auto px-6 md:px-8 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-[#2B1B17] mb-4">
          Politica de Privacidade
        </h1>
        <p className="text-sm text-[#5C554B] mb-8">
          Ultima atualizacao: 28 de fevereiro de 2026
        </p>

        <div className="prose prose-slate max-w-none space-y-8">
          {/* Section 1 - Introducao e Escopo */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">1. Introducao e Escopo</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A AICA Life OS (&quot;AICA&quot;, &quot;nos&quot;, &quot;nosso&quot; ou &quot;nossa&quot;) e um Sistema Operacional de Vida
              Integral que integra produtividade pessoal e profissional. A plataforma oferece modulos de
              gestao de tarefas, calendario, jornada pessoal, financas, conexoes, producao de conteudo,
              editais e treinamento fisico, com suporte de inteligencia artificial.
            </p>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Esta Politica de Privacidade descreve como coletamos, utilizamos, armazenamos, compartilhamos
              e protegemos seus dados pessoais ao utilizar a AICA, aplicando-se a todos os usuarios,
              independentemente de sua localizacao geografica.
            </p>
            <p className="text-[#5C554B] leading-relaxed">
              Ao utilizar a AICA, voce reconhece que leu, compreendeu e concorda com as praticas descritas
              nesta Politica. Caso nao concorde, recomendamos que nao utilize a plataforma. Esta Politica
              foi elaborada em conformidade com as seguintes legislacoes e normas:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mt-4">
              <li>Lei Geral de Protecao de Dados (LGPD - Lei n. 13.709/2018)</li>
              <li>Regulamento Geral sobre Protecao de Dados (GDPR - Regulamento UE 2016/679)</li>
              <li>California Consumer Privacy Act / California Privacy Rights Act (CCPA/CPRA)</li>
              <li>Marco Civil da Internet (Lei n. 12.965/2014)</li>
              <li>Codigo de Defesa do Consumidor (CDC - Lei n. 8.078/1990)</li>
            </ul>
          </section>

          {/* Section 2 - Identificacao do Controlador */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">2. Identificacao do Controlador</h2>
            <div className="bg-[#F8F7F5] border border-[#E8E6E0] rounded-lg p-6 space-y-2">
              <p className="text-[#5C554B]"><strong>Razao Social:</strong> Comtxae Educacao Cultura e Tecnologia Ltda.</p>
              <p className="text-[#5C554B]"><strong>CNPJ:</strong> [CNPJ]</p>
              <p className="text-[#5C554B]"><strong>Endereco:</strong> [ENDERECO]</p>
              <p className="text-[#5C554B]"><strong>Encarregado de Protecao de Dados (DPO):</strong> Lucas Boscacci Pereira Lima da Silva</p>
              <p className="text-[#5C554B]"><strong>E-mail do DPO:</strong> dpo@aica.life</p>
              <p className="text-[#5C554B]"><strong>E-mail geral:</strong> contato@aica.guru</p>
            </div>
            <p className="text-[#5C554B] leading-relaxed mt-4">
              Na qualidade de controlador (LGPD) / controller (GDPR) / business (CCPA), somos responsaveis
              pelas decisoes referentes ao tratamento dos seus dados pessoais.
            </p>
          </section>

          {/* Section 3 - Dados que Coletamos */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">3. Dados que Coletamos</h2>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">3.1. Dados Fornecidos Diretamente por Voce</h3>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li><strong>Dados de cadastro:</strong> nome, endereco de e-mail, foto de perfil (via Google Sign-In)</li>
              <li><strong>Conteudo criado:</strong> tarefas, notas, momentos de jornada, episodios de podcast, projetos de editais</li>
              <li><strong>Dados de calendario:</strong> eventos sincronizados via Google Calendar (quando autorizado)</li>
              <li><strong>Dados financeiros:</strong> transacoes, categorias e orcamentos inseridos no modulo Financas</li>
              <li><strong>Comunicacoes:</strong> mensagens importadas do Telegram (quando autorizado), feedback e suporte</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">3.2. Dados Coletados Automaticamente</h3>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li><strong>Dados de uso:</strong> paginas visitadas, funcionalidades utilizadas, frequencia e duracao de sessoes</li>
              <li><strong>Dados de dispositivo:</strong> tipo de dispositivo, sistema operacional, versao do navegador</li>
              <li><strong>Dados de rede:</strong> endereco IP, provedor de internet, localizacao aproximada</li>
              <li><strong>Cookies e tecnologias similares:</strong> conforme detalhado na Secao 12</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">3.3. Dados Recebidos de Terceiros</h3>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li><strong>Google Sign-In:</strong> nome, e-mail e foto de perfil da conta Google utilizada para autenticacao</li>
              <li><strong>Google Calendar:</strong> eventos de calendario (titulos, datas, horarios, participantes, status), mediante consentimento explicito</li>
              <li><strong>Telegram:</strong> mensagens exportadas pelo usuario para analise de intencoes e criacao de dossies de contatos</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">3.4. Categorias de Informacao Pessoal (CCPA/CPRA)</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Para fins de conformidade com a legislacao californiana, as categorias de informacao pessoal
              que coletamos incluem:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Identificadores (nome, e-mail, endereco IP)</li>
              <li>Informacoes comerciais (transacoes financeiras)</li>
              <li>Atividade na Internet (dados de uso e navegacao)</li>
              <li>Inferencias (perfis de produtividade gerados por IA)</li>
              <li>Informacoes pessoais sensiveis: nenhuma coletada intencionalmente</li>
            </ul>
          </section>

          {/* Section 4 - Como Utilizamos Seus Dados */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">4. Como Utilizamos Seus Dados</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A tabela abaixo descreve as finalidades do tratamento de dados e suas respectivas bases legais:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-[#E8E6E0] text-sm text-[#5C554B]">
                <thead>
                  <tr className="bg-[#F8F7F5]">
                    <th className="border border-[#E8E6E0] px-4 py-3 text-left font-semibold text-[#2B1B17]">Finalidade</th>
                    <th className="border border-[#E8E6E0] px-4 py-3 text-left font-semibold text-[#2B1B17]">Base Legal (LGPD)</th>
                    <th className="border border-[#E8E6E0] px-4 py-3 text-left font-semibold text-[#2B1B17]">Base Legal (GDPR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-[#E8E6E0] px-4 py-3">Prestacao do servico e funcionamento da plataforma</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Execucao de contrato (Art. 7, V)</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Execucao de contrato (Art. 6(1)(b))</td>
                  </tr>
                  <tr className="bg-[#F8F7F5]">
                    <td className="border border-[#E8E6E0] px-4 py-3">Personalizacao com IA e recomendacoes</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Consentimento (Art. 7, I)</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Consentimento (Art. 6(1)(a))</td>
                  </tr>
                  <tr>
                    <td className="border border-[#E8E6E0] px-4 py-3">Analises de uso e melhorias do servico</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Interesse legitimo (Art. 7, IX)</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Interesse legitimo (Art. 6(1)(f))</td>
                  </tr>
                  <tr className="bg-[#F8F7F5]">
                    <td className="border border-[#E8E6E0] px-4 py-3">Comunicacoes sobre o servico e novidades</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Interesse legitimo (Art. 7, IX)</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Interesse legitimo (Art. 6(1)(f))</td>
                  </tr>
                  <tr>
                    <td className="border border-[#E8E6E0] px-4 py-3">Seguranca, prevencao a fraudes e incidentes</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Interesse legitimo (Art. 7, IX)</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Interesse legitimo (Art. 6(1)(f))</td>
                  </tr>
                  <tr className="bg-[#F8F7F5]">
                    <td className="border border-[#E8E6E0] px-4 py-3">Cumprimento de obrigacoes legais e regulatorias</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Obrigacao legal (Art. 7, II)</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Obrigacao legal (Art. 6(1)(c))</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5 - Processamento por IA */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">5. Processamento por Inteligencia Artificial</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A AICA utiliza a Google Gemini API para fornecer funcionalidades de inteligencia artificial.
              Todos os processamentos de IA ocorrem exclusivamente em Edge Functions no servidor, nunca
              diretamente no dispositivo do usuario.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">5.1. Funcionalidades de IA</h3>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li>Geracao de insights de produtividade e bem-estar</li>
              <li>Sugestoes contextuais de tarefas e compromissos</li>
              <li>Analise de sentimentos em comunicacoes importadas</li>
              <li>Resumos automaticos de conteudo e reunioes</li>
              <li>Recomendacoes personalizadas para crescimento pessoal</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">5.2. Salvaguardas</h3>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li><strong>Human-in-the-loop:</strong> Decisoes criticas sempre requerem confirmacao do usuario antes da execucao</li>
              <li><strong>Nao treina modelos:</strong> Seus dados nao sao utilizados para treinar, refinar ou melhorar modelos de IA publicos ou de terceiros</li>
              <li><strong>Consentimento separado:</strong> Funcionalidades de IA que processam dados pessoais requerem consentimento especifico e podem ser desativadas individualmente</li>
              <li><strong>Limitacoes:</strong> A IA pode gerar respostas imprecisas ou incompletas. Resultados de IA sao fornecidos como sugestoes e nao constituem aconselhamento profissional</li>
            </ul>
          </section>

          {/* Section 6 - Integracao com Google Calendar API */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">6. Integracao com Google Calendar API</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A AICA oferece integracao opcional com o Google Calendar para sincronizar seus eventos
              e compromissos. Esta secao descreve como utilizamos os dados obtidos atraves da Google Calendar API.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">6.1. Escopos de Acesso Solicitados</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Quando voce conecta seu Google Calendar, solicitamos os seguintes escopos:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li><strong>calendar.events:</strong> Acesso de leitura e escrita aos seus eventos de calendario. A AICA sincroniza seus eventos de forma bidirecional: exibe seus compromissos no modulo Agenda e pode criar eventos a partir de tarefas e treinos agendados.</li>
              <li><strong>userinfo.email:</strong> Acesso ao seu endereco de e-mail Google para identificacao da conta conectada.</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">6.2. Dados Acessados e Uso</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Os dados acessados do Google Calendar incluem:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li>Titulos e descricoes de eventos</li>
              <li>Datas, horarios e fusos horarios</li>
              <li>Participantes e organizadores</li>
              <li>Status do evento (confirmado, tentativo, cancelado)</li>
            </ul>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Esses dados sao utilizados exclusivamente para:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li>Exibir seus compromissos no modulo Agenda da AICA</li>
              <li>Criar eventos no seu calendario a partir de tarefas e treinos agendados na plataforma</li>
              <li>Detectar conflitos de horario entre eventos</li>
              <li>Gerar insights de produtividade baseados na sua agenda</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">6.3. Armazenamento de Tokens</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Os tokens de acesso OAuth sao armazenados de forma segura no banco de dados, associados
              ao seu usuario e protegidos por politicas de Row Level Security (RLS). Os tokens sao
              renovados automaticamente e podem ser revogados a qualquer momento.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">6.4. Revogacao de Acesso</h3>
            <p className="text-[#5C554B] leading-relaxed">
              Voce pode desconectar o Google Calendar a qualquer momento atraves das configuracoes
              da plataforma. Ao desconectar, os tokens de acesso sao removidos do nosso banco de dados
              e o acesso ao seu calendario e imediatamente revogado.
            </p>
          </section>

          {/* Section 7 - Compartilhamento de Dados */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">7. Compartilhamento de Dados</h2>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">7.1. Subprocessadores</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Compartilhamos dados com os seguintes subprocessadores, estritamente para operacao da plataforma:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-[#E8E6E0] text-sm text-[#5C554B]">
                <thead>
                  <tr className="bg-[#F8F7F5]">
                    <th className="border border-[#E8E6E0] px-4 py-3 text-left font-semibold text-[#2B1B17]">Subprocessador</th>
                    <th className="border border-[#E8E6E0] px-4 py-3 text-left font-semibold text-[#2B1B17]">Dados Compartilhados</th>
                    <th className="border border-[#E8E6E0] px-4 py-3 text-left font-semibold text-[#2B1B17]">Finalidade</th>
                    <th className="border border-[#E8E6E0] px-4 py-3 text-left font-semibold text-[#2B1B17]">Localizacao</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-[#E8E6E0] px-4 py-3">Supabase</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Todos os dados da plataforma</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Banco de dados, autenticacao, armazenamento</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Brasil (Sao Paulo)</td>
                  </tr>
                  <tr className="bg-[#F8F7F5]">
                    <td className="border border-[#E8E6E0] px-4 py-3">Google Cloud</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Aplicacao e logs</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Hospedagem (Cloud Run)</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Brasil / EUA</td>
                  </tr>
                  <tr>
                    <td className="border border-[#E8E6E0] px-4 py-3">Google Gemini API</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Conteudo para processamento de IA</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Inteligencia artificial</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">EUA</td>
                  </tr>
                  <tr className="bg-[#F8F7F5]">
                    <td className="border border-[#E8E6E0] px-4 py-3">Google (Auth/Calendar)</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Perfil, eventos de calendario</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Autenticacao e sincronizacao de calendario</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">EUA</td>
                  </tr>
                  <tr>
                    <td className="border border-[#E8E6E0] px-4 py-3">Telegram</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Mensagens exportadas pelo usuario</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Importacao de comunicacoes</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Global</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-semibold text-[#2B1B17] mt-6 mb-3">7.2. Nao Vendemos Seus Dados</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A AICA nao vende, aluga ou comercializa seus dados pessoais a terceiros, em nenhuma circunstancia.
              Para fins de CCPA/CPRA, confirmamos que nao realizamos &quot;venda&quot; (sale) nem &quot;compartilhamento&quot;
              (sharing) de informacoes pessoais conforme definido pela legislacao californiana.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">7.3. Divulgacao Obrigatoria</h3>
            <p className="text-[#5C554B] leading-relaxed">
              Podemos divulgar seus dados pessoais quando exigido por lei, ordem judicial, processo legal,
              ou quando necessario para proteger nossos direitos legais, prevenir fraudes ou garantir a
              seguranca dos usuarios.
            </p>
          </section>

          {/* Section 8 - Conformidade com Politicas do Google */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">8. Conformidade com Politicas do Google</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              O uso dos dados da Google Calendar API pela AICA esta em conformidade com a{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ceramic-info hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , incluindo os requisitos de Limited Use:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Os dados obtidos da Google Calendar API sao utilizados exclusivamente para fornecer e melhorar as funcionalidades de calendario da AICA</li>
              <li>Os dados nao sao transferidos a terceiros, exceto conforme necessario para fornecer o servico, com consentimento explicito do usuario, ou por exigencia legal</li>
              <li>Os dados nao sao usados para veicular anuncios ou para fins de marketing</li>
              <li>Os dados nao sao vendidos a terceiros</li>
              <li>A integracao com Google Calendar requer consentimento explicito e pode ser revogada a qualquer momento</li>
              <li>Leituras humanas dos dados sao realizadas apenas com consentimento explicito do usuario, para fins de seguranca, investigacao de bugs, ou cumprimento de obrigacoes legais</li>
            </ul>
          </section>

          {/* Section 9 - Transferencia Internacional de Dados */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">9. Transferencia Internacional de Dados</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Seus dados primarios sao armazenados e processados em servidores localizados no Brasil
              (Sao Paulo), onde estao hospedados nosso banco de dados (Supabase) e servidor de aplicacao
              (Google Cloud Run). Alguns dados podem ser transferidos para servidores nos Estados Unidos
              para processamento por servicos auxiliares, como inteligencia artificial (Google Gemini API)
              e autenticacao (Google OAuth).
            </p>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Para garantir a protecao adequada dos seus dados em transferencias internacionais, adotamos
              as seguintes salvaguardas:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li><strong>Brasil (LGPD):</strong> Clausulas Contratuais Padrao (CCPs) conforme regulamentacao da ANPD, quando aplicavel</li>
              <li><strong>Uniao Europeia (GDPR):</strong> Standard Contractual Clauses (SCCs) conforme Decisao de Execucao (UE) 2021/914</li>
              <li><strong>Transfer Impact Assessments (TIAs):</strong> Avaliamos o nivel de protecao de dados dos paises destinatarios</li>
              <li><strong>Medidas tecnicas:</strong> Criptografia em transito (TLS 1.3), pseudonimizacao quando possivel, e controle de acesso rigoroso</li>
            </ul>
          </section>

          {/* Section 10 - Retencao de Dados */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">10. Retencao de Dados</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Mantemos seus dados pessoais apenas pelo tempo necessario para as finalidades descritas
              nesta Politica. Os periodos especificos de retencao sao:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-[#E8E6E0] text-sm text-[#5C554B]">
                <thead>
                  <tr className="bg-[#F8F7F5]">
                    <th className="border border-[#E8E6E0] px-4 py-3 text-left font-semibold text-[#2B1B17]">Tipo de Dado</th>
                    <th className="border border-[#E8E6E0] px-4 py-3 text-left font-semibold text-[#2B1B17]">Periodo de Retencao</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-[#E8E6E0] px-4 py-3">Dados de conta e perfil</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Ate a exclusao da conta pelo usuario</td>
                  </tr>
                  <tr className="bg-[#F8F7F5]">
                    <td className="border border-[#E8E6E0] px-4 py-3">Conteudo criado pelo usuario</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">Ate a exclusao pelo usuario ou da conta</td>
                  </tr>
                  <tr>
                    <td className="border border-[#E8E6E0] px-4 py-3">Mensagens importadas (Telegram)</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">365 dias apos a importacao</td>
                  </tr>
                  <tr className="bg-[#F8F7F5]">
                    <td className="border border-[#E8E6E0] px-4 py-3">Logs de sessao e uso</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">30 dias</td>
                  </tr>
                  <tr>
                    <td className="border border-[#E8E6E0] px-4 py-3">Dados de IA anonimizados</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">365 dias</td>
                  </tr>
                  <tr className="bg-[#F8F7F5]">
                    <td className="border border-[#E8E6E0] px-4 py-3">Registros de auditoria</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">730 dias (2 anos)</td>
                  </tr>
                  <tr>
                    <td className="border border-[#E8E6E0] px-4 py-3">Cache temporario</td>
                    <td className="border border-[#E8E6E0] px-4 py-3">7 dias</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[#5C554B] leading-relaxed mt-4">
              Apos o periodo de retencao, os dados sao excluidos permanentemente ou anonimizados de forma
              irreversivel. Em caso de obrigacao legal, dados podem ser retidos por periodo superior ao indicado.
            </p>
          </section>

          {/* Section 11 - Seus Direitos */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">11. Seus Direitos</h2>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">11.1. Direitos sob a LGPD (Arts. 17-18)</h3>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li><strong>Confirmacao e acesso:</strong> Confirmar a existencia de tratamento e acessar seus dados</li>
              <li><strong>Correcao:</strong> Solicitar a correcao de dados incompletos, inexatos ou desatualizados</li>
              <li><strong>Anonimizacao, bloqueio ou eliminacao:</strong> De dados desnecessarios, excessivos ou tratados em desconformidade</li>
              <li><strong>Portabilidade:</strong> Solicitar a transferencia de dados a outro fornecedor de servico</li>
              <li><strong>Eliminacao:</strong> Solicitar a eliminacao de dados tratados com base no consentimento</li>
              <li><strong>Informacao:</strong> Ser informado sobre entidades com as quais compartilhamos dados</li>
              <li><strong>Revogacao do consentimento:</strong> Revogar o consentimento a qualquer momento</li>
              <li><strong>Oposicao:</strong> Opor-se ao tratamento realizado com fundamento em hipotese diferente do consentimento, em caso de descumprimento</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">11.2. Direitos Adicionais sob o GDPR</h3>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li><strong>Portabilidade em formato estruturado:</strong> Receber seus dados em formato legivel por maquina (JSON/CSV)</li>
              <li><strong>Restricao de processamento:</strong> Solicitar a restricao do tratamento em determinadas circunstancias</li>
              <li><strong>Decisoes automatizadas (Art. 22):</strong> Nao ser submetido a decisoes baseadas unicamente em tratamento automatizado que produzam efeitos legais ou significativos</li>
              <li><strong>Reclamacao:</strong> Apresentar reclamacao junto a uma autoridade de supervisao (ex.: autoridade de protecao de dados do seu pais)</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">11.3. Direitos sob CCPA/CPRA</h3>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li><strong>Direito de saber:</strong> Solicitar informacoes sobre as categorias e finalidades dos dados coletados</li>
              <li><strong>Direito de exclusao:</strong> Solicitar a exclusao dos seus dados pessoais</li>
              <li><strong>Direito de opt-out:</strong> Optar por nao ter seus dados vendidos ou compartilhados (a AICA nao vende dados)</li>
              <li><strong>Direito de correcao:</strong> Solicitar a correcao de informacoes pessoais imprecisas</li>
              <li><strong>Nao discriminacao:</strong> Nao ser discriminado por exercer seus direitos de privacidade</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">11.4. Como Exercer Seus Direitos</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Voce pode exercer seus direitos de duas formas:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li><strong>Pela plataforma:</strong> Atraves das configuracoes da sua conta na AICA</li>
              <li><strong>Por e-mail:</strong> Enviando uma solicitacao para <strong>dpo@aica.life</strong></li>
            </ul>
            <p className="text-[#5C554B] leading-relaxed">
              Prazos para resposta: ate 15 dias uteis (LGPD/Brasil), ate 30 dias (GDPR/UE),
              ate 45 dias (CCPA/California). Os prazos podem ser prorrogados conforme permitido
              pela legislacao aplicavel, mediante notificacao ao titular.
            </p>
          </section>

          {/* Section 12 - Cookies e Tecnologias Similares */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">12. Cookies e Tecnologias Similares</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Utilizamos cookies e tecnologias similares para melhorar sua experiencia na plataforma:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li><strong>Cookies essenciais:</strong> Necessarios para o funcionamento basico da plataforma, incluindo autenticacao e seguranca. Nao podem ser desativados.</li>
              <li><strong>Cookies de desempenho:</strong> Coletam informacoes anonimas sobre como voce utiliza a plataforma, permitindo melhorias de performance e usabilidade.</li>
              <li><strong>Cookies de funcionalidade:</strong> Armazenam suas preferencias (idioma, tema, configuracoes de modulo) para uma experiencia personalizada.</li>
            </ul>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Voce pode gerenciar suas preferencias de cookies nas configuracoes do seu navegador.
              A desativacao de cookies nao essenciais pode afetar algumas funcionalidades da plataforma.
            </p>
            <p className="text-[#5C554B] leading-relaxed">
              <strong>Global Privacy Control (GPC):</strong> A AICA reconhece e respeita sinais de GPC
              enviados pelo seu navegador. Quando detectamos um sinal de GPC, tratamos como uma solicitacao
              valida de opt-out conforme exigido pela CCPA/CPRA.
            </p>
          </section>

          {/* Section 13 - Seguranca dos Dados */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">13. Seguranca dos Dados</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Implementamos medidas de seguranca tecnicas e organizacionais para proteger seus dados pessoais
              contra acesso nao autorizado, alteracao, divulgacao ou destruicao:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li><strong>Criptografia em transito:</strong> TLS 1.3 para todas as comunicacoes entre cliente e servidor</li>
              <li><strong>Criptografia em repouso:</strong> AES-256 para dados armazenados no banco de dados</li>
              <li><strong>Row Level Security (RLS):</strong> Politicas de seguranca no nivel de linha garantem que cada usuario acessa apenas seus proprios dados</li>
              <li><strong>Autenticacao segura:</strong> OAuth 2.0 com PKCE para Google Sign-In, tokens JWT com rotacao automatica</li>
              <li><strong>Logs de auditoria:</strong> Registros de acesso e operacoes senssiveis para deteccao de anomalias</li>
              <li><strong>Mascaramento de PII:</strong> Dados pessoais identificaveis sao mascarados em logs e ambientes de desenvolvimento</li>
              <li><strong>Politicas de retencao:</strong> Exclusao automatica de dados temporarios conforme periodos definidos na Secao 10</li>
            </ul>
          </section>

          {/* Section 14 - Privacidade de Menores */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">14. Privacidade de Menores</h2>
            <p className="text-[#5C554B] leading-relaxed">
              A AICA nao e destinada a menores de 18 anos. Nao coletamos intencionalmente dados pessoais
              de criancas e adolescentes. Se voce e pai, mae ou responsavel legal e acredita que um menor
              sob sua responsabilidade forneceu dados pessoais a AICA, entre em contato conosco atraves
              do e-mail <strong>dpo@aica.life</strong> para que possamos tomar as medidas necessarias para
              remover essas informacoes.
            </p>
          </section>

          {/* Section 15 - Alteracoes nesta Politica */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">15. Alteracoes nesta Politica</h2>
            <p className="text-[#5C554B] leading-relaxed">
              Podemos atualizar esta Politica de Privacidade periodicamente para refletir mudancas em nossas
              praticas, tecnologias ou requisitos legais. Alteracoes significativas serao comunicadas com
              pelo menos 30 dias de antecedencia, por meio de notificacao por e-mail e/ou aviso destacado
              dentro da plataforma. A continuidade do uso da AICA apos a entrada em vigor das alteracoes
              sera considerada como aceitacao da Politica atualizada.
            </p>
          </section>

          {/* Section 16 - Contato */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">16. Contato</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Se voce tiver duvidas, comentarios ou solicitacoes relacionadas a esta Politica de Privacidade
              ou ao tratamento dos seus dados pessoais, entre em contato conosco:
            </p>
            <div className="bg-[#F8F7F5] border border-[#E8E6E0] rounded-lg p-6 space-y-2">
              <p className="text-[#5C554B]"><strong>Encarregado de Protecao de Dados (DPO):</strong> Lucas Boscacci Pereira Lima da Silva</p>
              <p className="text-[#5C554B]"><strong>E-mail do DPO:</strong> dpo@aica.life</p>
              <p className="text-[#5C554B]"><strong>E-mail geral:</strong> contato@aica.guru</p>
            </div>
            <p className="text-[#5C554B] leading-relaxed mt-4">
              Voce tambem pode apresentar reclamacao junto a Autoridade Nacional de Protecao de Dados (ANPD)
              pelo site{' '}
              <a
                href="https://www.gov.br/anpd"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ceramic-info hover:underline"
              >
                www.gov.br/anpd
              </a>
              {' '}ou junto a autoridade de supervisao do seu pais (para titulares na UE).
            </p>
          </section>

          {/* Legal Framework Footer */}
          <section className="mt-8 pt-8 border-t border-[#E8E6E0]">
            <p className="text-sm text-[#5C554B] leading-relaxed">
              Esta Politica de Privacidade esta em conformidade com:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-[#5C554B] mt-2">
              <li>Lei Geral de Protecao de Dados (LGPD - Lei n. 13.709/2018)</li>
              <li>Marco Civil da Internet (Lei n. 12.965/2014)</li>
              <li>Codigo de Defesa do Consumidor (CDC - Lei n. 8.078/1990)</li>
              <li>Regulamento Geral sobre Protecao de Dados (GDPR - Regulamento UE 2016/679)</li>
              <li>California Consumer Privacy Act / California Privacy Rights Act (CCPA/CPRA)</li>
              <li>
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ceramic-info hover:underline"
                >
                  Google API Services User Data Policy
                </a>
              </li>
            </ul>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#F8F7F5] border-t border-[#E8E6E0] py-8 mt-16">
        <div className="max-w-[900px] mx-auto px-6 md:px-8 text-center">
          <p className="text-sm text-[#5C554B]">
            &copy; {new Date().getFullYear()} AICA Life OS - Comtxae Educacao Cultura e Tecnologia Ltda. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default PrivacyPolicyPage;
