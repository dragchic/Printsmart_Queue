type TVListener = (payload: any) => void;

const listeners = new Set<TVListener>();

export function addTVListener(listener: TVListener) {
  listeners.add(listener);
  console.log("TV listener added. Total:", listeners.size);
}

export function removeTVListener(listener: TVListener) {
  listeners.delete(listener);
  console.log("TV listener removed. Total:", listeners.size);
}

export function broadcastToTV(payload: any) {
  console.log("Broadcasting to TV:", payload, "listeners:", listeners.size);

  for (const listener of listeners) {
    try {
      listener(payload);
    } catch (err) {
      console.error("Failed to send TV payload:", err);
    }
  }
}