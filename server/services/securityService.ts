import { URL } from "url";

/**
 * Validate an external URL string to ensure it follows secure schema requirements
 * and does not attempt connection loops/internal host lookups (SSRF defense).
 */
export function validateExternalUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    const allowedProtocols = ["https:"];
    const blockedHosts = [
      "localhost", 
      "127.0.0.1", 
      "metadata.google.internal", 
      "169.254.169.254"
    ];
    
    return allowedProtocols.includes(parsed.protocol) && !blockedHosts.includes(parsed.hostname);
  } catch (e) {
    return false;
  }
}
