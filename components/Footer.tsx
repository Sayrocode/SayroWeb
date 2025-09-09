import {
  Box,
  Container,
  Stack,
  Text,
  Link,
  Wrap,
  WrapItem,
  HStack,
} from "@chakra-ui/react";
import NextLink from "next/link";

export default function Footer() {
  return (
    <Box as="footer" mt={10} bg="#2b2f2e" color="whiteAlpha.900">
      <Container maxW="7xl" py={{ base: 8, md: 10 }} px={{ base: 4, md: 6 }}>
        <Stack spacing={3}>
          <Text fontSize={{ base: "md", md: "lg" }} fontWeight="semibold">
            Sayro Bienes Raíces
          </Text>
          <Text color="gray.300" maxW="3xl">
            El mejor precio, rápido y seguro.
          </Text>
          <HStack spacing={3} color="gray.300">
            <Text>Querétaro, México</Text>
            <Text>•</Text>
            <Link href="tel:+524422133030">(442) 213-30-30</Link>
          </HStack>
        </Stack>
      </Container>

      <Box bg="#3a3f3d">
        <Container maxW="7xl" py={{ base: 4, md: 5 }} px={{ base: 4, md: 6 }}>
          <Stack
            direction={{ base: "column", md: "row" }}
            spacing={{ base: 4, md: 6 }}
            align={{ base: "center", md: "center" }}
            justify="space-between"
            fontSize={{ base: "xs", md: "sm" }}
            color="gray.200"
            textAlign={{ base: "center", md: "left" }}
          >
            <Wrap spacing={{ base: 2, md: 3 }} justify={{ base: "center", md: "flex-start" }}>
              <WrapItem>
                <Link as={NextLink} href="/terminos" _hover={{ color: "green.300" }}>
                  Términos y Condiciones
                </Link>
              </WrapItem>
              <WrapItem>•</WrapItem>
              <WrapItem>
                <Link as={NextLink} href="/aviso-de-privacidad" _hover={{ color: "green.300" }}>
                  Política de privacidad
                </Link>
              </WrapItem>
            </Wrap>
            <Text>© {new Date().getFullYear()} Sayro Bienes Raíces</Text>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}

