import { useEffect, useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import type { Currency } from '@tutor-finance/shared';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Tx } from '@/lib/types';
import { useMutation } from '@/hooks/use-mutation';
import { Button } from '@/components/ui/button';
import { Collapse, FadeSwap } from '@/components/ui/collapse';
import { Spinner } from '@/components/ui/spinner';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { TxCard } from './card';

const PAGE_SIZE = 15;

function paginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  if (start > 2) pages.push('ellipsis');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push('ellipsis');
  pages.push(totalPages);
  return pages;
}

export function TransactionList({
  items,
  currency,
  studentMap,
  onEdit,
  onDeleted,
}: {
  items: Tx[];
  currency: Currency;
  studentMap: Map<string, string>;
  onEdit: (tx: Tx) => void;
  onDeleted: () => Promise<void>;
}) {
  const { t } = useI18n();
  const { run, pending } = useMutation();
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<Tx | null>(null);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = useMemo(() => paginationItems(page, totalPages), [page, totalPages]);
  const visible = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  async function confirmDelete() {
    if (!deleting) return;
    const ok = await run(async () => {
      await api.delete(`/transactions/${deleting.id}`);
      await onDeleted();
    });
    if (ok) setDeleting(null);
  }

  return (
    <>
      <FadeSwap motionKey={items.length === 0 ? 'empty' : 'list'}>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
            {t('No transactions in this period.')}
          </div>
        ) : (
          <div className="space-y-4">
            <FadeSwap motionKey={`tx-page-${page}`}>
              <ul className="flex flex-col gap-2">
                {visible.map((tx) => (
                  <TxCard
                    key={tx.id}
                    tx={tx}
                    primaryCurrency={currency}
                    studentMap={studentMap}
                    onEdit={onEdit}
                    onDelete={setDeleting}
                  />
                ))}
              </ul>
            </FadeSwap>
            <Collapse open={totalPages > 1}>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      aria-disabled={page === 1}
                      aria-label={t('Go to previous page')}
                      size="default"
                      className={
                        'gap-1 px-2.5 sm:pl-2.5 ' +
                        (page === 1 ? 'pointer-events-none opacity-50' : 'transition-opacity')
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((current) => Math.max(1, current - 1));
                      }}
                    >
                      <ChevronLeftIcon />
                      <span className="hidden sm:block">{t('Previous')}</span>
                    </PaginationLink>
                  </PaginationItem>
                  {pageItems.map((item, index) => (
                    <PaginationItem key={`${item}-${index}`}>
                      {item === 'ellipsis' ? (
                        <PaginationEllipsis aria-label={t('More pages')} />
                      ) : (
                        <PaginationLink
                          href="#"
                          isActive={item === page}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(item);
                          }}
                        >
                          {item}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      aria-disabled={page === totalPages}
                      aria-label={t('Go to next page')}
                      size="default"
                      className={
                        'gap-1 px-2.5 sm:pr-2.5 ' +
                        (page === totalPages
                          ? 'pointer-events-none opacity-50'
                          : 'transition-opacity')
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((current) => Math.min(totalPages, current + 1));
                      }}
                    >
                      <span className="hidden sm:block">{t('Next')}</span>
                      <ChevronRightIcon />
                    </PaginationLink>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </Collapse>
          </div>
        )}
      </FadeSwap>

      <ResponsiveModal open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <ResponsiveModalContent className="max-w-sm">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>{t('Delete transaction?')}</ResponsiveModalTitle>
          </ResponsiveModalHeader>
          <ResponsiveModalBody>
            <p className="text-sm text-muted-foreground">{t('This action cannot be undone.')}</p>
          </ResponsiveModalBody>
          <ResponsiveModalFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              {t('Cancel')}
            </Button>
            <Button variant="destructive" disabled={pending} onClick={confirmDelete}>
              {pending && <Spinner />}
              {t('Delete')}
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  );
}
