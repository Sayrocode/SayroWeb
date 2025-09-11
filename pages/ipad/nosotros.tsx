import Head from 'next/head';
import { Box, IconButton, VisuallyHidden } from '@chakra-ui/react';
import { FiX } from 'react-icons/fi';
import AboutShowcase from 'components/AboutShowcase';
import NextLink from 'next/link';

export default function IpadNosotros() {
  const title = '¿Quiénes somos? — Vista iPad';

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      {/* Pantalla completa, sin layout para mostrar SOLO el componente */}
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

        <Box minH="100vh">
          <AboutShowcase
            imageSrc="/about.png"
            imageAlt="Fachada curvada"
            logoSrc="/logos/sayro-sello-blanco.svg"
            logoAlt="SR · Sayro Bienes Raíces S.A. de C.V."
            title="¿Quiénes somos?"
            paragraphs={[
              'Somos una empresa líder en el sector inmobiliario de la Ciudad de Querétaro, México, con más de 33 años de experiencia respaldando nuestro trabajo.',
              'Nuestro compromiso es garantizar que cada cliente obtenga el mejor precio, con rapidez y seguridad, asegurando la máxima rentabilidad de sus operaciones inmobiliarias y la mayor optimización en sus inversiones.',
              'Nos especializamos en la comercialización de bienes raíces en venta y renta de todo tipo en la Ciudad de Querétaro.',
            ]}
          />
        </Box>
      </Box>
    </>
  );
}

