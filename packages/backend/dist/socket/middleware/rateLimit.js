export function checkRateLimit(socket, maxEventsPerSecond) {
    const now = Date.now();
    const state = socket.data.rateState;
    if (now - state.windowStartMs >= 1000) {
        state.windowStartMs = now;
        state.count = 0;
    }
    state.count += 1;
    return state.count <= maxEventsPerSecond;
}
