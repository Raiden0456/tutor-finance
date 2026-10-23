import { useState } from 'react';
import { Database, Send, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';
import { aiApi } from '../api';
import { useAiStatus } from '../hooks/use-ai-status';
import { useAiErrorHandler } from '../hooks/use-ai-error-handler';
import { setAiStatus, settleConsent } from '../stores/ai-status';

const SECTIONS: { icon: typeof Database; title: string; body: string; note?: string }[] = [
  {
    icon: Database,
    title: 'What is sent',
    body: 'Student names and contact details, lessons and schedules, lesson notes and homework, payments and transactions — only what is needed for your request.',
  },
  {
    icon: Send,
    title: 'Who receives it',
    body: "OpenAI, through your connected ChatGPT account or the server's OpenAI API key.",
    note: 'When you use voice input, your recordings are sent to OpenAI to turn speech into text.',
  },
  {
    icon: Target,
    title: 'Why',
    body: 'To answer your questions, summarise your day and draft changes. Nothing is saved until you confirm it.',
  },
  {
    icon: ShieldCheck,
    title: 'Your control',
    body: 'Nothing is sent until you agree. You can revoke consent anytime in Settings → Integrations.',
  },
];

export function ConsentDialog() {
  const { t } = useI18n();
  const { consentOpen } = useAiStatus();
  const handleError = useAiErrorHandler();
  const [saving, setSaving] = useState(false);

  async function accept() {
    setSaving(true);
    try {
      setAiStatus(await aiApi.giveConsent());
      settleConsent(true);
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ResponsiveModal open={consentOpen} onOpenChange={(open) => !open && settleConsent(false)}>
      <ResponsiveModalContent className="max-w-md">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('Enable AI assistant')}
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {t('Please review what the assistant shares before you start.')}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>
        <ResponsiveModalBody>
          <ul className="space-y-4 text-sm">
            {SECTIONS.map(({ icon: Icon, title, body, note }) => (
              <li key={title} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium">{t(title)}</p>
                  <p className="leading-relaxed text-muted-foreground">{t(body)}</p>
                  {note && <p className="leading-relaxed text-muted-foreground">{t(note)}</p>}
                </div>
              </li>
            ))}
          </ul>
        </ResponsiveModalBody>
        <ResponsiveModalFooter>
          <Button variant="outline" onClick={() => settleConsent(false)} disabled={saving}>
            {t('Not now')}
          </Button>
          <Button onClick={() => void accept()} disabled={saving}>
            {saving && <Spinner />}
            {t('Agree and continue')}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
