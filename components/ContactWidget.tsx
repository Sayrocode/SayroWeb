import { useEffect, useMemo, useState } from 'react';
import { Box, IconButton, Stack, Tooltip } from '@chakra-ui/react';
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
    <Box position='fixed' right={{ base: 3, md: 4 }} bottom={{ base: 3, md: 4 }} zIndex={1000}
         bg='#013927' color='white' rounded='full' p={2} shadow='lg' border='1px solid' borderColor='whiteAlpha.300'>
      <Stack spacing={1} align='end'>
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
            variant='ghost'
            color='white'
            _hover={{ bg: 'whiteAlpha.200' }}
            _active={{ bg: 'whiteAlpha.300' }}
          />
        </Tooltip>
        <Tooltip label='Contáctanos por email'>
          <IconButton
            as='a'
            href={mailto}
            aria-label='Email'
            icon={<FiMail />}
            rounded='full'
            size='lg'
            variant='ghost'
            color='white'
            _hover={{ bg: 'whiteAlpha.200' }}
            _active={{ bg: 'whiteAlpha.300' }}
          />
        </Tooltip>
      </Stack>
    </Box>
  );
}
