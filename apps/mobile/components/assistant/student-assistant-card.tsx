import { View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { PromptChips, STUDENT_PROMPTS } from '~/components/assistant/prompt-chips';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Icon } from '~/components/ui/icon';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { useOpenAssistant } from '~/lib/ai/use-open-assistant';
import { useI18n } from '~/lib/i18n';

export function StudentAssistantCard({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const { t } = useI18n();
  const open = useOpenAssistant();

  return (
    <Card>
      <CardContent className="gap-3 pt-5">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-1 flex-row items-center gap-2">
            <Icon as={Sparkles} size={16} className="text-primary" />
            <Text className="text-base font-semibold">{t('Assistant')}</Text>
          </View>
          <Button
            size="sm"
            variant="outline"
            disabled={open.pending}
            onPress={() => void open.run({ studentId, studentName })}
          >
            {open.pending ? <Spinner /> : <Text>{t('Open chat')}</Text>}
          </Button>
        </View>
        <PromptChips
          prompts={STUDENT_PROMPTS.map((p) => t(p))}
          disabled={open.pending}
          onPick={(prompt) => void open.run({ studentId, studentName, prompt })}
        />
      </CardContent>
    </Card>
  );
}
