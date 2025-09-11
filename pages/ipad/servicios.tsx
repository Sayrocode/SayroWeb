import Head from 'next/head';
import { Box, Container, IconButton, VisuallyHidden } from '@chakra-ui/react';
import { FiX } from 'react-icons/fi';
import ServicesGrid from 'components/ServicesGrid';
import NextLink from 'next/link';

export default function IpadServicios() {
  const title = 'Servicios — Vista iPad';

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      {/* Pantalla completa, sin layout para mostrar SOLO servicios */}
      <Box position="relative" minH="100vh" bg="white" _dark={{ bg: 'gray.900' }}>
        {/* Botón cerrar / volver al inicio */}
        <IconButton
          as={NextLink}
          href="/"
          aria-label="Cerrar vista iPad"
          icon={<FiX />}
          position="absolute"
          top={{ base: 3, md: 4 }}
          right={{ base: 3, md: 4 }}
          zIndex={10}
          variant="ghost"
          rounded="full"
        >
          <VisuallyHidden>Cerrar</VisuallyHidden>
        </IconButton>

        {/* Forzar que el contenido ocupe el alto completo y quede centrado en iPad */}
        <Box display="flex" alignItems="center" minH="100vh" py={{ base: 4, md: 8 }}>
          <Container maxW="7xl" w="full">
            <ServicesGrid />
          </Container>
        </Box>
      </Box>
    </>
  );
}

