
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  baseDelay: number = 1000,
  backoffFactor: number = 2
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on auth errors or bad requests (400, 401, 403)
      // Gemini SDK errors might look different, but generally we check message content
      const errorMessage = error.message || '';
      const isAuthError = errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('403');
      const isBadRequest = errorMessage.includes('400') && !errorMessage.includes('safety'); // Safety blocks shouldn't be retried usually, but generic 400s definitely not

      if (isAuthError || isBadRequest) {
        throw error;
      }

      // If it's the last attempt, throw the error
      if (attempt === retries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(backoffFactor, attempt);
      console.warn(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms... Error: ${errorMessage}`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
