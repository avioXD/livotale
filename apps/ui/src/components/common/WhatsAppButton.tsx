import { MessageCircle } from 'lucide-react';
import { buildWhatsAppClickToChatUrl } from '@/app/config/whatsappMessages';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WhatsAppButtonProps {
  message?: string;
  label?: string;
  variant?: 'button' | 'icon';
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function WhatsAppButton({
  message,
  label = 'Chat on WhatsApp',
  variant = 'button',
  className,
  size = 'default',
}: WhatsAppButtonProps) {
  const href = buildWhatsAppClickToChatUrl(message);

  if (variant === 'icon') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className={cn(
          'inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:bg-[#20bd5a]',
          className,
        )}
      >
        <MessageCircle className="h-7 w-7" aria-hidden />
      </a>
    );
  }

  return (
    <Button
      asChild
      size={size}
      className={cn('bg-[#25D366] text-white hover:bg-[#20bd5a]', className)}
    >
      <a href={href} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="mr-2 h-4 w-4" aria-hidden />
        {label}
      </a>
    </Button>
  );
}
