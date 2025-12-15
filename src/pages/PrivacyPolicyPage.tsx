import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * PrivacyPolicyPage Component
 *
 * Displays the privacy policy for the Aica application.
 * Required for compliance with Brazilian LGPD and other data protection regulations.
 */
export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E8E6E0]">
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
          Política de Privacidade
        </h1>
        <p className="text-sm text-[#5C554B] mb-8">
          Última atualização: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>

        <div className="prose prose-slate max-w-none space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">1. Introdução</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica ("nós", "nosso" ou "nossa") está comprometida em proteger sua privacidade.
              Esta Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos
              suas informações pessoais quando você utiliza nossa plataforma de gestão de vida e produtividade.
            </p>
            <p className="text-[#5C554B] leading-relaxed">
              Ao usar a Aica, você concorda com a coleta e uso de informações de acordo com esta política.
              Estamos em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            </p>
          </section>

          {/* Information Collection */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">2. Informações que Coletamos</h2>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">2.1. Informações Fornecidas por Você</h3>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B] mb-4">
              <li>Dados de cadastro (nome, e-mail, senha)</li>
              <li>Informações de perfil (foto, preferências, configurações)</li>
              <li>Conteúdo que você cria (tarefas, notas, momentos, conexões)</li>
              <li>Dados de calendário (quando você conecta seu calendário)</li>
              <li>Informações financeiras (quando você utiliza o módulo de finanças)</li>
              <li>Comunicações conosco (feedback, suporte)</li>
            </ul>

            <h3 className="text-xl font-semibold text-[#2B1B17] mb-3">2.2. Informações Coletadas Automaticamente</h3>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Informações de uso e interação com a plataforma</li>
              <li>Dados de dispositivo (tipo, sistema operacional, navegador)</li>
              <li>Endereço IP e dados de localização aproximada</li>
              <li>Cookies e tecnologias similares</li>
              <li>Métricas de desempenho e estatísticas de uso</li>
            </ul>
          </section>

          {/* Information Use */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">3. Como Usamos Suas Informações</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Utilizamos suas informações pessoais para os seguintes propósitos:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Fornecer, manter e melhorar nossos serviços</li>
              <li>Personalizar sua experiência e oferecer recursos adaptados às suas necessidades</li>
              <li>Processar transações e gerenciar sua conta</li>
              <li>Enviar notificações, atualizações e comunicações relacionadas ao serviço</li>
              <li>Gerar insights e análises sobre seu crescimento pessoal e produtividade</li>
              <li>Detectar, prevenir e resolver problemas técnicos</li>
              <li>Cumprir obrigações legais e regulatórias</li>
            </ul>
          </section>

          {/* AI and Data Processing */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">4. Inteligência Artificial e Processamento de Dados</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              A Aica utiliza tecnologias de inteligência artificial para fornecer insights personalizados
              e melhorar sua experiência. Importante saber:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Seus dados são processados por modelos de IA para gerar recomendações e análises</li>
              <li>Podemos utilizar serviços de terceiros (como Google Gemini) para processamento de IA</li>
              <li>Seus dados não são usados para treinar modelos de IA públicos</li>
              <li>Você pode optar por não usar recursos de IA a qualquer momento</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">5. Compartilhamento de Dados</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Nós não vendemos suas informações pessoais. Podemos compartilhar seus dados apenas nas seguintes situações:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li><strong>Provedores de Serviços:</strong> Com terceiros que nos ajudam a operar a plataforma (hospedagem, análise, suporte)</li>
              <li><strong>Integrações Autorizadas:</strong> Quando você conecta serviços de terceiros (Google Calendar, etc.)</li>
              <li><strong>Obrigações Legais:</strong> Quando exigido por lei ou para proteger direitos legais</li>
              <li><strong>Mudanças Corporativas:</strong> Em caso de fusão, aquisição ou venda de ativos</li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">6. Segurança dos Dados</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li>Criptografia de dados em trânsito e em repouso</li>
              <li>Controles de acesso rigorosos</li>
              <li>Monitoramento contínuo de segurança</li>
              <li>Auditorias regulares de segurança</li>
              <li>Políticas de Row Level Security (RLS) no banco de dados</li>
            </ul>
          </section>

          {/* User Rights */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">7. Seus Direitos (LGPD)</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              De acordo com a LGPD, você tem os seguintes direitos:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li><strong>Acesso:</strong> Solicitar cópia dos seus dados pessoais</li>
              <li><strong>Correção:</strong> Atualizar dados incompletos ou incorretos</li>
              <li><strong>Exclusão:</strong> Solicitar a exclusão dos seus dados</li>
              <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado</li>
              <li><strong>Revogação de Consentimento:</strong> Retirar consentimento a qualquer momento</li>
              <li><strong>Oposição:</strong> Opor-se ao processamento de seus dados</li>
              <li><strong>Informação:</strong> Saber com quem compartilhamos seus dados</li>
            </ul>
            <p className="text-[#5C554B] leading-relaxed mt-4">
              Para exercer seus direitos, entre em contato conosco através do e-mail: contato@comtxae.com
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">8. Retenção de Dados</h2>
            <p className="text-[#5C554B] leading-relaxed">
              Mantemos suas informações pessoais pelo tempo necessário para cumprir os propósitos descritos
              nesta política, a menos que um período de retenção mais longo seja exigido ou permitido por lei.
              Quando você solicita a exclusão da sua conta, removemos seus dados pessoais de nossos sistemas
              ativos, exceto quando precisamos retê-los por obrigações legais.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">9. Cookies e Tecnologias Similares</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Utilizamos cookies e tecnologias similares para melhorar sua experiência:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#5C554B]">
              <li><strong>Cookies Essenciais:</strong> Necessários para o funcionamento da plataforma</li>
              <li><strong>Cookies de Desempenho:</strong> Para análise e melhoria do serviço</li>
              <li><strong>Cookies de Funcionalidade:</strong> Para lembrar suas preferências</li>
            </ul>
            <p className="text-[#5C554B] leading-relaxed mt-4">
              Você pode gerenciar suas preferências de cookies nas configurações do seu navegador.
            </p>
          </section>

          {/* Children Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">10. Privacidade de Menores</h2>
            <p className="text-[#5C554B] leading-relaxed">
              A Aica não é destinada a menores de 18 anos. Não coletamos intencionalmente informações pessoais
              de crianças e adolescentes. Se você é pai/mãe ou responsável e acredita que seu filho forneceu
              informações pessoais para nós, entre em contato para que possamos remover essas informações.
            </p>
          </section>

          {/* International Transfers */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">11. Transferências Internacionais</h2>
            <p className="text-[#5C554B] leading-relaxed">
              Suas informações podem ser transferidas e mantidas em servidores localizados fora do Brasil.
              Quando isso ocorrer, garantimos que medidas de segurança adequadas estejam em vigor para proteger
              suas informações de acordo com a LGPD e outros padrões internacionais de proteção de dados.
            </p>
          </section>

          {/* Policy Changes */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">12. Alterações nesta Política</h2>
            <p className="text-[#5C554B] leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre alterações
              significativas através de um aviso destacado em nossa plataforma ou por e-mail. Recomendamos que
              você revise esta política regularmente para se manter informado sobre como protegemos suas informações.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-[#2B1B17] mb-4">13. Contato</h2>
            <p className="text-[#5C554B] leading-relaxed mb-4">
              Se você tiver dúvidas sobre esta Política de Privacidade ou sobre como tratamos seus dados pessoais,
              entre em contato conosco:
            </p>
            <div className="bg-[#F8F7F5] border border-[#E8E6E0] rounded-lg p-6">
              <p className="text-[#5C554B]"><strong>E-mail:</strong> contato@comtxae.com</p>
            </div>
          </section>

          {/* Legal Framework */}
          <section className="mt-8 pt-8 border-t border-[#E8E6E0]">
            <p className="text-sm text-[#5C554B] leading-relaxed">
              Esta Política de Privacidade está em conformidade com:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-[#5C554B] mt-2">
              <li>Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)</li>
              <li>Marco Civil da Internet (Lei nº 12.965/2014)</li>
              <li>Código de Defesa do Consumidor (Lei nº 8.078/1990)</li>
            </ul>
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

export default PrivacyPolicyPage;
