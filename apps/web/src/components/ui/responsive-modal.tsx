import * as React from 'react';

import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

const ModalContext = React.createContext(false);

function ResponsiveModal({ children, ...props }: React.ComponentProps<typeof Dialog>) {
  const isMobile = useMediaQuery('(max-width: 639px)');

  return (
    <ModalContext.Provider value={isMobile}>
      {isMobile ? <Drawer {...props}>{children}</Drawer> : <Dialog {...props}>{children}</Dialog>}
    </ModalContext.Provider>
  );
}

function ResponsiveModalTrigger(props: React.ComponentProps<typeof DialogTrigger>) {
  const isMobile = React.useContext(ModalContext);
  return isMobile ? <DrawerTrigger {...props} /> : <DialogTrigger {...props} />;
}

function ResponsiveModalClose(props: React.ComponentProps<typeof DialogClose>) {
  const isMobile = React.useContext(ModalContext);
  return isMobile ? <DrawerClose {...props} /> : <DialogClose {...props} />;
}

function ResponsiveModalContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const isMobile = React.useContext(ModalContext);
  return isMobile ? (
    <DrawerContent>{children}</DrawerContent>
  ) : (
    <DialogContent className={className} {...props}>
      {children}
    </DialogContent>
  );
}

function ResponsiveModalHeader(props: React.ComponentProps<typeof DialogHeader>) {
  const isMobile = React.useContext(ModalContext);
  return isMobile ? <DrawerHeader {...props} /> : <DialogHeader {...props} />;
}

function ResponsiveModalFooter({ children, ...props }: React.ComponentProps<typeof DialogFooter>) {
  const isMobile = React.useContext(ModalContext);
  return isMobile ? (
    <DrawerFooter {...props}>{children}</DrawerFooter>
  ) : (
    <DialogFooter {...props}>{children}</DialogFooter>
  );
}

function ResponsiveModalTitle(props: React.ComponentProps<typeof DialogTitle>) {
  const isMobile = React.useContext(ModalContext);
  return isMobile ? <DrawerTitle {...props} /> : <DialogTitle {...props} />;
}

function ResponsiveModalDescription(props: React.ComponentProps<typeof DialogDescription>) {
  const isMobile = React.useContext(ModalContext);
  return isMobile ? <DrawerDescription {...props} /> : <DialogDescription {...props} />;
}

function ResponsiveModalBody({ className, ...props }: React.ComponentProps<typeof DialogBody>) {
  const isMobile = React.useContext(ModalContext);
  return <DialogBody className={cn(isMobile && 'px-4', className)} {...props} />;
}

export {
  ResponsiveModal,
  ResponsiveModalTrigger,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalFooter,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalBody,
};
