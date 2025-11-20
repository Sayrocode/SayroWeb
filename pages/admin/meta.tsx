import type { GetServerSideProps } from 'next';
import React from 'react';
import useSWR from 'swr';
import { getIronSession } from 'iron-session';
import { sessionOptions, AppSession } from '../../lib/session';
import Layout from '../../components/Layout';
import { Box, Button, Container, Heading, Text, Stack, HStack, Badge, Textarea, useToast, Input } from '@chakra-ui/react';
import Link from 'next/link';

type Props = { username: string };
const fetcher = (u: string) => fetch(u).then(r => r.json());

export default function AdminMeta({ username }: Props) {
  const toast = useToast();
  const { data, mutate } = useSWR('/api/admin/meta/token/status', fetcher, { revalidateOnFocus: false });
  const [newToken, setNewToken] = React.useState('');
  const [expiresAt, setExpiresAt] = React.useState<string | null>(null);
  const [shortToken, setShortToken] = React.useState('');
  const [appId, setAppId] = React.useState('');
  const [appSecret, setAppSecret] = React.useState('');

  const refresh = async () => {
    try {
      const r = await fetch('/api/admin/meta/token/refresh', { method: 'POST' });
      const j = await r.json();
      if (j?.ok) {
        setNewToken(j.access_token || '');
        setExpiresAt(j.expiresAt || null);
        toast({ title: 'Token actualizado', description: 'Guardado en la base de datos', status: 'success' });
        mutate();
      } else {
        toast({ title: 'No se pudo refrescar', description: j?.error || '', status: 'error' });
      }
    } catch {
      toast({ title: 'Error al refrescar', status: 'error' });
    }
  };

  const exp = data?.expiresAt ? new Date(data.expiresAt) : null;
  const daysLeft = typeof data?.daysLeft === 'number' ? data.daysLeft : null;

  return (
    <Layout title="Admin - Meta Token">
      <Box bg="#F7F4EC">
        <Container maxW="3xl" py={8}>
          <Stack spacing={4}>
            <HStack justify='space-between'>
              <Heading size='md' color='#0E3B30'>Meta Token</Heading>
              <Button as={Link} href='/admin' variant='link' colorScheme='green'>Volver</Button>
            </HStack>

            <Box borderWidth='1px' rounded='md' p={4} bg='white'>
              <HStack spacing={3} align='center'>
                <Text>Token en .env:</Text>
                <Badge colorScheme={data?.hasToken ? 'green' : 'red'}>{data?.hasToken ? 'Presente' : 'Falta'}</Badge>
                <Badge colorScheme={data?.canDebug ? 'blue' : 'gray'}>{data?.canDebug ? 'Con App ID/Secret' : 'Sin App ID/Secret'}</Badge>
              </HStack>
              {data?.canDebug && (
                <HStack spacing={3} align='center' mt={2} wrap='wrap'>
                  {typeof data?.isValid === 'boolean' && (<Badge colorScheme={data.isValid ? 'green' : 'red'}>{data.isValid ? 'Válido' : 'Inválido'}</Badge>)}
                  {exp && (<Text>Expira: {exp.toLocaleString()}</Text>)}
                  {typeof daysLeft === 'number' && (<Text>({daysLeft} días)</Text>)}
                  {data?.source && (<Badge colorScheme='purple'>Fuente: {data.source}</Badge>)}
                </HStack>
              )}
              <HStack mt={3}>
                <Button onClick={() => mutate()} variant='outline'>Actualizar estado</Button>
              </HStack>
            </Box>

            <Box borderWidth='1px' rounded='md' p={4} bg='white'>
              <Heading size='sm' mb={2}>Configurar App ID/Secret (opcional)</Heading>
              <Text fontSize='sm' color='gray.600'>Si no puedes actualizar variables de entorno, guarda aquí las credenciales de la app para permitir refrescar tokens.</Text>
              <Input placeholder='META_APP_ID' value={appId} onChange={(e)=>setAppId(e.target.value)} mt={2} />
              <Input placeholder='META_APP_SECRET' value={appSecret} onChange={(e)=>setAppSecret(e.target.value)} mt={2} />
              <HStack mt={2}>
                <Button onClick={async ()=>{
                  if (!appId || !appSecret) { toast({ title: 'Completa ambos campos', status: 'warning' }); return; }
                  const r = await fetch('/api/admin/meta/token/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appId, appSecret }) });
                  const j = await r.json();
                  if (j?.ok) { toast({ title: 'Guardado', status: 'success' }); setAppId(''); setAppSecret(''); mutate(); }
                  else { toast({ title: 'No se pudo guardar', description: j?.error || '', status: 'error' }); }
                }} colorScheme='purple'>Guardar</Button>
              </HStack>
            </Box>

            <Box borderWidth='1px' rounded='md' p={4} bg='white'>
              <Heading size='sm' mb={2}>Refrescar Token (60 días)</Heading>
              <Text fontSize='sm' color='gray.600'>Requiere META_APP_ID y META_APP_SECRET. Actualiza el token guardado en la base de datos (sin redeploy).</Text>
              <HStack mt={3}>
                <Button colorScheme='green' onClick={refresh}>Refrescar</Button>
              </HStack>
              {newToken && (
                <Box mt={3}>
                  <Text fontSize='sm' color='gray.700'>Nuevo token generado (ya guardado):</Text>
                  <Textarea value={newToken} onChange={(e)=>setNewToken(e.target.value)} rows={3} />
                  {expiresAt && (<Text fontSize='sm' color='gray.600' mt={1}>Vence: {new Date(expiresAt).toLocaleString()}</Text>)}
                </Box>
              )}
            </Box>

            <Box borderWidth='1px' rounded='md' p={4} bg='white'>
              <Heading size='sm' mb={2}>Pegar token corto (opcional)</Heading>
              <Text fontSize='sm' color='gray.600'>Si tu token expiró y no puede renovarse, pega un token corto de usuario para intercambiarlo por uno de 60 días y guardarlo en la base.</Text>
              <Textarea value={shortToken} onChange={(e)=>setShortToken(e.target.value)} rows={3} placeholder='EAAB...'/>
              <HStack mt={2}>
                <Button onClick={async () => {
                  if (!shortToken.trim()) { toast({ title: 'Pega un token', status: 'warning' }); return; }
                  const r = await fetch('/api/admin/meta/token/exchange', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userToken: shortToken.trim() }) });
                  const j = await r.json();
                  if (j?.ok) { toast({ title: 'Guardado', description: j.expiresAt ? `Vence ${new Date(j.expiresAt).toLocaleString()}` : '', status: 'success' }); setShortToken(''); mutate(); }
                  else { toast({ title: 'No se pudo intercambiar', description: j?.error || '', status: 'error' }); }
                }} colorScheme='blue'>Intercambiar y Guardar</Button>
              </HStack>
            </Box>

          </Stack>
        </Container>
      </Box>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res }) => {
  const session = await getIronSession<AppSession>(req, res, sessionOptions);
  if (!session.user) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }
  return { props: { username: session.user.username } };
};
