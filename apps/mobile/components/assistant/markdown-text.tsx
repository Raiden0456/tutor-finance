import * as React from 'react';
import { View } from 'react-native';
import { Text } from '~/components/ui/text';
import { cn } from '~/lib/utils';

const BULLET = /^\s*(?:[-*•]|(\d+)[.)])\s+/;
const HEADING = /^\s*#{1,6}\s+/;

function inline(text: string): React.ReactNode[] {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <Text key={i} className="font-semibold">
          {part.slice(2, -2)}
        </Text>
      ) : (
        part
      ),
    );
}

export function MarkdownText({ text, className }: { text: string; className?: string }) {
  const lines = text.split('\n');

  return (
    <View className="gap-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <View key={i} className="h-1" />;
        if (HEADING.test(line)) {
          return (
            <Text key={i} className={cn('mt-1 text-sm font-semibold', className)}>
              {inline(line.replace(HEADING, ''))}
            </Text>
          );
        }
        const bullet = line.match(BULLET);
        if (bullet) {
          return (
            <View key={i} className="flex-row gap-2 pl-1">
              <Text className={cn('text-sm text-muted-foreground', className)}>
                {bullet[1] ? `${bullet[1]}.` : '•'}
              </Text>
              <Text className={cn('flex-1 text-sm leading-5', className)}>
                {inline(line.replace(BULLET, ''))}
              </Text>
            </View>
          );
        }
        return (
          <Text key={i} className={cn('text-sm leading-5', className)}>
            {inline(line)}
          </Text>
        );
      })}
    </View>
  );
}
