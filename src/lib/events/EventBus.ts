// Sprint 7F: Advanced Automation - Async Event Engine

export type EventPayload = any;
export type EventHandler = (payload: EventPayload) => void | Promise<void>;

class EventBusEngine {
    private listeners: Record<string, EventHandler[]> = {};

    /**
     * Registra um listener/subscriber para um evento específico.
     */
    on(event: string, handler: EventHandler) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(handler);
    }

    /**
     * Propaga o evento de forma não-bloqueante (Promise.allSettled).
     * O fluxo principal do chamador nunca será interrompido caso algum Handler falhe.
     */
    async emit(event: string, payload: EventPayload) {
        if (!this.listeners[event]) {
            console.warn(`[EventBus] Sinal emitido '${event}', porém sem ouvintes registrados.`);
            return;
        }

        console.log(`[EventBus] 📡 Distribuindo envento: '${event}' para ${this.listeners[event].length} subscriber(s).`);

        // Non-blocking Parallel Execution
        Promise.allSettled(this.listeners[event].map(handler => handler(payload)))
            .then(results => {
                results.forEach((res, i) => {
                    if (res.status === 'rejected') {
                        console.error(`[EventBus] ❌ Handler falhou no evento '${event}':`, res.reason);
                    }
                });
            });
    }
}

// Singleton Pattern
export const EventBus = new EventBusEngine();
