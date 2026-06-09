import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Text } from '~/components/ui/text';
import { cn } from '~/lib/utils';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function hueFromName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

export function StudentAvatar({ name, className }: { name: string; className?: string }) {
  const hue = hueFromName(name);
  return (
    <Avatar alt={name} className={cn('size-11', className)}>
      <AvatarFallback style={{ backgroundColor: `hsl(${hue} 60% 88%)` }}>
        <Text className="text-sm font-semibold" style={{ color: `hsl(${hue} 55% 30%)` }}>
          {initials(name)}
        </Text>
      </AvatarFallback>
    </Avatar>
  );
}
