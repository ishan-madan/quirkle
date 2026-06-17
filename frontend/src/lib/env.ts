export function getFrontendEnv(): { apiUrl: string; socketUrl: string } {
  const apiUrl = import.meta.env.VITE_API_URL;
  const socketUrl = import.meta.env.VITE_SOCKET_URL;

  if (!apiUrl) {
    throw new Error('VITE_API_URL is required for the frontend build.');
  }

  if (!socketUrl) {
    throw new Error('VITE_SOCKET_URL is required for the frontend build.');
  }

  return { apiUrl, socketUrl };
}