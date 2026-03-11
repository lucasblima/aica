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
          Termos de Serviço
        </h1>
        <p className="text-sm text-[#5C554B] mb-8">
          Última atualização: 28 de fevereiro de 2026
        </p>

        <div className="prose prose-slate max-w-none space-y-8">
          {/* 1. Aceitação dos Termos */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">1. Aceitação dos Termos</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Estes Termos de Serviço (&quot;Termos&quot;) constituem um acordo legal vinculante entre você
              (&quot;Usuário&quot;, &quot;você&quot; ou &quot;seu&quot;) e <strong>Comtxae Educação Cultura e Tecnologia Ltda.</strong>{' '}
              (&quot;Aica&quot;, &quot;nós&quot;, &quot;nosso&quot; ou &quot;nossa&quot;), e regem seu acesso e uso da plataforma AICA Life OS,
              incluindo todos os módulos, funcionalidades, APIs e serviços relacionados.
            </p>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Ao criar uma conta, acessar ou utilizar a Aica, você declara ter lido, compreendido e
              concordado integralmente com estes Termos e com nossa{' '}
              <a href="/privacy" className="text-ceramic-info hover:underline">
                Política de Privacidade
              </a>
              . Caso não concorde com qualquer disposição, você deve interromper imediatamente o uso
              da plataforma.
            </p>
            <p className="text-[#5C554B] leading-relaxed">
              Estes Termos aplicam-se a todos os usuários, incluindo visitantes, usuários registrados
              e assinantes de planos pagos.
            </p>
          </section>

          {/* 2. Descrição dos Serviços */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">2. Descrição dos Serviços</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica é um Sistema Operacional de Vida Integral (&quot;AICA Life OS&quot;) que integra
              produtividade pessoal e profissional através dos seguintes módulos:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li>
                <strong>Atlas</strong> &mdash; Gestão de tarefas com Matriz de Eisenhower e sincronização
                bidirecional com Google Calendar
              </li>
              <li>
                <strong>Jornada</strong> &mdash; Reflexão pessoal, registro de momentos e perguntas diárias
                para autoconhecimento
              </li>
              <li>
                <strong>Rede</strong> &mdash; CRM pessoal com organização de contatos por contexto e
                relacionamento
              </li>
              <li>
                <strong>Captação</strong> &mdash; Descoberta de oportunidades de financiamento e editais
                com assistência de IA
              </li>
              <li>
                <strong>Studio</strong> &mdash; Produção de podcasts com gestão de convidados e roteiros
                assistidos por IA
              </li>
              <li>
                <strong>Financeiro</strong> &mdash; Gestão de transações financeiras pessoais e profissionais
              </li>
            </ul>
            <p className="text-[#5C554B] leading-relaxed">
              A Aica poderá adicionar, modificar ou descontinuar módulos e funcionalidades a qualquer
              momento, mediante aviso prévio de <strong>30 (trinta) dias</strong> para alterações
              significativas.
            </p>
          </section>

          {/* 3. Conta de Usuário */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">3. Conta de Usuário</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Para utilizar a Aica, você deve:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li>Ter pelo menos <strong>18 (dezoito) anos</strong> de idade</li>
              <li>Fornecer informações precisas, completas e atualizadas durante o cadastro</li>
              <li>Manter a segurança e confidencialidade de sua senha e credenciais de acesso</li>
              <li>Notificar-nos imediatamente sobre qualquer uso não autorizado de sua conta</li>
            </ul>
            <p className="text-[#5C554B] leading-relaxed">
              Você é integralmente responsável por todas as atividades realizadas em sua conta,
              incluindo ações de terceiros que acessem sua conta por falha na proteção de suas
              credenciais. A Aica não se responsabiliza por perdas decorrentes de acesso não
              autorizado quando causado por negligência do Usuário na guarda de suas credenciais.
            </p>
          </section>

          {/* 4. Conduta do Usuário */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">4. Conduta do Usuário</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Ao utilizar a Aica, você concorda em NÃO:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Violar qualquer lei, regulamento ou norma aplicável, nacional ou internacional</li>
              <li>Infringir direitos de propriedade intelectual, marcas, patentes ou direitos autorais de terceiros</li>
              <li>Realizar engenharia reversa, descompilar, desmontar ou tentar extrair o código-fonte da plataforma</li>
              <li>Tentar obter acesso não autorizado a sistemas, redes, contas ou dados da Aica ou de terceiros</li>
              <li>Distribuir vírus, malware, ransomware, spyware ou qualquer código malicioso</li>
              <li>Fazer scraping, crawling ou coleta automatizada de dados sem autorização expressa por escrito</li>
              <li>Utilizar a plataforma para fins ilegais, fraudulentos ou não autorizados</li>
              <li>Assediar, abusar, ameaçar, difamar ou prejudicar outros usuários</li>
              <li>Representar falsamente sua identidade, afiliação ou vínculo com qualquer pessoa ou entidade</li>
              <li>Interferir no funcionamento adequado da plataforma ou sobrecarregar intencionalmente nossos servidores</li>
            </ul>
          </section>

          {/* 5. Propriedade Intelectual */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">5. Propriedade Intelectual</h2>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">5.1. Propriedade da Aica</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A plataforma AICA Life OS, incluindo todo o código-fonte, design, arquitetura,
              funcionalidades, conteúdo, marcas registradas, logotipos, identidade visual e demais
              materiais, são de propriedade exclusiva da Comtxae Educação Cultura e Tecnologia Ltda.
              ou de seus licenciadores e são protegidos pelas leis brasileiras e tratados
              internacionais de propriedade intelectual.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">5.2. Seu Conteúdo</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Você retém todos os direitos sobre o conteúdo que cria, insere ou armazena na
              plataforma (tarefas, notas, momentos, reflexões, dados financeiros, etc.). Ao utilizar
              a Aica, você nos concede uma licença <strong>limitada, não exclusiva e revogável</strong>{' '}
              para:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Armazenar, processar e exibir seu conteúdo para prestação dos serviços</li>
              <li>Realizar backups e manter cópias de segurança para proteção dos dados</li>
              <li>Utilizar dados agregados e anonimizados para fins de análise e melhoria da plataforma</li>
            </ul>
            <p className="text-[#5C554B] leading-relaxed mt-4">
              Esta licença é automaticamente revogada quando você exclui seu conteúdo ou encerra sua conta.
            </p>
          </section>

          {/* 6. Serviços de Inteligência Artificial */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">6. Serviços de Inteligência Artificial</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica utiliza a Google Gemini API para fornecer funcionalidades de inteligência
              artificial, incluindo insights personalizados, sugestões de produtividade, análise de
              padrões e assistência em diversas tarefas dos módulos.
            </p>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Ao utilizar os recursos de IA, você reconhece e concorda que:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>
                As recomendações de IA <strong>não constituem aconselhamento profissional</strong>{' '}
                (médico, psicológico, financeiro, jurídico ou de qualquer outra natureza)
              </li>
              <li>
                Os resultados gerados por IA podem conter imprecisões, erros ou informações
                desatualizadas
              </li>
              <li>
                Você é integralmente responsável por suas decisões e ações baseadas em recomendações
                de IA
              </li>
              <li>
                A Aica não garante resultados específicos decorrentes do uso de recursos de IA
              </li>
              <li>
                Você pode desabilitar funcionalidades de IA a qualquer momento nas configurações da
                plataforma
              </li>
              <li>
                Seus dados processados pela IA não são utilizados para treinar modelos de terceiros
              </li>
            </ul>
          </section>

          {/* 7. Integrações com Terceiros */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">7. Integrações com Terceiros</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica oferece integrações com os seguintes serviços de terceiros:
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">7.1. Google Calendar</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A integração com Google Calendar utiliza o escopo <code className="bg-[#F8F7F5] px-1.5 py-0.5 rounded text-sm">calendar.events</code>{' '}
              para sincronização bidirecional &mdash; leitura de eventos existentes e criação de
              novos eventos a partir de tarefas e compromissos gerenciados nos módulos Atlas e Flux.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">7.2. Telegram</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A integração com Telegram permite receber notificações e interagir com a plataforma
              através de mensagens.
            </p>

            <p className="text-[#5C554B] leading-relaxed mb-4">
              Em relação a todas as integrações com terceiros:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Cada integração é ativada individualmente pelo usuário (consentimento incremental)</li>
              <li>Você pode revogar qualquer integração a qualquer momento nas configurações da plataforma</li>
              <li>A Aica não se responsabiliza pela disponibilidade, segurança ou políticas dos serviços de terceiros</li>
              <li>Você deve revisar os termos e políticas dos serviços que escolher conectar</li>
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

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">8.1. Planos e Preços</h3>
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
                    <td className="py-3">Funcionalidades básicas de todos os módulos</td>
                  </tr>
                  <tr className="border-b border-[#E8E6E0]">
                    <td className="py-3 pr-4">Pro</td>
                    <td className="py-3 pr-4">R$ 39,90/mês</td>
                    <td className="py-3">Todos os módulos com IA completa e integrações avançadas</td>
                  </tr>
                  <tr className="border-b border-[#E8E6E0]">
                    <td className="py-3 pr-4">Teams</td>
                    <td className="py-3 pr-4">R$ 149,00/mês</td>
                    <td className="py-3">Pro + colaboração em equipe e gestão compartilhada</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4">Consultoria</td>
                    <td className="py-3 pr-4">Sob demanda</td>
                    <td className="py-3">Implementação personalizada e suporte dedicado</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">8.2. Métodos de Pagamento</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Aceitamos os seguintes métodos de pagamento: cartão de crédito/débito, PIX e Boleto
              Bancário. As assinaturas pagas são cobradas antecipadamente no início de cada ciclo
              de faturamento.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">8.3. Renovação e Cancelamento</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              As assinaturas são renovadas automaticamente ao final de cada ciclo, salvo cancelamento
              pelo Usuário. Você pode cancelar sua assinatura a qualquer momento através das
              configurações da plataforma. O cancelamento entra em vigor ao final do ciclo de
              faturamento vigente, mantendo o acesso até essa data. Preços estão sujeitos a
              alterações com aviso prévio de 30 (trinta) dias.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">8.4. Política de Reembolso</h3>
            <p className="text-[#5C554B] leading-relaxed">
              Em conformidade com o Art. 49 do Código de Defesa do Consumidor (CDC), o Usuário tem
              direito ao reembolso integral em até <strong>7 (sete) dias corridos</strong> a partir
              da contratação. Solicitações devem ser realizadas através do e-mail{' '}
              <a href="mailto:contato@aica.guru" className="text-ceramic-info hover:underline">
                contato@aica.guru
              </a>{' '}
              ou das configurações da plataforma.
            </p>
          </section>

          {/* 9. Programa de Convites */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">9. Programa de Convites</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica pode disponibilizar um programa de convites que permite aos usuários convidar
              terceiros para a plataforma. Em relação ao programa de convites:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>O número de convites disponíveis é limitado e definido pela Aica</li>
              <li>O convidante deve obter consentimento prévio do destinatário antes de enviar o convite</li>
              <li>Convites são pessoais e intransferíveis</li>
              <li>Convites não possuem valor monetário e não podem ser comercializados</li>
              <li>A Aica reserva-se o direito de descontinuar o programa de convites a qualquer momento</li>
              <li>O uso indevido do programa (spam, convites não solicitados) pode resultar em suspensão da conta</li>
            </ul>
          </section>

          {/* 10. Disponibilidade e Suporte */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">10. Disponibilidade e Suporte</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica se empenha em manter a plataforma disponível <strong>24 horas por dia,
              7 dias por semana</strong>. No entanto, interrupções programadas ou não programadas
              podem ocorrer para fins de manutenção, atualização ou por motivos de força maior.
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Manutenções programadas serão comunicadas com antecedência mínima de <strong>24 horas</strong></li>
              <li>Suporte por e-mail disponível em{' '}
                <a href="mailto:contato@aica.guru" className="text-ceramic-info hover:underline">
                  contato@aica.guru
                </a>
              </li>
              <li>Prazo de resposta para usuários do plano gratuito: até <strong>48 horas úteis</strong></li>
              <li>Prazo de resposta para usuários de planos pagos: até <strong>24 horas úteis</strong></li>
            </ul>
          </section>

          {/* 11. Limitação de Responsabilidade */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">11. Limitação de Responsabilidade</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A plataforma é fornecida <strong>&quot;COMO ESTÁ&quot;</strong> e{' '}
              <strong>&quot;CONFORME DISPONÍVEL&quot;</strong>, sem garantias de qualquer natureza,
              expressas ou implícitas. Na extensão máxima permitida pela legislação aplicável, a
              Aica não será responsável por:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li>Danos indiretos, incidentais, especiais, consequenciais ou punitivos</li>
              <li>Perda de dados, lucros cessantes ou interrupção de negócios</li>
              <li>Decisões tomadas com base em recomendações geradas por IA</li>
              <li>Indisponibilidade de serviços de terceiros integrados (Google Calendar, Telegram)</li>
              <li>Imprecisões, erros ou omissões em conteúdo gerado por inteligência artificial</li>
            </ul>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A responsabilidade total da Aica perante o Usuário, por qualquer causa e
              independentemente da forma da ação, está limitada ao <strong>maior valor entre:
              (a) o total de pagamentos realizados pelo Usuário nos últimos 12 (doze) meses; ou
              (b) R$ 500,00 (quinhentos reais)</strong>.
            </p>
            <p className="text-[#5C554B] leading-relaxed">
              Esta limitação não afeta os direitos irrenunciáveis do consumidor previstos no Código
              de Defesa do Consumidor (CDC) e na legislação aplicável.
            </p>
          </section>

          {/* 12. Suspensão e Encerramento */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">12. Suspensão e Encerramento</h2>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">12.1. Encerramento pelo Usuário</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Você pode encerrar sua conta a qualquer momento através das configurações da
              plataforma ou entrando em contato com o suporte em{' '}
              <a href="mailto:contato@aica.guru" className="text-ceramic-info hover:underline">
                contato@aica.guru
              </a>
              . Após o encerramento, seus dados serão removidos conforme nossa política de retenção
              de dados descrita na{' '}
              <a href="/privacy" className="text-ceramic-info hover:underline">
                Política de Privacidade
              </a>
              .
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">12.2. Suspensão ou Encerramento pela Aica</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica poderá suspender ou encerrar sua conta mediante aviso prévio de{' '}
              <strong>15 (quinze) dias</strong>, exceto em casos de violações graves (fraude, acesso
              não autorizado, atividades ilegais), nos quais a suspensão poderá ser imediata.
              Motivos incluem:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Violação destes Termos de Serviço</li>
              <li>Uso da plataforma de maneira prejudicial, abusiva ou fraudulenta</li>
              <li>Fornecimento de informações falsas ou enganosas</li>
              <li>Inadimplência em relação a planos pagos</li>
              <li>Determinação judicial ou administrativa</li>
            </ul>
          </section>

          {/* 13. Modificações dos Termos */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">13. Modificações dos Termos</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica poderá modificar estes Termos periodicamente. Alterações significativas serão
              comunicadas com antecedência mínima de <strong>30 (trinta) dias</strong> através de:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li>Notificação por e-mail para o endereço cadastrado</li>
              <li>Aviso destacado na plataforma (in-app)</li>
              <li>Atualização da data &quot;Última atualização&quot; no topo desta página</li>
            </ul>
            <p className="text-[#5C554B] leading-relaxed">
              Caso você não concorde com as modificações, você deverá interromper o uso da
              plataforma, solicitar a exclusão de sua conta e, se aplicável, terá direito ao
              reembolso proporcional ao período não utilizado de sua assinatura.
            </p>
          </section>

          {/* 14. Resolução de Disputas */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">14. Resolução de Disputas</h2>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">14.1. Lei Aplicável</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Para usuários
              residentes na União Europeia/Espaço Econômico Europeu (UE/EEE), os direitos conferidos
              pela legislação local de proteção ao consumidor permanecem preservados. Para residentes
              na Califórnia (EUA), os direitos conferidos pela CCPA/CPRA são igualmente preservados.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">14.2. Resolução Informal</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Antes de iniciar qualquer procedimento formal, as partes se comprometem a buscar
              resolução amigável da disputa. O Usuário deverá entrar em contato através do e-mail{' '}
              <a href="mailto:contato@aica.guru" className="text-ceramic-info hover:underline">
                contato@aica.guru
              </a>
              , e a Aica terá o prazo de <strong>30 (trinta) dias</strong> para responder e buscar
              uma solução.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">14.3. Foro</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Fica eleito o foro da <strong>comarca do Rio de Janeiro, Estado do Rio de Janeiro</strong>,
              para dirimir quaisquer controvérsias oriundas destes Termos, ressalvado o direito do
              consumidor de optar pelo foro de seu domicílio, conforme Art. 101 do CDC.
            </p>
            <p className="text-[#5C554B] leading-relaxed">
              Para usuários internacionais, a Aica oferece a opção de mediação online como
              alternativa para resolução de disputas.
            </p>
          </section>

          {/* 15. Disposições Gerais */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">15. Disposições Gerais</h2>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">15.1. Acordo Completo</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Estes Termos, juntamente com a{' '}
              <a href="/privacy" className="text-ceramic-info hover:underline">
                Política de Privacidade
              </a>
              , constituem o acordo completo entre você e a Aica, substituindo quaisquer acordos
              anteriores, escritos ou verbais.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">15.2. Divisibilidade</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Se qualquer disposição destes Termos for considerada inválida ou inexequível por
              autoridade competente, as demais disposições permanecerão em pleno vigor e efeito.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">15.3. Renúncia</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A falha ou atraso no exercício de qualquer direito previsto nestes Termos não
              constitui renúncia a esse direito, podendo ser exercido a qualquer momento.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">15.4. Cessão</h3>
            <p className="text-[#5C554B] leading-relaxed">
              Você não poderá transferir ou ceder seus direitos e obrigações sob estes Termos sem
              o consentimento prévio por escrito da Aica. A Aica poderá transferir seus direitos
              e obrigações mediante notificação prévia ao Usuário.
            </p>
          </section>

          {/* 16. Contato */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">16. Contato</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Para dúvidas, solicitações ou reclamações relacionadas a estes Termos de Serviço,
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
                <strong>Importante:</strong> Ao usar a Aica, você confirma que leu, compreendeu e
                concorda com estes Termos de Serviço e nossa{' '}
                <a href="/privacy" className="text-ceramic-info hover:underline font-medium">
                  Política de Privacidade
                </a>
                . Se você não concorda com estes termos, não utilize nossos serviços.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#F8F7F5] border-t border-[#E8E6E0] py-8 mt-16">
        <div className="max-w-[900px] mx-auto px-6 md:px-8 text-center">
          <p className="text-sm text-[#5C554B]">
            &copy; {new Date().getFullYear()} Comtxae Educação Cultura e Tecnologia Ltda. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default TermsOfServicePage;
