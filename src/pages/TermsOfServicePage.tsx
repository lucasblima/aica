import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * TermsOfServicePage Component
 *
 * Displays the Terms of Service v2.0 for the Aica application.
 * Covers payments, AI services, invite program, and international compliance.
 * Required for legal compliance and user agreement.
 */
export function TermsOfServicePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ceramic-base">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-ceramic-base border-b border-[#E8E6E0]">
        <div className="max-w-[900px] mx-auto px-6 md:px-8 h-16 flex items-center">
          <button
            onClick={() => navigate('/landing')}
            className="flex items-center gap-2 text-[#5C554B] hover:text-[#2B1B17] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B9EFF] rounded-lg p-2"
            aria-label="Voltar para a página inicial"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Voltar</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[900px] mx-auto px-6 md:px-8 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-[#2B1B17] mb-4">
          Termos de Servico
        </h1>
        <p className="text-sm text-[#5C554B] mb-8">
          Ultima atualizacao: 28 de fevereiro de 2026
        </p>

        <div className="prose prose-slate max-w-none space-y-8">
          {/* 1. Aceitacao dos Termos */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">1. Aceitacao dos Termos</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Estes Termos de Servico (&quot;Termos&quot;) constituem um acordo legal vinculante entre voce
              (&quot;Usuario&quot;, &quot;voce&quot; ou &quot;seu&quot;) e <strong>Comtxae Educacao Cultura e Tecnologia Ltda.</strong>{' '}
              (&quot;Aica&quot;, &quot;nos&quot;, &quot;nosso&quot; ou &quot;nossa&quot;), e regem seu acesso e uso da plataforma AICA Life OS,
              incluindo todos os modulos, funcionalidades, APIs e servicos relacionados.
            </p>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Ao criar uma conta, acessar ou utilizar a Aica, voce declara ter lido, compreendido e
              concordado integralmente com estes Termos e com nossa{' '}
              <a href="/privacy" className="text-ceramic-info hover:underline">
                Politica de Privacidade
              </a>
              . Caso nao concorde com qualquer disposicao, voce deve interromper imediatamente o uso
              da plataforma.
            </p>
            <p className="text-[#5C554B] leading-relaxed">
              Estes Termos aplicam-se a todos os usuarios, incluindo visitantes, usuarios registrados
              e assinantes de planos pagos.
            </p>
          </section>

          {/* 2. Descricao dos Servicos */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">2. Descricao dos Servicos</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica e um Sistema Operacional de Vida Integral (&quot;AICA Life OS&quot;) que integra
              produtividade pessoal e profissional atraves dos seguintes modulos:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li>
                <strong>Atlas</strong> &mdash; Gestao de tarefas com Matriz de Eisenhower e sincronizacao
                bidirecional com Google Calendar
              </li>
              <li>
                <strong>Jornada</strong> &mdash; Reflexao pessoal, registro de momentos e perguntas diarias
                para autoconhecimento
              </li>
              <li>
                <strong>Rede</strong> &mdash; CRM pessoal com organizacao de contatos por contexto e
                relacionamento
              </li>
              <li>
                <strong>Captacao</strong> &mdash; Descoberta de oportunidades de financiamento e editais
                com assistencia de IA
              </li>
              <li>
                <strong>Studio</strong> &mdash; Producao de podcasts com gestao de convidados e roteiros
                assistidos por IA
              </li>
              <li>
                <strong>Financeiro</strong> &mdash; Gestao de transacoes financeiras pessoais e profissionais
              </li>
            </ul>
            <p className="text-[#5C554B] leading-relaxed">
              A Aica podera adicionar, modificar ou descontinuar modulos e funcionalidades a qualquer
              momento, mediante aviso previo de <strong>30 (trinta) dias</strong> para alteracoes
              significativas.
            </p>
          </section>

          {/* 3. Conta de Usuario */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">3. Conta de Usuario</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Para utilizar a Aica, voce deve:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li>Ter pelo menos <strong>18 (dezoito) anos</strong> de idade</li>
              <li>Fornecer informacoes precisas, completas e atualizadas durante o cadastro</li>
              <li>Manter a seguranca e confidencialidade de sua senha e credenciais de acesso</li>
              <li>Notificar-nos imediatamente sobre qualquer uso nao autorizado de sua conta</li>
            </ul>
            <p className="text-[#5C554B] leading-relaxed">
              Voce e integralmente responsavel por todas as atividades realizadas em sua conta,
              incluindo acoes de terceiros que acessem sua conta por falha na protecao de suas
              credenciais. A Aica nao se responsabiliza por perdas decorrentes de acesso nao
              autorizado quando causado por negligencia do Usuario na guarda de suas credenciais.
            </p>
          </section>

          {/* 4. Conduta do Usuario */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">4. Conduta do Usuario</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Ao utilizar a Aica, voce concorda em NAO:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Violar qualquer lei, regulamento ou norma aplicavel, nacional ou internacional</li>
              <li>Infringir direitos de propriedade intelectual, marcas, patentes ou direitos autorais de terceiros</li>
              <li>Realizar engenharia reversa, descompilar, desmontar ou tentar extrair o codigo-fonte da plataforma</li>
              <li>Tentar obter acesso nao autorizado a sistemas, redes, contas ou dados da Aica ou de terceiros</li>
              <li>Distribuir virus, malware, ransomware, spyware ou qualquer codigo malicioso</li>
              <li>Fazer scraping, crawling ou coleta automatizada de dados sem autorizacao expressa por escrito</li>
              <li>Utilizar a plataforma para fins ilegais, fraudulentos ou nao autorizados</li>
              <li>Assediar, abusar, ameacar, difamar ou prejudicar outros usuarios</li>
              <li>Representar falsamente sua identidade, afiliacao ou vinculo com qualquer pessoa ou entidade</li>
              <li>Interferir no funcionamento adequado da plataforma ou sobrecarregar intencionalmente nossos servidores</li>
            </ul>
          </section>

          {/* 5. Propriedade Intelectual */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">5. Propriedade Intelectual</h2>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">5.1. Propriedade da Aica</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A plataforma AICA Life OS, incluindo todo o codigo-fonte, design, arquitetura,
              funcionalidades, conteudo, marcas registradas, logotipos, identidade visual e demais
              materiais, sao de propriedade exclusiva da Comtxae Educacao Cultura e Tecnologia Ltda.
              ou de seus licenciadores e sao protegidos pelas leis brasileiras e tratados
              internacionais de propriedade intelectual.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">5.2. Seu Conteudo</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Voce retem todos os direitos sobre o conteudo que cria, insere ou armazena na
              plataforma (tarefas, notas, momentos, reflexoes, dados financeiros, etc.). Ao utilizar
              a Aica, voce nos concede uma licenca <strong>limitada, nao exclusiva e revogavel</strong>{' '}
              para:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Armazenar, processar e exibir seu conteudo para prestacao dos servicos</li>
              <li>Realizar backups e manter copias de seguranca para protecao dos dados</li>
              <li>Utilizar dados agregados e anonimizados para fins de analise e melhoria da plataforma</li>
            </ul>
            <p className="text-[#5C554B] leading-relaxed mt-4">
              Esta licenca e automaticamente revogada quando voce exclui seu conteudo ou encerra sua conta.
            </p>
          </section>

          {/* 6. Servicos de Inteligencia Artificial */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">6. Servicos de Inteligencia Artificial</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica utiliza a Google Gemini API para fornecer funcionalidades de inteligencia
              artificial, incluindo insights personalizados, sugestoes de produtividade, analise de
              padroes e assistencia em diversas tarefas dos modulos.
            </p>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Ao utilizar os recursos de IA, voce reconhece e concorda que:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>
                As recomendacoes de IA <strong>nao constituem aconselhamento profissional</strong>{' '}
                (medico, psicologico, financeiro, juridico ou de qualquer outra natureza)
              </li>
              <li>
                Os resultados gerados por IA podem conter imprecisoes, erros ou informacoes
                desatualizadas
              </li>
              <li>
                Voce e integralmente responsavel por suas decisoes e acoes baseadas em recomendacoes
                de IA
              </li>
              <li>
                A Aica nao garante resultados especificos decorrentes do uso de recursos de IA
              </li>
              <li>
                Voce pode desabilitar funcionalidades de IA a qualquer momento nas configuracoes da
                plataforma
              </li>
              <li>
                Seus dados processados pela IA nao sao utilizados para treinar modelos de terceiros
              </li>
            </ul>
          </section>

          {/* 7. Integracoes com Terceiros */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">7. Integracoes com Terceiros</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica oferece integracoes com os seguintes servicos de terceiros:
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">7.1. Google Calendar</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A integracao com Google Calendar utiliza o escopo <code className="bg-[#F8F7F5] px-1.5 py-0.5 rounded text-sm">calendar.events</code>{' '}
              para sincronizacao bidirecional &mdash; leitura de eventos existentes e criacao de
              novos eventos a partir de tarefas e compromissos gerenciados nos modulos Atlas e Flux.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">7.2. Telegram</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A integracao com Telegram permite receber notificacoes e interagir com a plataforma
              atraves de mensagens.
            </p>

            <p className="text-[#5C554B] leading-relaxed mb-4">
              Em relacao a todas as integracoes com terceiros:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Cada integracao e ativada individualmente pelo usuario (consentimento incremental)</li>
              <li>Voce pode revogar qualquer integracao a qualquer momento nas configuracoes da plataforma</li>
              <li>A Aica nao se responsabiliza pela disponibilidade, seguranca ou politicas dos servicos de terceiros</li>
              <li>Voce deve revisar os termos e politicas dos servicos que escolher conectar</li>
              <li>
                O uso de dados do Google esta em conformidade com a{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ceramic-info hover:underline"
                >
                  Google API Services User Data Policy
                </a>
                , incluindo os requisitos de Uso Limitado (Limited Use)
              </li>
            </ul>
          </section>

          {/* 8. Termos de Pagamento */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">8. Termos de Pagamento</h2>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">8.1. Planos e Precos</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica oferece os seguintes planos de assinatura:
            </p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse text-sm text-[#5C554B]">
                <thead>
                  <tr className="border-b border-[#E8E6E0]">
                    <th className="text-left py-3 pr-4 font-semibold text-[#2B1B17]">Plano</th>
                    <th className="text-left py-3 pr-4 font-semibold text-[#2B1B17]">Valor</th>
                    <th className="text-left py-3 font-semibold text-[#2B1B17]">Recursos</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#E8E6E0]">
                    <td className="py-3 pr-4">Gratuito</td>
                    <td className="py-3 pr-4">R$ 0,00</td>
                    <td className="py-3">Funcionalidades basicas de todos os modulos</td>
                  </tr>
                  <tr className="border-b border-[#E8E6E0]">
                    <td className="py-3 pr-4">Pro</td>
                    <td className="py-3 pr-4">R$ 39,90/mes</td>
                    <td className="py-3">Todos os modulos com IA completa e integrações avancadas</td>
                  </tr>
                  <tr className="border-b border-[#E8E6E0]">
                    <td className="py-3 pr-4">Teams</td>
                    <td className="py-3 pr-4">R$ 149,00/mes</td>
                    <td className="py-3">Pro + colaboracao em equipe e gestao compartilhada</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4">Consultoria</td>
                    <td className="py-3 pr-4">Sob demanda</td>
                    <td className="py-3">Implementacao personalizada e suporte dedicado</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">8.2. Metodos de Pagamento</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Aceitamos os seguintes metodos de pagamento: cartao de credito/debito, PIX e Boleto
              Bancario. As assinaturas pagas sao cobradas antecipadamente no inicio de cada ciclo
              de faturamento.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">8.3. Renovacao e Cancelamento</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              As assinaturas sao renovadas automaticamente ao final de cada ciclo, salvo cancelamento
              pelo Usuario. Voce pode cancelar sua assinatura a qualquer momento atraves das
              configuracoes da plataforma. O cancelamento entra em vigor ao final do ciclo de
              faturamento vigente, mantendo o acesso ate essa data. Precos estao sujeitos a
              alteracoes com aviso previo de 30 (trinta) dias.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">8.4. Politica de Reembolso</h3>
            <p className="text-[#5C554B] leading-relaxed">
              Em conformidade com o Art. 49 do Codigo de Defesa do Consumidor (CDC), o Usuario tem
              direito ao reembolso integral em ate <strong>7 (sete) dias corridos</strong> a partir
              da contratacao. Solicitacoes devem ser realizadas atraves do e-mail{' '}
              <a href="mailto:contato@aica.guru" className="text-ceramic-info hover:underline">
                contato@aica.guru
              </a>{' '}
              ou das configuracoes da plataforma.
            </p>
          </section>

          {/* 9. Programa de Convites */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">9. Programa de Convites</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica pode disponibilizar um programa de convites que permite aos usuarios convidar
              terceiros para a plataforma. Em relacao ao programa de convites:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>O numero de convites disponiveis e limitado e definido pela Aica</li>
              <li>O convidante deve obter consentimento previo do destinatario antes de enviar o convite</li>
              <li>Convites sao pessoais e intransferiveis</li>
              <li>Convites nao possuem valor monetario e nao podem ser comercializados</li>
              <li>A Aica reserva-se o direito de descontinuar o programa de convites a qualquer momento</li>
              <li>O uso indevido do programa (spam, convites nao solicitados) pode resultar em suspensao da conta</li>
            </ul>
          </section>

          {/* 10. Disponibilidade e Suporte */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">10. Disponibilidade e Suporte</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica se empenha em manter a plataforma disponivel <strong>24 horas por dia,
              7 dias por semana</strong>. No entanto, interrupcoes programadas ou nao programadas
              podem ocorrer para fins de manutencao, atualizacao ou por motivos de forca maior.
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Manutencoes programadas serao comunicadas com antecedencia minima de <strong>24 horas</strong></li>
              <li>Suporte por e-mail disponivel em{' '}
                <a href="mailto:contato@aica.guru" className="text-ceramic-info hover:underline">
                  contato@aica.guru
                </a>
              </li>
              <li>Prazo de resposta para usuarios do plano gratuito: ate <strong>48 horas uteis</strong></li>
              <li>Prazo de resposta para usuarios de planos pagos: ate <strong>24 horas uteis</strong></li>
            </ul>
          </section>

          {/* 11. Limitacao de Responsabilidade */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">11. Limitacao de Responsabilidade</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A plataforma e fornecida <strong>&quot;COMO ESTA&quot;</strong> e{' '}
              <strong>&quot;CONFORME DISPONIVEL&quot;</strong>, sem garantias de qualquer natureza,
              expressas ou implicitas. Na extensao maxima permitida pela legislacao aplicavel, a
              Aica nao sera responsavel por:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li>Danos indiretos, incidentais, especiais, consequenciais ou punitivos</li>
              <li>Perda de dados, lucros cessantes ou interrupcao de negocios</li>
              <li>Decisoes tomadas com base em recomendacoes geradas por IA</li>
              <li>Indisponibilidade de servicos de terceiros integrados (Google Calendar, Telegram)</li>
              <li>Imprecisoes, erros ou omissoes em conteudo gerado por inteligencia artificial</li>
            </ul>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A responsabilidade total da Aica perante o Usuario, por qualquer causa e
              independentemente da forma da acao, esta limitada ao <strong>maior valor entre:
              (a) o total de pagamentos realizados pelo Usuario nos ultimos 12 (doze) meses; ou
              (b) R$ 500,00 (quinhentos reais)</strong>.
            </p>
            <p className="text-[#5C554B] leading-relaxed">
              Esta limitacao nao afeta os direitos irrenunciaveis do consumidor previstos no Codigo
              de Defesa do Consumidor (CDC) e na legislacao aplicavel.
            </p>
          </section>

          {/* 12. Suspensao e Encerramento */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">12. Suspensao e Encerramento</h2>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">12.1. Encerramento pelo Usuario</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Voce pode encerrar sua conta a qualquer momento atraves das configuracoes da
              plataforma ou entrando em contato com o suporte em{' '}
              <a href="mailto:contato@aica.guru" className="text-ceramic-info hover:underline">
                contato@aica.guru
              </a>
              . Apos o encerramento, seus dados serao removidos conforme nossa politica de retencao
              de dados descrita na{' '}
              <a href="/privacy" className="text-ceramic-info hover:underline">
                Politica de Privacidade
              </a>
              .
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">12.2. Suspensao ou Encerramento pela Aica</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica podera suspender ou encerrar sua conta mediante aviso previo de{' '}
              <strong>15 (quinze) dias</strong>, exceto em casos de violacoes graves (fraude, acesso
              nao autorizado, atividades ilegais), nos quais a suspensao podera ser imediata.
              Motivos incluem:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Violacao destes Termos de Servico</li>
              <li>Uso da plataforma de maneira prejudicial, abusiva ou fraudulenta</li>
              <li>Fornecimento de informacoes falsas ou enganosas</li>
              <li>Inadimplencia em relacao a planos pagos</li>
              <li>Determinacao judicial ou administrativa</li>
            </ul>
          </section>

          {/* 13. Modificacoes dos Termos */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">13. Modificacoes dos Termos</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica podera modificar estes Termos periodicamente. Alteracoes significativas serao
              comunicadas com antecedencia minima de <strong>30 (trinta) dias</strong> atraves de:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li>Notificacao por e-mail para o endereco cadastrado</li>
              <li>Aviso destacado na plataforma (in-app)</li>
              <li>Atualizacao da data &quot;Ultima atualizacao&quot; no topo desta pagina</li>
            </ul>
            <p className="text-[#5C554B] leading-relaxed">
              Caso voce nao concorde com as modificacoes, voce devera interromper o uso da
              plataforma, solicitar a exclusao de sua conta e, se aplicavel, tera direito ao
              reembolso proporcional ao periodo nao utilizado de sua assinatura.
            </p>
          </section>

          {/* 14. Resolucao de Disputas */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">14. Resolucao de Disputas</h2>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">14.1. Lei Aplicavel</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Estes Termos sao regidos pelas leis da Republica Federativa do Brasil. Para usuarios
              residentes na Uniao Europeia/Espaco Economico Europeu (UE/EEE), os direitos conferidos
              pela legislacao local de protecao ao consumidor permanecem preservados. Para residentes
              na California (EUA), os direitos conferidos pela CCPA/CPRA sao igualmente preservados.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">14.2. Resolucao Informal</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Antes de iniciar qualquer procedimento formal, as partes se comprometem a buscar
              resolucao amigavel da disputa. O Usuario devera entrar em contato atraves do e-mail{' '}
              <a href="mailto:contato@aica.guru" className="text-ceramic-info hover:underline">
                contato@aica.guru
              </a>
              , e a Aica tera o prazo de <strong>30 (trinta) dias</strong> para responder e buscar
              uma solucao.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">14.3. Foro</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Fica eleito o foro da <strong>comarca do Rio de Janeiro, Estado do Rio de Janeiro</strong>,
              para dirimir quaisquer controversias oriundas destes Termos, ressalvado o direito do
              consumidor de optar pelo foro de seu domicilio, conforme Art. 101 do CDC.
            </p>
            <p className="text-[#5C554B] leading-relaxed">
              Para usuarios internacionais, a Aica oferece a opcao de mediacao online como
              alternativa para resolucao de disputas.
            </p>
          </section>

          {/* 15. Disposicoes Gerais */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">15. Disposicoes Gerais</h2>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">15.1. Acordo Completo</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Estes Termos, juntamente com a{' '}
              <a href="/privacy" className="text-ceramic-info hover:underline">
                Politica de Privacidade
              </a>
              , constituem o acordo completo entre voce e a Aica, substituindo quaisquer acordos
              anteriores, escritos ou verbais.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">15.2. Divisibilidade</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Se qualquer disposicao destes Termos for considerada invalida ou inexequivel por
              autoridade competente, as demais disposicoes permanecerao em pleno vigor e efeito.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">15.3. Renuncia</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A falha ou atraso no exercicio de qualquer direito previsto nestes Termos nao
              constitui renuncia a esse direito, podendo ser exercido a qualquer momento.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">15.4. Cessao</h3>
            <p className="text-[#5C554B] leading-relaxed">
              Voce nao podera transferir ou ceder seus direitos e obrigacoes sob estes Termos sem
              o consentimento previo por escrito da Aica. A Aica podera transferir seus direitos
              e obrigacoes mediante notificacao previa ao Usuario.
            </p>
          </section>

          {/* 16. Contato */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">16. Contato</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Para duvidas, solicitacoes ou reclamacoes relacionadas a estes Termos de Servico,
              entre em contato conosco:
            </p>
            <div className="bg-[#F8F7F5] border border-[#E8E6E0] rounded-lg p-6 space-y-2">
              <p className="text-[#5C554B]">
                <strong>E-mail geral:</strong>{' '}
                <a href="mailto:contato@aica.guru" className="text-ceramic-info hover:underline">
                  contato@aica.guru
                </a>
              </p>
              <p className="text-[#5C554B]">
                <strong>Encarregado de Dados (DPO):</strong>{' '}
                <a href="mailto:dpo@aica.life" className="text-ceramic-info hover:underline">
                  dpo@aica.life
                </a>
              </p>
            </div>
          </section>

          {/* Acknowledgment */}
          <section className="mt-8 pt-8 border-t border-[#E8E6E0]">
            <div className="bg-ceramic-info/10 border border-ceramic-info/30 rounded-lg p-6">
              <p className="text-sm text-ceramic-info leading-relaxed">
                <strong>Importante:</strong> Ao usar a Aica, voce confirma que leu, compreendeu e
                concorda com estes Termos de Servico e nossa{' '}
                <a href="/privacy" className="text-ceramic-info hover:underline font-medium">
                  Politica de Privacidade
                </a>
                . Se voce nao concorda com estes termos, nao utilize nossos servicos.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#F8F7F5] border-t border-[#E8E6E0] py-8 mt-16">
        <div className="max-w-[900px] mx-auto px-6 md:px-8 text-center">
          <p className="text-sm text-[#5C554B]">
            &copy; {new Date().getFullYear()} Comtxae Educacao Cultura e Tecnologia Ltda. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default TermsOfServicePage;
