import { View } from 'react-native';
import { Database, Eye, ShieldCheck, Target } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { AiStatusResponse } from '@tutor-finance/shared';
import { FormSheet } from '~/components/common/form-sheet';
import { Button } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { settleConsent, useConsentOpen } from '~/lib/ai/consent';
import { setAiStatus } from '~/lib/ai/status';
import { useI18n } from '~/lib/i18n';
import { useMutation } from '~/lib/use-mutation';

const ROWS: { icon: LucideIcon; title: string; body: string[] }[] = [
  {
    icon: Database,
    title: 'What is sent',
    body: [
      'Student names and contact details, lessons and schedules, lesson notes and homework, payments and transactions — only what is needed for your request.',
    ],
  },
  {
    icon: Eye,
    title: 'Who receives it',
    body: [
      "OpenAI, through your connected ChatGPT account or the server's OpenAI API key.",
      'When you use voice input, your recordings are sent to OpenAI to turn speech into text.',
    ],
  },
  {
    icon: Target,
    title: 'Why',
    body: [
      'To answer your questions, summarise your day and draft changes. Nothing is saved until you confirm it.',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Your control',
    body: [
      'Nothing is sent until you agree. You can revoke consent anytime in Settings → Integrations.',
    ],
  },
];

export function ConsentSheetHost() {
  const { t } = useI18n();
  const open = useConsentOpen();
  const accept = useMutation(async () => {
    setAiStatus(await api.post<AiStatusResponse>('ai/consent'));
    settleConsent(true);
  });

  return (
    <FormSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) settleConsent(false);
      }}
      title={t('Enable AI assistant')}
      description={t('Please review what the assistant shares before you start.')}
      footer={
        <>
          <Button onPress={() => void accept.run()} disabled={accept.pending}>
            {accept.pending ? <Spinner color="#fff" /> : <Text>{t('Agree and continue')}</Text>}
          </Button>
          <Button variant="ghost" onPress={() => settleConsent(false)}>
            <Text>{t('Not now')}</Text>
          </Button>
        </>
      }
    >
      <View className="gap-4">
        {ROWS.map((row) => (
          <View key={row.title} className="flex-row gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Icon as={row.icon} size={17} className="text-primary" />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-sm font-semibold">{t(row.title)}</Text>
              {row.body.map((line) => (
                <Text key={line} className="text-sm text-muted-foreground">
                  {t(line)}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </View>
    </FormSheet>
  );
}
