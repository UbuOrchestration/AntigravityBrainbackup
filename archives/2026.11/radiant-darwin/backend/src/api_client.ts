import fetch, { RequestInit, Response } from 'node-fetch';

/**
 * Global high-resiliency network dispatch wrapper
 * Prevents 429 errors from cascading and crashing service workers.
 * Wraps all fetch transactions with an automatic delay-multiplier sequence.
 */
export async function resilientFetch(url: string, options: RequestInit = {}, retries = 3, delay = 1000): Promise<Response> {
    try {
        const response = await fetch(url, options);

        // If hitting a 429 Too Many Requests rate ceiling or standard server error
        if (response.status === 429 || response.status >= 500) {
            if (retries > 0) {
                console.warn(`[API OVERLOAD] Status ${response.status}. Retrying in ${delay}ms... (${retries} left)`);
                await new Promise(res => setTimeout(res, delay));
                return resilientFetch(url, options, retries - 1, delay * 2); // Double backoff delay length
            }
            throw new Error(`API maximum retry window exhausted. Status Code: ${response.status}`);
        }
        return response;
    } catch (error: any) {
        if (retries > 0) {
            console.error(`[NETWORK FAULT] ${error.message}. Retrying in ${delay}ms...`);
            await new Promise(res => setTimeout(res, delay));
            return resilientFetch(url, options, retries - 1, delay * 2);
        }
        throw error;
    }
}
