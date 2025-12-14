/**
 * Connection Hooks - Usage Examples
 *
 * Este arquivo contém exemplos práticos de uso dos hooks do módulo Connections.
 * NÃO É PARA SER IMPORTADO - apenas para referência e documentação.
 */

import { useState } from 'react';
import {
  useSpaces,
  useSpace,
  useSpaceMembers,
  useSpaceEvents,
  useUpcomingEvents,
} from './index';

// ============================================================================
// EXEMPLO 1: Lista de Spaces com Filtro por Arquétipo
// ============================================================================

export function HabitatSpacesList() {
  const { spaces, loading, error, createSpace, toggleFavorite } = useSpaces({
    archetype: 'habitat'
  });

  const handleCreateSpace = async () => {
    try {
      await createSpace({
        archetype: 'habitat',
        name: 'Minha Casa',
        subtitle: 'Residência Familiar',
        description: 'Gestão da casa e condomínio',
        icon: '🏠',
        color_theme: 'earth'
      });
    } catch (err) {
      console.error('Erro ao criar space:', err);
    }
  };

  if (loading) return <div>Carregando spaces...</div>;
  if (error) return <div>Erro: {error.message}</div>;

  return (
    <div>
      <button onClick={handleCreateSpace}>Criar Novo Habitat</button>

      <div className="spaces-grid">
        {spaces.map((space) => (
          <div key={space.id} className="space-card">
            <h3>{space.icon} {space.name}</h3>
            <p>{space.subtitle}</p>
            <button onClick={() => toggleFavorite(space.id)}>
              {space.is_favorite ? '⭐' : '☆'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLO 2: Detalhes de um Space com Membros
// ============================================================================

export function SpaceDetailView({ spaceId }: { spaceId: string }) {
  const { space, loading, updateSpace, deleteSpace } = useSpace(spaceId);
  const { members, isAdmin } = useSpaceMembers(spaceId);

  const handleUpdate = async () => {
    try {
      await updateSpace({
        name: 'Nome Atualizado',
        description: 'Nova descrição do space'
      });
    } catch (err) {
      console.error('Erro ao atualizar:', err);
    }
  };

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja deletar este space?')) {
      try {
        await deleteSpace();
        // Redirecionar para lista de spaces
      } catch (err) {
        console.error('Erro ao deletar:', err);
      }
    }
  };

  if (loading) return <div>Carregando...</div>;
  if (!space) return <div>Space não encontrado</div>;

  return (
    <div>
      <header>
        <h1>{space.icon} {space.name}</h1>
        <p>{space.subtitle}</p>
        {isAdmin && (
          <div>
            <button onClick={handleUpdate}>Editar</button>
            <button onClick={handleDelete}>Deletar</button>
          </div>
        )}
      </header>

      <section>
        <h2>Membros ({members.length})</h2>
        {members.map((member) => (
          <div key={member.id}>
            {member.external_name || 'Usuário'} - {member.role}
          </div>
        ))}
      </section>
    </div>
  );
}

// ============================================================================
// EXEMPLO 3: Gerenciamento de Membros
// ============================================================================

export function MemberManagement({ spaceId }: { spaceId: string }) {
  const {
    members,
    loading,
    isAdmin,
    addMember,
    removeMember,
    updateRole
  } = useSpaceMembers(spaceId);

  const [showAddForm, setShowAddForm] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await addMember({
        external_name: memberName,
        external_email: memberEmail,
        role: 'member'
      });

      setMemberName('');
      setMemberEmail('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Erro ao adicionar membro:', err);
    }
  };

  const handlePromoteToAdmin = async (memberId: string) => {
    try {
      await updateRole(memberId, 'admin');
    } catch (err) {
      console.error('Erro ao promover membro:', err);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (confirm(`Remover ${memberName} do space?`)) {
      try {
        await removeMember(memberId);
      } catch (err) {
        console.error('Erro ao remover membro:', err);
      }
    }
  };

  if (loading) return <div>Carregando membros...</div>;

  return (
    <div>
      <h2>Membros</h2>

      {isAdmin && (
        <button onClick={() => setShowAddForm(true)}>
          Adicionar Membro
        </button>
      )}

      {showAddForm && (
        <form onSubmit={handleAddMember}>
          <input
            type="text"
            placeholder="Nome"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            required
          />
          <button type="submit">Adicionar</button>
          <button onClick={() => setShowAddForm(false)}>Cancelar</button>
        </form>
      )}

      <div className="members-list">
        {members.map((member) => (
          <div key={member.id} className="member-item">
            <div>
              <strong>{member.external_name || 'Usuário'}</strong>
              <span className="role-badge">{member.role}</span>
            </div>

            {isAdmin && member.role !== 'owner' && (
              <div className="member-actions">
                {member.role !== 'admin' && (
                  <button onClick={() => handlePromoteToAdmin(member.id)}>
                    Promover a Admin
                  </button>
                )}
                <button onClick={() => handleRemoveMember(member.id, member.external_name || 'Usuário')}>
                  Remover
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLO 4: Calendário de Eventos
// ============================================================================

export function SpaceCalendar({ spaceId }: { spaceId: string }) {
  const {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent
  } = useSpaceEvents(spaceId, {
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // próximos 30 dias
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createEvent({
        title: eventTitle,
        starts_at: new Date(eventDate).toISOString(),
        location: eventLocation,
        rsvp_enabled: true
      });

      setEventTitle('');
      setEventDate('');
      setEventLocation('');
      setShowCreateForm(false);
    } catch (err) {
      console.error('Erro ao criar evento:', err);
    }
  };

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    if (confirm(`Deletar evento "${eventTitle}"?`)) {
      try {
        await deleteEvent(eventId);
      } catch (err) {
        console.error('Erro ao deletar evento:', err);
      }
    }
  };

  if (loading) return <div>Carregando eventos...</div>;

  return (
    <div>
      <h2>Calendário de Eventos</h2>

      <button onClick={() => setShowCreateForm(true)}>
        Novo Evento
      </button>

      {showCreateForm && (
        <form onSubmit={handleCreateEvent}>
          <input
            type="text"
            placeholder="Título do evento"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            required
          />
          <input
            type="datetime-local"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Local (opcional)"
            value={eventLocation}
            onChange={(e) => setEventLocation(e.target.value)}
          />
          <button type="submit">Criar Evento</button>
          <button onClick={() => setShowCreateForm(false)}>Cancelar</button>
        </form>
      )}

      <div className="events-list">
        {events.length === 0 ? (
          <p>Nenhum evento agendado</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="event-item">
              <h3>{event.title}</h3>
              <p>📅 {new Date(event.starts_at).toLocaleString('pt-BR')}</p>
              {event.location && <p>📍 {event.location}</p>}
              <button onClick={() => handleDeleteEvent(event.id, event.title)}>
                Deletar
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLO 5: Dashboard com Próximos Eventos
// ============================================================================

export function UpcomingEventsDashboard() {
  const { upcomingEvents, loading, error } = useUpcomingEvents(5);

  if (loading) return <div>Carregando próximos eventos...</div>;
  if (error) return <div>Erro: {error.message}</div>;

  return (
    <div className="upcoming-events-widget">
      <h2>Próximos Eventos</h2>

      {upcomingEvents.length === 0 ? (
        <p>Nenhum evento próximo</p>
      ) : (
        <div className="events-timeline">
          {upcomingEvents.map((event) => (
            <div key={event.id} className="timeline-item">
              <div className="event-space">
                {event.space.icon} {event.space.name}
              </div>
              <div className="event-details">
                <h3>{event.title}</h3>
                <p>{new Date(event.starts_at).toLocaleString('pt-BR')}</p>
                {event.location && <p>📍 {event.location}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXEMPLO 6: Combinando Múltiplos Hooks
// ============================================================================

export function CompleteDashboard() {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>();

  // Lista de todos os spaces
  const { spaces, loading: spacesLoading } = useSpaces();

  // Space selecionado
  const { space } = useSpace(selectedSpaceId);

  // Membros do space selecionado
  const { members } = useSpaceMembers(selectedSpaceId);

  // Eventos do space selecionado
  const { events } = useSpaceEvents(selectedSpaceId);

  // Próximos eventos de todos os spaces
  const { upcomingEvents } = useUpcomingEvents(3);

  if (spacesLoading) return <div>Carregando...</div>;

  return (
    <div className="dashboard">
      {/* Sidebar com lista de spaces */}
      <aside>
        <h2>Meus Spaces</h2>
        {spaces.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSpaceId(s.id)}
            className={selectedSpaceId === s.id ? 'active' : ''}
          >
            {s.icon} {s.name}
          </button>
        ))}
      </aside>

      {/* Conteúdo principal */}
      <main>
        {selectedSpaceId && space ? (
          <>
            <h1>{space.name}</h1>

            <section>
              <h2>Membros ({members.length})</h2>
              {/* Lista de membros */}
            </section>

            <section>
              <h2>Próximos Eventos ({events.length})</h2>
              {/* Lista de eventos */}
            </section>
          </>
        ) : (
          <div>
            <h1>Bem-vindo!</h1>
            <p>Selecione um space na barra lateral</p>
          </div>
        )}
      </main>

      {/* Widget lateral */}
      <aside>
        <h2>Próximos Eventos</h2>
        {upcomingEvents.map((event) => (
          <div key={event.id}>
            {event.title} - {event.space.name}
          </div>
        ))}
      </aside>
    </div>
  );
}
