import { useEffect, useState } from 'react';
import { Box, IconButton, Tooltip } from '@chakra-ui/react';
import { FaWhatsapp } from 'react-icons/fa';
import NextLink from 'next/link';
import { waHref } from 'lib/site';

export default function ContactWidget() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <Box position="fixed" right={{ base: 4, md: 6 }} bottom={{ base: 4, md: 6 }} zIndex={30}>
      <Tooltip label="Escríbenos por WhatsApp">
        <IconButton
          as={NextLink}
          href={waHref('Hola, quiero información por favor.')}
          target='_blank'
          aria-label="WhatsApp"
          colorScheme='whatsapp'
          icon={<FaWhatsapp />}
          rounded='full'
          boxShadow='lg'
          size='lg'
        />
      </Tooltip>
    </Box>
  );
}

