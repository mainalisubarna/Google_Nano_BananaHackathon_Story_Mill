

/**
 * Retry function with exponential backoff
 */
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};



/**
 * Generate unique ID
 */
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Clean and validate text input
 */
const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  // Allow more characters for story content, just remove potentially harmful ones
  return text.trim().replace(/[<>{}]/g, '').substring(0, 5000);
};

module.exports = {
  retryWithBackoff,
  generateId,
  sanitizeText
};