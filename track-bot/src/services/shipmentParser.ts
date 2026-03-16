// Shipment message parsing service for specific format
export interface ParsedShipmentData {
  trackNumber: string;
  shipmentPrice?: number;
  status?: string;
  description?: string;
  provider?: string;
  // Pricing information
  receivePriceCNY?: number;
  receivePriceUZS?: number;
}

// Simple parser for the specific message format
const TRACK_NUMBER_REGEX = /(?:JT|YT)\d{12,13}|\d{12,15}/gi;
const PRICE_REGEX = /yo'l haqi:\s*([\d\s,]+(?:\.\d{2})?)\s*so'm/gi;
const ORDER_SUCCESS_REGEX = /trek\s+raqam[i]?:\s*(JT\d{12,13}|YT\d{12,13}|\d{12,15})/i;

export class ShipmentParser {
  /**
   * Parse a forwarded message to extract shipment information
   */
  static parseMessage(text: string): ParsedShipmentData | null {
    if (!text || text.trim().length === 0) {
      return null;
    }

    const normalizedText = text.toLowerCase().trim();

    // Check for order success message format
    const orderMatch = ORDER_SUCCESS_REGEX.exec(normalizedText);
    if (orderMatch && orderMatch[1]) {
      const result: ParsedShipmentData = {
        trackNumber: orderMatch[1].toUpperCase(),
        description: 'Buyurtma muvaffaqiyatli yaratildi',
      };
      return result;
    }

    // Check for original price format
    const trackMatches = normalizedText.match(TRACK_NUMBER_REGEX);
    const priceMatches = normalizedText.match(PRICE_REGEX);
    
    if (!trackMatches || trackMatches.length === 0) {
      return null;
    }
    
    const result: ParsedShipmentData = {
      trackNumber: trackMatches[0].toUpperCase(),
    };
    
    if (priceMatches && priceMatches.length > 0) {
      const priceInfo = this.extractPriceInfo(priceMatches[0]);
      result.shipmentPrice = priceInfo.uzsPrice;
      result.receivePriceUZS = priceInfo.uzsPrice;
      if (priceInfo.cnyPrice) {
        result.receivePriceCNY = priceInfo.cnyPrice;
      }
    }
    
    return result;
  }

  /**
   * Check if message should trigger add shipment flow
   */
  static shouldTriggerAddFlow(text: string): boolean {
    const normalizedText = text.toLowerCase().trim();

    // Order success messages should always trigger
    const orderSuccessRegex = /trek\s+raqam[i]?:\s*(JT\d{12,13}|YT\d{12,13}|\d{12,15})/i;
    if (orderSuccessRegex.test(normalizedText)) {
      return true;
    }

    // Look for a track number + price (supports spaced thousands like "7 500")
    const priceRegex = /yo'l haqi:\s*([\d\s,]+(?:\.\d{2})?)\s*so'm/i;
    const trackRegex = /(?:JT|YT)\d{12,13}|\d{12,15}/i;
    return priceRegex.test(normalizedText) && trackRegex.test(normalizedText);
  }

  /**
   * Extract price information and convert CNY to UZS
   */
  private static extractPriceInfo(priceStr: string): { cnyPrice?: number; uzsPrice?: number } {
    // Extract numeric value (supports separators like spaces and commas)
    const match = priceStr.match(/(\d[\d\s,]*(?:\.\d{2})?)/);
    if (!match) return {};

    const normalized = match[1].replace(/[\s,]/g, "");
    const price = parseFloat(normalized);
    
    // This is the shipment price in UZS, convert to CNY for storage
    const cnyPrice = Math.round(price / 1600 * 100) / 100;
    const uzsPrice = price;
    
    return { cnyPrice, uzsPrice };
  }

  /**
   * Check if a message looks like a shipment notification
   */
  static isShipmentMessage(text: string): boolean {
    const normalizedText = text.toLowerCase();
    
    // Check for the specific format
    return TRACK_NUMBER_REGEX.test(normalizedText) && 
           normalizedText.includes('yo\'l haqi');
  }
}