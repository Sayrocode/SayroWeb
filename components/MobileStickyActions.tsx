import React, { useCallback } from 'react';
import { Box, Button, HStack, Icon, Text } from '@chakra-ui/react';
import { FaWhatsapp } from 'react-icons/fa';
import { waHref, CONTACT_EMAIL } from '../lib/site';

type Props = {
  propertyTitle: string;
  shareUrl: string;
};

/**
 * Fixed bottom action bar for mobile: large WhatsApp CTA + form link.
 * - Handles iPhone safe-area insets
 * - Only mount on mobile views (parent should hide on lg+)
 */
export default function MobileStickyActions({ propertyTitle, shareUrl }: Props) {
  const msg = `Hola, me interesa ${propertyTitle} (${shareUrl}).`;
  const href = waHref(msg);
  const mailtoHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Información — Sayro Bienes Raíces')}&body=${encodeURIComponent(msg)}`;

  return (
    <Box
      position="fixed"
      bottom="0"
      left="0"
      right="0"
      zIndex={1000}
      bg="white"
      borderTopWidth="1px"
      borderColor="gray.200"
      px={4}
      pt={3}
      pb="calc(env(safe-area-inset-bottom) + 12px)"
      boxShadow="0 -4px 16px rgba(0,0,0,0.06)"
      role="region"
      aria-label="Acciones rápidas de contacto"
    >
      <HStack spacing={3} align="stretch">
        <Button
          as="a"
          href={href}
          target="_blank"
          rel="noopener"
          leftIcon={<Icon as={FaWhatsapp} />}
          colorScheme="whatsapp"
          flex={1}
          size="lg"
          borderRadius="md"
          fontWeight="bold"
        >
          WhatsApp
        </Button>
        <Button as="a" href={mailtoHref} variant="outline" colorScheme="green" size="lg" borderRadius="md" px={4}>
          Email
        </Button>
      </HStack>
    </Box>
  );
}
