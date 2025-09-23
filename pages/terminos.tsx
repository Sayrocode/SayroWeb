// pages/terminos.tsx
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
import { FiFileText, FiCheckCircle, FiAlertTriangle, FiPhone, FiMail } from "react-icons/fi";

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

export default function TerminosPage() {
  const updated = new Date();
  const updatedText = updated.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

  return (
    <Layout>
      <Head>
        <title>Términos y Condiciones — Sayro Bienes Raíces</title>
        <meta name="description" content="Lee los términos y condiciones del sitio de Sayro Bienes Raíces: uso permitido, propiedad intelectual, limitaciones de responsabilidad y contacto." />
      </Head>

      {/* Hero */}
      <Box as="header" bg={GREEN} color="white" py={{ base: 10, md: 16 }}>
        <Container maxW="7xl" px={{ base: 4, md: 6 }}>
          <HStack spacing={4} align="start">
            <Icon as={FiFileText} boxSize={{ base: 8, md: 10 }} aria-hidden />
            <Box>
              <Heading as="h1" fontSize={{ base: "2xl", md: "3xl" }} lineHeight="short" className="text-shiny-white">
                Términos y Condiciones
              </Heading>
              <HStack mt={3} spacing={3} color="whiteAlpha.900">
                <Badge bg="whiteAlpha.300" color="white" px={2} py={0.5} rounded="md">
                  Claridad
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
              El acceso y uso del sitio de Sayro Bienes Raíces ("Sitio") implica la aceptación de los presentes Términos y Condiciones. Si no estás de acuerdo, por favor, abstente de utilizar el Sitio.
            </Text>

            <Section id="uso" title="Uso del sitio">
              <List spacing={2} mt={1} pl={1}>
                <ListItem><ListIcon as={FiCheckCircle} color="green.500" /> Debes utilizar el Sitio de forma lícita y respetuosa, sin vulnerar derechos de terceros.</ListItem>
                <ListItem><ListIcon as={FiCheckCircle} color="green.500" /> La información publicada tiene fines informativos; puede cambiar sin previo aviso.</ListItem>
                <ListItem><ListIcon as={FiCheckCircle} color="green.500" /> Queda prohibido el uso de herramientas automatizadas para extraer datos sin autorización.</ListItem>
              </List>
            </Section>

            <Section id="propiedad" title="Propiedad intelectual">
              <Text>
                Los contenidos, logotipos, imágenes y materiales del Sitio pertenecen a sus respectivos titulares y están protegidos por las leyes aplicables. No se te concede licencia o derecho alguno sobre dichos contenidos salvo autorización expresa.
              </Text>
            </Section>

            <Section id="responsabilidad" title="Limitación de responsabilidad">
              <HStack spacing={3} align="start">
                <Icon as={FiAlertTriangle} mt={1} color="yellow.600" />
                <Text>
                  Aunque procuramos la exactitud de la información, Sayro no garantiza la disponibilidad continua del Sitio ni se hace responsable por daños derivados del uso o imposibilidad de uso del mismo, en la medida permitida por la ley.
                </Text>
              </HStack>
            </Section>

            <Section id="enlaces" title="Enlaces a terceros">
              <Text>
                El Sitio puede incluir enlaces a sitios de terceros. No controlamos ni somos responsables del contenido o prácticas de privacidad de dichos sitios.
              </Text>
            </Section>

            <Section id="contacto" title="Contacto y reclamaciones">
              <Text>Si tienes dudas sobre estos Términos, contáctanos:</Text>
              <VStack align="start" spacing={1} mt={1}>
                <HStack><Icon as={FiPhone} /><Text>Tel. <Link href="tel:+524422133030">(442) 213-30-30</Link></Text></HStack>
                <HStack><Icon as={FiMail} /><Text><Link href="mailto:info@sayro.com">info@sayro.com</Link></Text></HStack>
              </VStack>
            </Section>

            <Section id="cambios" title="Cambios a los Términos">
              <Text>
                Podemos actualizar estos Términos cuando sea necesario. El uso continuo del Sitio tras la publicación de cambios implica la aceptación de los mismos.
              </Text>
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

