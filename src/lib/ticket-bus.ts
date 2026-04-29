type TicketPayload = Record<string, unknown>;
type TicketListener = (payload: TicketPayload) => void;

declare global {
  // eslint-disable-next-line no-var
  var __ticket_bus_listeners__: Set<TicketListener> | undefined;
}

const listeners =
  globalThis.__ticket_bus_listeners__ ??
  (globalThis.__ticket_bus_listeners__ = new Set<TicketListener>());

export function addTicketListener(listener: TicketListener) {
  listeners.add(listener);
}

export function removeTicketListener(listener: TicketListener) {
  listeners.delete(listener);
}

export function broadcastTicket(payload: TicketPayload) {
  for (const listener of listeners) {
    try {
      listener(payload);
    } catch (err) {
      console.error("broadcastTicket listener error:", err);
    }
  }
}

export function getTicketListenerCount() {
  return listeners.size;
}