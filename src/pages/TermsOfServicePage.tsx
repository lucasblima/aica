import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * TermsOfServicePage Component
 *
 * Displays the terms of service for the Aica application.
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
          Última atualização: 17 de fevereiro de 2026
        </p>

        <div className="prose prose-slate max-w-none space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">1. Aceitação dos Termos</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Bem-vindo à Aica! Estes Termos de Serviço ("Termos") constituem um acordo legal entre você
              ("Usuário", "você" ou "seu") e a Aica ("nós", "nosso" ou "nossa") e regem seu acesso e uso
              da plataforma Aica, incluindo todos os recursos, ferramentas e serviços disponibilizados.
            </p>
            <p className="text-[#5C554B] leading-relaxed">
              Ao criar uma conta, acessar ou usar a Aica, você concorda em cumprir estes Termos e nossa
              Política de Privacidade. Se você não concorda com estes Termos, não use nossos serviços.
            </p>
          </section>

          {/* Service Description */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">2. Descrição do Serviço</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica é uma plataforma de gestão de vida e produtividade que oferece:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Gestão de tarefas e projetos pessoais e profissionais</li>
              <li>Integração com calendários e ferramentas de produtividade</li>
              <li>Insights personalizados através de inteligência artificial</li>
              <li>Módulos especializados (finanças, conexões, jornada pessoal, etc.)</li>
              <li>Ferramentas de autoconhecimento e crescimento pessoal</li>
              <li>Recursos de podcast e copilot de conteúdo</li>
            </ul>
            <p className="text-[#5C554B] leading-relaxed mt-4">
              A Aica está atualmente em fase beta, o que significa que novos recursos estão sendo
              desenvolvidos e melhorias contínuas estão sendo implementadas.
            </p>
          </section>

          {/* Account Registration */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">3. Cadastro e Conta de Usuário</h2>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">3.1. Requisitos</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Para usar a Aica, você deve:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li>Ter pelo menos 18 anos de idade</li>
              <li>Fornecer informações precisas e completas durante o cadastro</li>
              <li>Manter suas informações de conta atualizadas</li>
              <li>Ser responsável por manter a confidencialidade de sua senha</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">3.2. Segurança da Conta</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Você é responsável por:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Todas as atividades que ocorram em sua conta</li>
              <li>Notificar-nos imediatamente sobre qualquer uso não autorizado</li>
              <li>Não compartilhar suas credenciais com terceiros</li>
            </ul>
          </section>

          {/* User Conduct */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">4. Conduta do Usuário</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Ao usar a Aica, você concorda em NÃO:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Violar qualquer lei ou regulamento aplicável</li>
              <li>Infringir direitos de propriedade intelectual de terceiros</li>
              <li>Fazer engenharia reversa, descompilar ou desmontar a plataforma</li>
              <li>Usar a plataforma para fins ilegais ou não autorizados</li>
              <li>Tentar obter acesso não autorizado a sistemas ou dados</li>
              <li>Distribuir vírus, malware ou código malicioso</li>
              <li>Fazer scraping ou coleta automatizada de dados sem permissão</li>
              <li>Interferir no funcionamento adequado da plataforma</li>
              <li>Representar falsamente sua identidade ou afiliação</li>
              <li>Assediar, abusar ou prejudicar outros usuários</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">5. Propriedade Intelectual</h2>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">5.1. Propriedade da Aica</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A plataforma Aica, incluindo todo o código-fonte, design, funcionalidades, conteúdo,
              marcas registradas, logotipos e outros materiais, são de propriedade exclusiva da Aica
              ou de seus licenciadores e são protegidos por leis de propriedade intelectual.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">5.2. Seu Conteúdo</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Você retém todos os direitos sobre o conteúdo que cria na plataforma (tarefas, notas,
              momentos, etc.). Ao usar a Aica, você nos concede uma licença limitada para:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Armazenar e processar seu conteúdo para fornecer os serviços</li>
              <li>Fazer backup e manter cópias de segurança</li>
              <li>Usar dados agregados e anonimizados para melhorar a plataforma</li>
            </ul>
          </section>

          {/* AI Services */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">6. Serviços de Inteligência Artificial</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica utiliza tecnologias de IA para fornecer insights e recomendações personalizadas:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>As sugestões de IA são baseadas em seus dados e padrões de uso</li>
              <li>Os insights de IA são fornecidos "como estão" e podem conter imprecisões</li>
              <li>Você é responsável por suas decisões baseadas em recomendações de IA</li>
              <li>Não garantimos resultados específicos do uso de recursos de IA</li>
              <li>Você pode optar por desabilitar recursos de IA a qualquer momento</li>
            </ul>
          </section>

          {/* Third-Party Integrations */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">7. Integrações de Terceiros</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica permite integração com serviços de terceiros, incluindo Google Calendar, Gmail e Google Drive:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Você é responsável por seus relacionamentos com esses provedores</li>
              <li>Não somos responsáveis pelos serviços ou políticas de terceiros</li>
              <li>Revise os termos e políticas dos serviços que você conecta</li>
              <li>Você pode revogar integrações a qualquer momento nas configurações</li>
              <li>A integração com Google Calendar utiliza o escopo <code>calendar.events</code> para sincronização bidirecional — leitura e criação de eventos a partir de tarefas e compromissos</li>
              <li>A integração com Gmail utiliza o escopo <code>gmail.modify</code> — leitura e organização de mensagens (arquivar, etiquetar, marcar como lido, mover para lixeira), sem envio de emails</li>
              <li>A integração com Google Drive utiliza o escopo <code>drive</code> — leitura e organização de arquivos (renomear, mover, enviar para lixeira, criar pastas)</li>
              <li>Gmail e Drive são integrações opcionais ativadas individualmente pelo usuário (consentimento incremental)</li>
              <li>O uso de dados do Google está em conformidade com a{' '}
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

          {/* Payment Terms */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">8. Termos de Pagamento</h2>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">8.1. Planos e Preços</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica pode oferecer diferentes planos de assinatura (gratuitos e pagos). Durante a fase
              beta, recursos premium podem estar disponíveis gratuitamente.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">8.2. Cobrança</h3>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li>Assinaturas pagas são cobradas antecipadamente</li>
              <li>Você autoriza cobranças recorrentes em seu método de pagamento</li>
              <li>Preços estão sujeitos a alterações com aviso prévio de 30 dias</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">8.3. Reembolsos</h3>
            <p className="text-[#5C554B] leading-relaxed">
              Reembolsos são fornecidos de acordo com nossa política de reembolso. Entre em contato
              com o suporte se tiver problemas com cobranças.
            </p>
          </section>

          {/* Beta Service */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">9. Serviço Beta</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica está atualmente em fase beta. Isso significa:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>O serviço pode conter bugs ou instabilidades</li>
              <li>Recursos podem ser adicionados, modificados ou removidos</li>
              <li>Pode haver interrupções ocasionais no serviço</li>
              <li>Fazemos backup regular, mas você deve manter cópias próprias de dados críticos</li>
              <li>Seu feedback é essencial para melhorarmos a plataforma</li>
            </ul>
          </section>

          {/* Disclaimers */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">10. Isenções de Responsabilidade</h2>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">10.1. Serviço "Como Está"</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica é fornecida "como está" e "conforme disponível", sem garantias de qualquer tipo,
              expressas ou implícitas. Não garantimos que o serviço será ininterrupto, seguro ou livre de erros.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">10.2. Não Somos Profissionais Licenciados</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica não fornece aconselhamento médico, psicológico, financeiro, jurídico ou profissional.
              Os insights e recomendações são apenas para fins informativos. Consulte profissionais
              qualificados para decisões importantes.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">10.3. Limitação de Responsabilidade</h3>
            <p className="text-[#5C554B] leading-relaxed">
              Na extensão máxima permitida por lei, a Aica não será responsável por quaisquer danos
              indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo perda de lucros,
              dados ou goodwill, resultantes do uso ou incapacidade de usar nossos serviços.
            </p>
          </section>

          {/* Data and Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">11. Dados e Privacidade</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Seu uso da Aica também é regido por nossa Política de Privacidade, que descreve como
              coletamos, usamos e protegemos suas informações pessoais. Recomendamos que você leia
              nossa Política de Privacidade cuidadosamente.
            </p>
            <p className="text-[#5C554B] leading-relaxed">
              Estamos comprometidos com a proteção de seus dados de acordo com a LGPD (Lei Geral de
              Proteção de Dados - Lei nº 13.709/2018).
            </p>
          </section>

          {/* Account Termination */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">12. Suspensão e Encerramento</h2>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">12.1. Por Você</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Você pode encerrar sua conta a qualquer momento através das configurações da plataforma
              ou entrando em contato com o suporte. Ao encerrar sua conta, você perderá acesso aos
              seus dados.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">12.2. Por Nós</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Reservamos o direito de suspender ou encerrar sua conta se você:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Violar estes Termos de Serviço</li>
              <li>Usar a plataforma de maneira prejudicial ou abusiva</li>
              <li>Fornecer informações falsas ou enganosas</li>
              <li>Não pagar taxas devidas (se aplicável)</li>
            </ul>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">13. Modificações dos Termos</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Podemos atualizar estes Termos de Serviço periodicamente. Quando fizermos alterações
              significativas, notificaremos você através de:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li>Aviso na plataforma</li>
              <li>E-mail para o endereço cadastrado</li>
              <li>Atualização da data "Última atualização" no topo desta página</li>
            </ul>
            <p className="text-[#5C554B] leading-relaxed">
              Seu uso continuado da Aica após as alterações constitui aceitação dos novos termos.
              Se você não concorda com as alterações, deve parar de usar nossos serviços.
            </p>
          </section>

          {/* Dispute Resolution */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">14. Resolução de Disputas</h2>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">14.1. Lei Aplicável</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Estes Termos são regidos pelas leis da República Federativa do Brasil.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">14.2. Foro</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Qualquer disputa decorrente destes Termos será resolvida nos tribunais competentes
              do Brasil.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">14.3. Resolução Informal</h3>
            <p className="text-[#5C554B] leading-relaxed">
              Antes de iniciar qualquer procedimento formal, encorajamos você a entrar em contato
              conosco para tentar resolver a disputa de forma amigável.
            </p>
          </section>

          {/* General Provisions */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">15. Disposições Gerais</h2>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">15.1. Acordo Completo</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Estes Termos, juntamente com nossa Política de Privacidade, constituem o acordo completo
              entre você e a Aica.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">15.2. Divisibilidade</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Se qualquer disposição destes Termos for considerada inválida, as demais disposições
              permanecerão em pleno vigor e efeito.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">15.3. Renúncia</h3>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A falha em fazer cumprir qualquer disposição destes Termos não constitui renúncia
              desse direito.
            </p>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">15.4. Cessão</h3>
            <p className="text-[#5C554B] leading-relaxed">
              Você não pode transferir ou ceder seus direitos sob estes Termos sem nosso consentimento
              prévio por escrito. Podemos transferir nossos direitos a qualquer momento.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">16. Contato</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Se você tiver dúvidas sobre estes Termos de Serviço, entre em contato conosco:
            </p>
            <div className="bg-[#F8F7F5] border border-[#E8E6E0] rounded-lg p-6">
              <p className="text-[#5C554B]"><strong>E-mail:</strong> contato@aica.guru</p>
            </div>
          </section>

          {/* Acknowledgment */}
          <section className="mt-8 pt-8 border-t border-[#E8E6E0]">
            <div className="bg-ceramic-info/10 border border-ceramic-info/30 rounded-lg p-6">
              <p className="text-sm text-ceramic-info leading-relaxed">
                <strong>Importante:</strong> Ao usar a Aica, você reconhece que leu, compreendeu e
                concorda em cumprir estes Termos de Serviço e nossa Política de Privacidade. Se você
                não concorda com estes termos, não use nossos serviços.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#F8F7F5] border-t border-[#E8E6E0] py-8 mt-16">
        <div className="max-w-[900px] mx-auto px-6 md:px-8 text-center">
          <p className="text-sm text-[#5C554B]">
            © {new Date().getFullYear()} Aica. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default TermsOfServicePage;
