import { Box, Text, Flex, Link } from "@chakra-ui/react";

export default function Footer() {
  return (
    <Box bg="gray.900" color="gray.200" py={6} >
      <Flex maxW="6xl" mx="auto" px={6} justify="space-between" align="center">
        <Text fontSize="sm">© {new Date().getFullYear()} Sayro Bienes Raíces</Text>
        <Link href="https://wa.me/521234567890" isExternal fontWeight="bold">
          WhatsApp
        </Link>
      </Flex>
    </Box>
  );
}
