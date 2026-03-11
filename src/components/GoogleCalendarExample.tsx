/**
 * EXEMPLO COMPLETO: Google Calendar Integration
 *
 * Este arquivo demonstra como usar a integração Google Calendar
 * em diferentes contextos da aplicação.
 *
 * REMOVER ESTE ARQUIVO ANTES DE ENVIAR PARA PRODUÇÃO
 */

import React from 'react';
import GoogleCalendarConnect from './GoogleCalendarConnect';
import GoogleCalendarEventsList from './GoogleCalendarEventsList';
import { useGoogleCalendarEvents } from '../hooks/useGoogleCalendarEvents';

/**
 * Exemplo 1: Component simples de conexão
 */
export function ExampleSimpleConnect() {
    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Conectar Google Calendar</h2>
            <GoogleCalendarConnect />
        </div>
    );
}

/**
 * Exemplo 2: Listar eventos sincronizados
 */
export function ExampleEventsList() {
    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Meus Eventos de Hoje</h2>
            <GoogleCalendarEventsList
                todayOnly={true}
                maxEvents={10}
                onEventClick={(eventId) => {
                    console.log('Clicou no evento:', eventId);
                }}
            />
        </div>
    );
}

/**
 * Exemplo 3: Usar o hook diretamente
 */
export function ExampleWithHook() {
    const {
        events,
        isConnected,
        isLoading,
        error,
        sync,
        lastSyncTime,
    } = useGoogleCalendarEvents({
        autoSync: true,
        syncInterval: 300, // 5 minutos
    });

    if (!isConnected) {
        return (
            <div className="p-6 text-center">
                <p className="text-ceramic-text-secondary">Por favor, conecte ao Google Calendar primeiro</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Calendário Sincronizado</h2>
                <button
                    onClick={sync}
                    disabled={isLoading}
                    className="px-4 py-2 bg-ceramic-info text-white rounded-lg hover:bg-ceramic-info/90 disabled:opacity-50"
                >
                    {isLoading ? 'Sincronizando...' : 'Sincronizar Agora'}
                </button>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-ceramic-error/10 border border-ceramic-error/40 rounded-lg text-ceramic-error">
                    Erro: {error}
                </div>
            )}

            {lastSyncTime && (
                <p className="text-sm text-ceramic-text-secondary mb-4">
                    Última sincronização: {lastSyncTime.toLocaleTimeString('pt-BR')}
                </p>
            )}

            <div className="space-y-4">
                {events.length > 0 ? (
                    events.map((event) => (
                        <div
                            key={event.id}
                            className="p-4 bg-ceramic-base border rounded-lg shadow-sm"
                        >
                            <h3 className="font-semibold text-lg">{event.title}</h3>
                            <p className="text-sm text-ceramic-text-secondary mt-1">
                                {new Date(event.startTime).toLocaleString('pt-BR')}
                            </p>
                            {event.description && (
                                <p className="text-sm text-ceramic-text-secondary mt-2">{event.description}</p>
                            )}
                            {event.attendees && event.attendees.length > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                    <p className="text-xs text-ceramic-text-secondary">
                                        Participantes: {event.attendees.join(', ')}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="text-ceramic-text-secondary text-center py-8">Nenhum evento sincronizado</p>
                )}
            </div>
        </div>
    );
}

/**
 * Exemplo 4: Dashboard completo integrado
 */
export function ExampleCompleteIntegration() {
    const {
        events,
        isConnected,
        isLoading,
        sync,
    } = useGoogleCalendarEvents({
        autoSync: true,
        syncInterval: 300,
    });

    // Separar eventos de hoje vs futuros
    const today = new Date().toDateString();
    const todayEvents = events.filter(
        e => new Date(e.startTime).toDateString() === today
    );
    const futureEvents = events.filter(
        e => new Date(e.startTime).toDateString() !== today
    );

    return (
        <div className="w-full space-y-8 p-6">
            {/* Seção de Conexão */}
            <section>
                <h2 className="text-2xl font-bold mb-4">Integração com Google Calendar</h2>
                <GoogleCalendarConnect />
            </section>

            {isConnected && (
                <>
                    {/* Seção de Eventos de Hoje */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold">Eventos de Hoje</h3>
                            <button
                                onClick={sync}
                                disabled={isLoading}
                                className="text-sm px-3 py-1 bg-ceramic-cool rounded hover:bg-ceramic-border disabled:opacity-50"
                            >
                                {isLoading ? 'Atualizando...' : 'Atualizar'}
                            </button>
                        </div>

                        {todayEvents.length > 0 ? (
                            <div className="grid gap-3">
                                {todayEvents
                                    .sort((a, b) =>
                                        new Date(a.startTime).getTime() -
                                        new Date(b.startTime).getTime()
                                    )
                                    .map((event) => (
                                        <div
                                            key={event.id}
                                            className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded"
                                        >
                                            <p className="font-semibold text-blue-900">
                                                {event.title}
                                            </p>
                                            <p className="text-sm text-blue-700">
                                                {new Date(event.startTime).getHours()}h
                                                {new Date(event.startTime).getMinutes()
                                                    .toString()
                                                    .padStart(2, '0')}
                                                {event.duration > 0 && ` · ${event.duration} min`}
                                            </p>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <p className="text-ceramic-text-secondary text-center py-6">
                                Nenhum evento para hoje
                            </p>
                        )}
                    </section>

                    {/* Seção de Eventos Futuros */}
                    {futureEvents.length > 0 && (
                        <section>
                            <h3 className="text-xl font-bold mb-4">
                                Próximos Eventos ({futureEvents.length})
                            </h3>
                            <div className="grid gap-3 max-h-96 overflow-y-auto">
                                {futureEvents
                                    .sort((a, b) =>
                                        new Date(a.startTime).getTime() -
                                        new Date(b.startTime).getTime()
                                    )
                                    .slice(0, 5)
                                    .map((event) => (
                                        <div
                                            key={event.id}
                                            className="p-3 bg-ceramic-cool border-l-4 border-ceramic-border rounded"
                                        >
                                            <p className="font-semibold text-ceramic-text-primary">
                                                {event.title}
                                            </p>
                                            <p className="text-sm text-ceramic-text-secondary">
                                                {new Date(event.startTime).toLocaleDateString('pt-BR')} -
                                                {new Date(event.startTime).getHours()}h
                                                {new Date(event.startTime).getMinutes()
                                                    .toString()
                                                    .padStart(2, '0')}
                                            </p>
                                        </div>
                                    ))}
                                {futureEvents.length > 5 && (
                                    <p className="text-sm text-ceramic-text-secondary text-center py-2">
                                        +{futureEvents.length - 5} eventos futuros
                                    </p>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Estatísticas */}
                    <section className="bg-ceramic-cool p-6 rounded-lg">
                        <h4 className="font-bold mb-4">Estatísticas</h4>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-2xl font-bold">{todayEvents.length}</p>
                                <p className="text-sm text-ceramic-text-secondary">Eventos hoje</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{events.length}</p>
                                <p className="text-sm text-ceramic-text-secondary">Total sincronizado</p>
                            </div>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

/**
 * COMO USAR ESTE ARQUIVO
 *
 * 1. Para testar localmente, importe em uma view:
 *    import { ExampleCompleteIntegration } from '../components/GoogleCalendarExample';
 *
 * 2. Renderize no seu componente:
 *    <ExampleCompleteIntegration />
 *
 * 3. Navegue e teste a funcionalidade
 *
 * 4. APÓS TESTES: Delete este arquivo
 */
