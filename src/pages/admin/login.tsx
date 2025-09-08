import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { Box, Button, Container, FormControl, FormLabel, Heading, Input, Alert, AlertIcon } from '@chakra-ui/react';

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

  return (
    <Layout title="Admin - Iniciar sesión">
      <Container maxW="md" py={10}>
        <Heading mb={6}>Iniciar sesión</Heading>
        {error && (
          <Alert status="error" mb={4}>
            <AlertIcon />
            {error}
          </Alert>
        )}
        <Box as="form" onSubmit={onSubmit} borderWidth="1px" rounded="lg" p={6}>
          <FormControl mb={4}>
            <FormLabel>Usuario</FormLabel>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </FormControl>
          <FormControl mb={6}>
            <FormLabel>Contraseña</FormLabel>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </FormControl>
          <Button colorScheme="green" type="submit" isLoading={loading} width="full">
            Entrar
          </Button>
        </Box>
      </Container>
    </Layout>
  );
}

