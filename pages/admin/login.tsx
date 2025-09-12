import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Alert,
  AlertIcon,
  Grid,
  GridItem,
  Text,
  Badge,
  Icon,
  useColorModeValue,
  Image as ChakraImage,
} from '@chakra-ui/react';
import { FiLock } from 'react-icons/fi';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error al iniciar sesión');
      router.replace('/admin');
    } catch (e: any) {
      setError(e?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const cream = useColorModeValue('#FBF6E9', 'gray.900');
  const brand = '#013927';

  return (
    <Layout title="Admin — Iniciar sesión">
      <Box as="main" bg={cream}>
        <Grid templateColumns={{ base: '1fr', md: '0.75fr 1.25fr', lg: '0.7fr 1.3fr' }} minH="calc(100vh - 96px)">
          {/* IZQUIERDA: imagen con logo centrado */}
          <GridItem display={{ base: 'none', md: 'block' }} position="relative" overflow="hidden">
            <ChakraImage src="/image2.jpg" alt="Ciudad" w="100%" h="100%" objectFit="cover" />
            <Box position="absolute" inset={0} bg="blackAlpha.400" />
            <Box position="absolute" inset={0} display="grid" placeItems="center">
              <ChakraImage src="/sayrologo.png" alt="Sayro Bienes Raíces" maxW="320px" opacity={0.92} />
            </Box>
          </GridItem>

          {/* DERECHA: formulario plano (sin card) */}
          <GridItem display="flex" alignItems="center" justifyContent="center" py={{ base: 10, md: 0 }}>
            <Container maxW="md" centerContent>
              <Heading
                as="h1"
                fontFamily="heading"
                textTransform="uppercase"
                fontWeight="700"
                letterSpacing="wide"
                mb={6}
                textAlign="center"
              >
                Iniciar sesión
              </Heading>

              {error && (
                <Alert status="error" mb={4} rounded="md">
                  <AlertIcon />
                  {error}
                </Alert>
              )}

              <Box as="form" onSubmit={onSubmit} p={0} w="full">
                <FormControl mb={4}>
                  <FormLabel color="gray.800">Usuario</FormLabel>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="Tu usuario" focusBorderColor={brand} bg="white" />
                </FormControl>
                <FormControl mb={6}>
                  <FormLabel color="gray.800">Contraseña</FormLabel>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" focusBorderColor={brand} bg="white" />
                </FormControl>
                <Box textAlign="center">
                  <Button
                    type="submit"
                    isLoading={loading}
                    display="inline-flex"
                    px={10}
                    colorScheme="green"
                    bg={brand}
                    _hover={{ bg: '#0b3b2e' }}
                    rounded="none"
                  >
                    Entrar
                  </Button>
                </Box>
                <Box mt={4}>
                  <Box textAlign="center" color="gray.700">
                    <Icon as={FiLock} color="green.700" mr={2} />
                    <Text as="span" fontSize="sm" fontWeight="semibold">Conexión segura</Text>
                  </Box>
                  <Text fontSize="sm" color="gray.700" textAlign="center" mt={1}>
                    Cifrado TLS 1.3 y cookies de sesión HTTPOnly. Nunca compartas tus credenciales.
                  </Text>
                  <Text fontSize="xs" color="gray.600" textAlign="center" mt={1}>
                    Verifica el candado en la barra de direcciones y el dominio correcto antes de ingresar.
                  </Text>
                </Box>
              </Box>
            </Container>
          </GridItem>
        </Grid>
      </Box>
    </Layout>
  );
}
