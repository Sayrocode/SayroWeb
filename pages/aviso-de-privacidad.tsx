// pages/aviso-de-privacidad.tsx
import Head from "next/head";
import Layout from "components/Layout";
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Icon,
  Badge,
  Divider,
  List,
  ListItem,
  ListIcon,
  Link,
  
} from "@chakra-ui/react";
import { FiShield, FiLock, FiCheckCircle, FiInfo, FiMail } from "react-icons/fi";

const GREEN = "#0E3B30";
const GREEN_DARK = "#0B2B23";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <Box id={id} as="section" py={{ base: 6, md: 8 }}>
      <Heading as="h2" fontSize={{ base: "xl", md: "2xl" }} color={GREEN_DARK} mb={3}>
        {title}
      </Heading>
      <Divider borderColor="blackAlpha.200" mb={{ base: 4, md: 6 }} />
      <VStack align="start" spacing={3}>
        {children}
      </VStack>
    </Box>
  );
}

export default function AvisoPrivacidadPage() {
  const updated = new Date();
  const updatedText = updated.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

  return (
    <Layout>
      <Head>
        <title>Aviso de Privacidad — Sayro Bienes Raíces</title>
        <meta name="description" content="Conoce cómo protegemos tus datos personales en Sayro Bienes Raíces: finalidades, base legal, derechos ARCO y mecanismos de contacto." />
      </Head>

      {/* Hero */}
      <Box as="header" bg={GREEN} color="white" py={{ base: 10, md: 16 }}>
        <Container maxW="7xl" px={{ base: 4, md: 6 }}>
          <HStack spacing={4} align="start">
            <Icon as={FiShield} boxSize={{ base: 8, md: 10 }} aria-hidden />
            <Box>
              <Heading as="h1" fontSize={{ base: "2xl", md: "3xl" }} lineHeight="short" className="text-shiny-white">
                Aviso de Privacidad
              </Heading>
              <HStack mt={3} spacing={3} color="whiteAlpha.900">
                <Badge bg="whiteAlpha.300" color="white" px={2} py={0.5} rounded="md">
                  Transparencia
                </Badge>
                <Badge bg="whiteAlpha.300" color="white" px={2} py={0.5} rounded="md">
                  Confianza
                </Badge>
                <Text fontSize="sm">Última actualización: {updatedText}</Text>
              </HStack>
            </Box>
          </HStack>
        </Container>
      </Box>

      {/* Content card */}
      <Container maxW="4xl" px={{ base: 4, md: 6 }} my={{ base: 8, md: 12 }}>
        <Box bg="white" rounded={{ base: "lg", md: "xl" }} boxShadow="0 12px 30px rgba(0,0,0,.12)" border="1px solid" borderColor="blackAlpha.100">
          <Box p={{ base: 5, md: 8 }} id="contenido">
            <Text color="gray.700" mb={4}>
              En Sayro Bienes Raíces valoramos y protegemos tu información personal. Este Aviso de Privacidad describe qué datos recabamos, con qué finalidades, el fundamento legal y los mecanismos para ejercer tus derechos ARCO.
            </Text>

            <Section id="responsable" title="Responsable del tratamiento">
              <Text>
                Sayro Bienes Raíces ("Sayro"), con domicilio en Querétaro, México, es responsable del tratamiento de tus datos personales de conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.
              </Text>
            </Section>

            <Section id="datos" title="Datos personales que recabamos">
              <Text>Podemos solicitar y tratar las siguientes categorías de datos:</Text>
              <List spacing={2} mt={1} pl={1}>
                <ListItem><ListIcon as={FiCheckCircle} color="green.500" /> Identificación y contacto: nombre, teléfono y correo electrónico.</ListItem>
                <ListItem><ListIcon as={FiCheckCircle} color="green.500" /> Información relacionada con tu interés en inmuebles: zonas, rangos de precio, características.</ListItem>
                <ListItem><ListIcon as={FiCheckCircle} color="green.500" /> Mensajes o comentarios que nos envías mediante formularios o WhatsApp.</ListItem>
                <ListItem><ListIcon as={FiCheckCircle} color="green.500" /> Datos de navegación y analítica (por ejemplo, cookies, UTM, referrer) para mejorar el sitio.</ListItem>
              </List>
            </Section>

            <Section id="finalidades" title="Finalidades del tratamiento">
              <Text>Tratamos tus datos para:</Text>
              <List spacing={2} mt={1} pl={1}>
                <ListItem><ListIcon as={FiCheckCircle} color="green.500" /> Atender tus solicitudes de información y asesoría inmobiliaria.</ListItem>
                <ListItem><ListIcon as={FiCheckCircle} color="green.500" /> Dar seguimiento a prospectos y citas, y, en su caso, celebrar operaciones de compraventa o arrendamiento.</ListItem>
                <ListItem><ListIcon as={FiCheckCircle} color="green.500" /> Mejorar la experiencia del sitio web y la eficacia de nuestras campañas.</ListItem>
                <ListItem><ListIcon as={FiCheckCircle} color="green.500" /> Cumplir obligaciones legales y responder a autoridades cuando proceda.</ListItem>
              </List>
            </Section>

            <Section id="base-legal" title="Base legal y consentimiento">
              <Text>
                El tratamiento se sustenta en tu consentimiento, el cumplimiento de obligaciones contractuales y el interés legítimo de brindar nuestros servicios. Podrás retirar tu consentimiento en cualquier momento sin efectos retroactivos.
              </Text>
            </Section>

            <Section id="transferencias" title="Transferencias y encargados">
              <Text>
                Compartimos datos únicamente con proveedores que nos ayudan a operar el sitio y a gestionar contacto y analítica (por ejemplo, hosting, herramientas de CRM/marketing y proveedores tecnológicos), bajo contratos y medidas de seguridad que protegen tu información. No vendemos tus datos.
              </Text>
            </Section>

            <Section id="seguridad" title="Medidas de seguridad">
              <HStack spacing={3}>
                <Icon as={FiLock} color="green.600" />
                <Text>Aplicamos medidas administrativas, técnicas y físicas razonables para resguardar tus datos.</Text>
              </HStack>
            </Section>

            <Section id="arco" title="Derechos ARCO y revocación">
              <Text>
                Puedes acceder, rectificar, cancelar u oponerte al tratamiento de tus datos (ARCO), así como revocar tu consentimiento o limitar su uso o divulgación. Para ejercer estos derechos, envíanos una solicitud a:
              </Text>
              <HStack mt={2}>
                <Icon as={FiMail} />
                <Link href="mailto:info@sayro.com">info@sayro.com</Link>
              </HStack>
              <Text mt={2} fontSize="sm" color="gray.600">
                Incluye tu nombre completo, medio para notificaciones, descripción clara de la solicitud y, en su caso, documentación que acredite tu identidad.
              </Text>
            </Section>

            <Section id="cookies" title="Cookies y tecnologías similares">
              <Text>
                Utilizamos cookies y tecnologías similares para recordar tus preferencias, analizar el tráfico del sitio y mejorar nuestros contenidos. Puedes ajustar la configuración de tu navegador para bloquearlas o ser notificado cuando se utilicen.
              </Text>
            </Section>

            <Section id="cambios" title="Cambios al Aviso de Privacidad">
              <HStack spacing={3} align="start">
                <Icon as={FiInfo} mt={1} />
                <Text>
                  Cualquier cambio relevante a este Aviso se publicará en este mismo apartado. Te recomendamos revisarlo periódicamente.
                </Text>
              </HStack>
            </Section>

            <Box mt={{ base: 4, md: 6 }}>
              <Badge colorScheme="green" variant="subtle">Vigente</Badge>
              <Text as="span" ml={3} fontSize="sm" color="gray.600">
                Última actualización: {updatedText}
              </Text>
            </Box>
          </Box>
        </Box>
      </Container>
    </Layout>
  );
}

