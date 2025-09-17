import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  HStack,
  Text,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  FiTrendingUp,
  FiFileText,
  FiPercent,
  FiSearch,
  FiShield,
  FiCompass,
} from 'react-icons/fi';

type Service = { icon: any; title: string; desc: string };

const SERVICES: Service[] = [
  {
    icon: FiTrendingUp,
    title: 'Marketing Digital',
    desc: 'Estrategia, inversión y análisis continuo para generar demanda real y atraer a los compradores correctos.',
  },
  {
    icon: FiFileText,
    title: 'Dictamen Comercial',
    desc: 'Opinión de Valor Comercial basada en investigación de mercado para fijar un precio competitivo y realista.',
  },
  {
    icon: FiPercent,
    title: 'Dictamen Fiscal',
    desc: 'Determinamos, antes de promover, si habrá impuestos por la venta, su monto y cómo impactan en el saldo neto.',
  },
  {
    icon: FiSearch,
    title: 'Estudio y Análisis de Mercado',
    desc: 'Conocemos el valor real del inmueble con datos, integrando dictámenes comercial, jurídico y fiscal.',
  },
  {
    icon: FiShield,
    title: 'Dictamen Jurídico',
    desc: 'Revisión del estatus legal para asegurar una comercialización sin sorpresas durante el proceso de venta.',
  },
  {
    icon: FiCompass,
    title: 'Asesoría en Búsqueda de Bienes',
    desc: 'Te guiamos con opciones reales para comprar o alquilar un inmueble según tu perfil y objetivos.',
  },
];

function ServiceCard({ icon, title, desc, scale = 1 }: Service & { scale?: number }) {
  // Fondo verde como el de las letras y texto blanco
  const cardBg = '#013927';
  const border = 'whiteAlpha.300';
  const iconBg = 'whiteAlpha.200';
  const iconColor = 'white';
  const textColor = 'white';
  return (
    <Box
      role="article"
      bg={cardBg}
      rounded="xl"
      border="1px solid"
      borderColor={border}
      p={Math.round(6 * scale)}
      shadow="md"
      _hover={{ transform: 'translateY(-4px)', shadow: 'xl' }}
      transition="all .18s ease"
      color={textColor}
    >
      <HStack spacing={4} align="start">
        <Box w={Math.round(12 * scale)} h={Math.round(12 * scale)} rounded="full" bg={iconBg} display="grid" placeItems="center" color={iconColor} flexShrink={0}>
          <Icon as={icon} boxSize={Math.max(5, 5 * scale)} />
        </Box>
        <Box>
          <Heading as="h3" size={scale > 1 ? 'lg' : 'md'} mb={2} letterSpacing="tight" textTransform="uppercase" color="white">
            {title}
          </Heading>
          <Text color={textColor} fontSize={scale > 1 ? 'md' : 'sm'}>{desc}</Text>
        </Box>
      </HStack>
    </Box>
  );
}

export default function ServicesGrid({ ipad = false, fullScreen = false, cardScale = 1 }: { ipad?: boolean; fullScreen?: boolean; cardScale?: number } = {}) {
  const sectionBg = useColorModeValue('#FBF6E9', 'gray.900');
  const titleColor = useColorModeValue('black', 'white');
  return (
    <Box as="section" py={{ base: ipad ? 14 : 10, md: ipad ? 18 : 14 }} bg={sectionBg} minH={fullScreen ? '100vh' : undefined} display={fullScreen ? 'flex' : undefined} alignItems={fullScreen ? 'center' : undefined}>
      <Container maxW="7xl">
        <Heading id="servicios" as="h2" textAlign="center" fontWeight="600" fontSize={ipad ? { base: '2xl', md: '3xl' } : { base: 'xl', md: '2xl' }} color={titleColor} letterSpacing="wide" mb={{ base: 8, md: 10 }} scrollMarginTop={{ base: '56px', md: '64px' }}>
          NUESTROS SERVICIOS
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {SERVICES.map((s, i) => (
            <ServiceCard key={i} {...s} scale={cardScale} />
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
