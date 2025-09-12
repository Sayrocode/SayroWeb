// pages/anunciate.tsx
import { useState } from "react";
import NextLink from "next/link";
import {
  Box,
  Grid,
  GridItem,
  Container,
  Heading,
  Text,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Textarea,
  SimpleGrid,
  Button,
  HStack,
  Icon,
  useToast,
  Link,
} from "@chakra-ui/react";
import { FiSend, FiPhone, FiMail } from "react-icons/fi";
import Layout from "components/Layout";

const GREEN = "#0E3B30";          // panel (matching your mock)
const GREEN_DARK = "#0B2B23";      // hover/contrast

function Field({
  label,
  children,
  isRequired,
}: {
  label: string;
  children: React.ReactNode;
  isRequired?: boolean;
}) {
  return (
    <FormControl isRequired={isRequired}>
      <FormLabel
        mb="1"
        color="white"
        fontSize="xs"
        letterSpacing="0.06em"
        textTransform="none"
        fontWeight="semibold"
      >
        {label}
      </FormLabel>
      {children}
    </FormControl>
  );
}

export default function AnunciatePage() {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      // TODO: envíalo a tu endpoint real
      await new Promise((r) => setTimeout(r, 600));
      toast({
        title: "¡Enviado!",
        description: "Hemos recibido tu información. Te contactaremos pronto.",
        status: "success",
      });
      e.currentTarget.reset();
    } catch (err: any) {
      toast({
        title: "No se pudo enviar",
        description: err?.message || "Inténtalo de nuevo.",
        status: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
    {/* Fondo de imagen a todo el bloque */}
    <Box
      as="main"
      position="relative"
      bgImage="url(/anunciate.png)"
      bgSize="cover"
      bgPos="center"
      bgRepeat="no-repeat"
    >
      {/* overlay sutil para legibilidad */}
      <Box position="absolute" inset={0} bg="blackAlpha.300" />
      {/* franja con panel sobre el fondo de imagen */}
      <Grid
        position="relative"
        templateColumns={{ base: "1fr", md: "minmax(0,1.1fr) minmax(0,0.9fr)" }}
        minH={{ base: "auto", md: "100vh" }}
      >
        {/* LADO IZQUIERDO: imagen + claim superpuesto */}
        <GridItem position="relative" minH={{ base: "46vh", md: "100%" }}>
          <Container maxW="7xl" h="100%" position="relative" zIndex={1}>
            <Box
              position="absolute"
              left={{ base: 4, md: 8 }}
              bottom={{ base: 6, md: 10 }}
              right={{ base: 4, md: "auto" }}
              maxW={{ base: "90%", md: "420px" }}
            >
              <Text
                color="white"
                fontWeight="bold"
                fontSize={{ base: "lg", md: "xl" }}
                lineHeight={1.35}
                textShadow="0 2px 14px rgba(0,0,0,.55)"
              >
                Buscamos la mejor rentabilidad de tu propiedad y optimización de tu inversión.
              </Text>
            </Box>
          </Container>
        </GridItem>

        {/* LADO DERECHO: panel compacto (verde oscuro) */}
        <GridItem display="flex" alignItems="center" py={{ base: 8, md: 0 }}>
          <Container maxW="container.sm" px={{ base: 4, md: 8 }}>
            <Box
              as="section"
              aria-labelledby="anun-title"
              bg="rgba(14,59,48,0.78)" /* verde translúcido: deja ver la imagen */
              my={10}
              color="white"
              rounded={{ base: "xl", md: "xl" }}
              boxShadow="0 8px 28px rgba(0,0,0,.35)"
              border="1px solid"
              borderColor="whiteAlpha.300"
              p={{ base: 5, md: 8 }}
              style={{ backdropFilter: "saturate(1.05)" }}
            >
              <Heading
                id="anun-title"
                as="h1"
                fontSize={{ base: "xl", md: "2xl" }}
                textAlign="center"
                letterSpacing="0.04em"
                mb={{ base: 4, md: 5 }}
              >
                ANÚNCIATE CON NOSOTROS
              </Heading>

              <Box as="form" onSubmit={onSubmit}>
                {/* Línea 1 */}
                <SimpleGrid columns={{ base: 1, md: 3 }} gap={3} mb={3}>
                  <Field label="Tipo de inmueble" isRequired>
                    <Select name="tipo" bg="white" color="gray.800" size="sm">
                      <option value="">Selecciona</option>
                      <option>Casa</option>
                      <option>Departamento</option>
                      <option>Terreno</option>
                      <option>Local</option>
                      <option>Bodega</option>
                      <option>Oficina</option>
                    </Select>
                  </Field>
                  <Field label="Habitaciones">
                    <Select name="habitaciones" bg="white" color="gray.800" size="sm" defaultValue="0">
                      {[...Array(11)].map((_, i) => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Estado del inmueble">
                    <Select name="estado_inmueble" bg="white" color="gray.800" size="sm">
                      <option value="">—</option>
                      <option>Nuevo</option>
                      <option>Usado</option>
                      <option>En construcción</option>
                      <option>Remodelado</option>
                    </Select>
                  </Field>
                </SimpleGrid>

                {/* Línea 2 */}
                <SimpleGrid columns={{ base: 1, md: 3 }} gap={3} mb={3}>
                  <Field label="Negocio" isRequired>
                    <Select name="negocio" bg="white" color="gray.800" size="sm">
                      <option value="">Selecciona</option>
                      <option value="venta">Venta</option>
                      <option value="renta">Renta</option>
                      <option value="traspaso">Traspaso</option>
                    </Select>
                  </Field>
                  <Field label="País">
                    <Input name="pais" defaultValue="México" bg="white" color="gray.800" size="sm" />
                  </Field>
                  <Field label="Estado">
                    <Input name="estado" bg="white" color="gray.800" size="sm" />
                  </Field>
                </SimpleGrid>

                {/* Línea 3 */}
                <SimpleGrid columns={{ base: 1, md: 3 }} gap={3} mb={3}>
                  <Field label="Municipio">
                    <Input name="municipio" bg="white" color="gray.800" size="sm" />
                  </Field>
                  <Field label="Colonia">
                    <Input name="colonia" bg="white" color="gray.800" size="sm" />
                  </Field>
                  <Field label="Precio estimado">
                    <InputGroup size="sm" bg="white" rounded="md">
                      <InputLeftElement pointerEvents="none" children={<Text color="gray.500">$</Text>} />
                      <Input name="precio" type="number" min={0} color="gray.800" />
                    </InputGroup>
                  </Field>
                </SimpleGrid>

                {/* Línea 4 */}
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} mb={3}>
                  <Field label="Superficie construcción (m²)">
                    <Input name="sup_construccion" type="number" min={0} bg="white" color="gray.800" size="sm" />
                  </Field>
                  <Field label="Superficie terreno (m²)">
                    <Input name="sup_terreno" type="number" min={0} bg="white" color="gray.800" size="sm" />
                  </Field>
                </SimpleGrid>

                {/* Línea 5 */}
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} mb={3}>
                  <Field label="Nombre" isRequired>
                    <Input name="nombre" bg="white" color="gray.800" size="sm" />
                  </Field>
                  <Field label="Correo electrónico" isRequired>
                    <Input name="email" type="email" bg="white" color="gray.800" size="sm" />
                  </Field>
                </SimpleGrid>

                {/* Línea 6 */}
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={3} mb={3}>
                  <Field label="Teléfono">
                    <InputGroup size="sm" bg="white" rounded="md">
                      <InputLeftElement pointerEvents="none">
                        <Icon as={FiPhone} color="gray.500" />
                      </InputLeftElement>
                      <Input name="telefono" color="gray.800" />
                    </InputGroup>
                  </Field>
                  <Field label="Notas">
                    <Input name="notas_short" bg="white" color="gray.800" size="sm" />
                  </Field>
                </SimpleGrid>

                {/* Notas largas */}
                <Field label="Detalles adicionales">
                  <Textarea name="notas" bg="white" color="gray.800" size="sm" rows={4} />
                </Field>

                <Button
                  type="submit"
                  mt={5}
                  w="full"
                  size="md"
                  color="white"
                  bg="whiteAlpha.300"
                  _hover={{ bg: "whiteAlpha.400" }}
                  border="1px solid"
                  borderColor="whiteAlpha.500"
                  leftIcon={<FiSend />}
                  isLoading={submitting}
                >
                  Enviar
                </Button>

                {/* Atajos de contacto / redes */}
                <HStack spacing={6} justify="center" mt={5} opacity={0.95}>
                  <HStack as={Link} href="mailto:hola@tu-dominio.com" _hover={{ textDecoration: "none" }}>
                    <Icon as={FiMail} />
                    <Text>Email</Text>
                  </HStack>
                  <HStack as={Link} href="tel:+521234567890" _hover={{ textDecoration: "none" }}>
                    <Icon as={FiPhone} />
                    <Text>Teléfono</Text>
                  </HStack>
                  <Link as={NextLink} href="/contacto" textDecor="underline">
                    O ir a contacto
                  </Link>
                </HStack>
              </Box>
            </Box>
          </Container>
        </GridItem>
      </Grid>
    </Box>
    </Layout>
  );
}
