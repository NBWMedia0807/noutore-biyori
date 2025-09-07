// src/hooks.server.ts
import type { Handle, HandleServerError } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Add any global middleware here if needed
  return await resolve(event);
};

export const handleError: HandleServerError = ({ error, event }) => {
  // Log errors but don't expose internal details to users
  console.error(`[hooks.server] Error occurred: ${error}`);
  
  // For production, return generic error messages
  // SvelteKit will automatically use the status code from error() calls
  return {
    message: 'An error occurred'
  };
};