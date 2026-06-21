/** WhatsApp click-to-chat — https://faq.whatsapp.com/5913398998672934 */
export const WHATSAPP_PHONE = '918282012929';

export function buildWhatsAppClickToChatUrl(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_PHONE}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

export const WHATSAPP_MESSAGES = {
  general: "Hi, I'd like to know more about Livotale liver scan at home.",
  bookScan: "Hi, I'd like to book a liver scan at home.",
  packageCard: (name: string, code: string) => `Hi, I'm interested in the ${name} package (${code}).`,
  packageDetail: (name: string, code: string) => `Hi, I'd like to enquire about ${name} (${code}).`,
} as const;
