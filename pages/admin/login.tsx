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
  InputGroup,
  InputLeftElement,
  Icon,
  useColorModeValue,
  Image as ChakraImage,
} from '@chakra-ui/react';
import { FiLock, FiUser } from 'react-icons/fi';

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
  const panelBg = useColorModeValue('white', 'gray.800');
  const label = useColorModeValue('gray.700', 'gray.300');
  const brand = '#013927';

  return (
    <Layout title="Admin — Iniciar sesión">
      <Box as="main" bg={cream}>
        <Grid templateColumns={{ base: '1fr', md: '1.1fr 0.9fr' }} minH="calc(100vh - 96px)">
          {/* IZQUIERDA: imagen con logo centrado */}
          <GridItem display={{ base: 'none', md: 'block' }} position="relative" overflow="hidden">
            <ChakraImage src="/image2.jpg" alt="Ciudad" w="100%" h="100%" objectFit="cover" />
            <Box position="absolute" inset={0} bg="blackAlpha.500" />
            <Box position="absolute" inset={0} display="grid" placeItems="center">
              <ChakraImage src="/sayrologo.png" alt="Sayro Bienes Raíces" maxW="320px" opacity={0.92} />
            </Box>
          </GridItem>

          {/* DERECHA: formulario */}
          <GridItem display="flex" alignItems="center" justifyContent="center" py={{ base: 10, md: 0 }}>
            <Container maxW="md">
              <Heading
                as="h1"
                fontFamily="heading"
                textTransform="uppercase"
                fontWeight="700"
                letterSpacing="wide"
                mb={6}
                textAlign={{ base: 'center', md: 'left' }}
              >
                Iniciar sesión
              </Heading>

              {error && (
                <Alert status="error" mb={4} rounded="md">
                  <AlertIcon />
                  {error}
                </Alert>
              )}

              <Box as="form" onSubmit={onSubmit} bg={panelBg} borderWidth="1px" borderColor="blackAlpha.100" rounded="xl" p={{ base: 5, md: 6 }} shadow="md">
                <FormControl mb={4}>
                  <FormLabel color={label}>Usuario</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={FiUser} color="gray.400" />
                    </InputLeftElement>
                    <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="Tu usuario" focusBorderColor={brand} />
                  </InputGroup>
                </FormControl>
                <FormControl mb={2}>
                  <FormLabel color={label}>Contraseña</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={FiLock} color="gray.400" />
                    </InputLeftElement>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" focusBorderColor={brand} />
                  </InputGroup>
                </FormControl>
                <Text fontSize="sm" color="gray.500" mb={4}>Protegido con sesión segura.</Text>
                <Button type="submit" isLoading={loading} w="full" colorScheme="green" bg={brand} _hover={{ bg: '#0b3b2e' }} rounded="md">
                  Entrar
                </Button>
              </Box>
            </Container>
          </GridItem>
        </Grid>
      </Box>
    </Layout>
  );
}
