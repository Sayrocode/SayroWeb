import { useEffect, useMemo, useState } from 'react';
import { Box, Button, IconButton, Stack, Tooltip } from '@chakra-ui/react';
import { FaWhatsapp } from 'react-icons/fa';
import { FiMail } from 'react-icons/fi';
import { CONTACT_EMAIL, waHref } from '../lib/site';

export default function ContactWidget() {
  const [href, setHref] = useState<string>('');
  useEffect(() => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const msg = `Hola, vi esta página y me interesa: ${url}`;
    setHref(waHref(msg));
  }, []);

  const mailto = useMemo(() => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const subject = 'Información — Sayro Bienes Raíces';
    const body = `Hola, vi esta página y me interesa:\n${url}`;
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, []);

  return (
    <Box position='fixed' right={{ base: 3, md: 4 }} bottom={{ base: 3, md: 4 }} zIndex={1000}>
      <Stack spacing={2} align='end'>
        <Tooltip label='Escríbenos por WhatsApp'>
          <IconButton
            as='a'
            href={href}
            target='_blank'
            rel='noopener noreferrer'
            aria-label='WhatsApp'
            icon={<FaWhatsapp />}
            rounded='full'
            size='lg'
            // Forzamos verde WhatsApp explícito para evitar overrides de tema
            variant='solid'
            bg='green.400'
            color='white'
            _hover={{ bg: 'green.600' }}
            _active={{ bg: 'green.700' }}
          />
        </Tooltip>
        <Tooltip label='Contáctanos por email'>
          <IconButton as='a' href={mailto} aria-label='Email' icon={<FiMail />} rounded='full' size='lg' />
        </Tooltip>
      </Stack>
    </Box>
  );
}
