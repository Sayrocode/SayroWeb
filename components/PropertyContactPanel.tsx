import React from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  Icon,
  useColorModeValue,
  Input,
  Textarea,
  // HStack,
  useToast,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { FaWhatsapp } from 'react-icons/fa';
import { waHref, CONTACT_EMAIL } from '../lib/site';

interface PropertyContactPanelProps {
  propertyTitle: string;
  propertyId: string;
  onShare?: () => void;
  onFavorite?: () => void;
}

export default function PropertyContactPanel({ propertyTitle, propertyId }: PropertyContactPanelProps) {
  const toast = useToast();
  const bgColor = useColorModeValue('green.700', 'green.800');
  const [mode, setMode] = React.useState<'contact' | 'schedule'>('contact');
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [message, setMessage] = React.useState(`Me interesa ${propertyTitle} (ID: ${propertyId}). ¿Podemos agendar una visita?`);
  // Nota: la versión solicitada no usa fecha/hora; sólo cambia el formulario
  const [submitting, setSubmitting] = React.useState(false);

  const waUrl = React.useMemo(() => waHref(`Hola, me interesa ${propertyTitle} (ID: ${propertyId}).`), [propertyId, propertyTitle]);
  const mailtoHref = React.useMemo(() => {
    const subject = `Interés en ${propertyTitle}`;
    const body = `Hola, me interesa ${propertyTitle} (ID: ${propertyId}).`;
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [propertyId, propertyTitle]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        name,
        phone,
        email,
        message: mode === 'contact' ? message : `${message}\n\nSolicitud de cita`,
        propertyPublicId: propertyId,
        pagePath: '/propiedades/[id]'
      };
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const resp = await fetch(`/api/leads?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        toast({ title: mode === 'contact' ? 'Mensaje enviado' : 'Cita solicitada', status: 'success', duration: 2200 });
        setName(''); setPhone(''); setEmail('');
      } else {
        toast({ title: 'No se pudo enviar', status: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box bg={bgColor} borderRadius="md" p={6} color="white" position={{ base: 'static', lg: 'sticky' }} top={{ base: 'auto', lg: 6 }} boxShadow="lg">
      <Text fontSize="lg" fontWeight="bold" textAlign="center" mb={3} textTransform="uppercase">Contacto</Text>

      {/* CTAs superiores como en la imagen: Agenda una visita (switch) + WhatsApp */}
      <VStack spacing={2} mb={4} align="stretch">
        <Button width='full' bg='white' color={bgColor} _hover={{ bg: 'gray.100' }} fontWeight='bold' onClick={() => setMode('schedule')}>
          Agenda una visita
        </Button>
        <Button as='a' href={waUrl} target='_blank' rel='noopener' leftIcon={<Icon as={FaWhatsapp} />} width='full' bg='white' color={bgColor} _hover={{ bg: 'gray.100' }} fontWeight='bold'>
          WhatsApp
        </Button>
      </VStack>

      {/* Formulario (varía por modo) */}
      <Box as='form' onSubmit={onSubmit}>
        <VStack spacing={3} align='stretch'>
          {mode === 'schedule' ? (
            <>
              <FormControl isRequired>
                <FormLabel color='white'>Nombre</FormLabel>
                <Input value={name} onChange={(e) => setName(e.target.value)} bg='white' color='gray.800' placeholder='Tu nombre completo' />
              </FormControl>
              <FormControl isRequired>
                <FormLabel color='white'>Teléfono</FormLabel>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} bg='white' color='gray.800' placeholder='Tu número de teléfono' />
              </FormControl>
              <FormControl isRequired>
                <FormLabel color='white'>Correo</FormLabel>
                <Input type='email' value={email} onChange={(e) => setEmail(e.target.value)} bg='white' color='gray.800' placeholder='tu@email.com' />
              </FormControl>
              <FormControl>
                <FormLabel color='white'>Mensaje</FormLabel>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} bg='white' color='gray.800' placeholder='Cuéntanos más sobre tu interés…' />
              </FormControl>
              <Button type='submit' colorScheme='whiteAlpha' bg='whiteAlpha.300' _hover={{ bg: 'whiteAlpha.400' }} isLoading={submitting} alignSelf='stretch'>
                Enviar
              </Button>
            </>
          ) : (
            <>
              <Input placeholder='Nombre completo' value={name} onChange={(e) => setName(e.target.value)} required bg='white' color='gray.800' />
              <Input placeholder='Teléfono (WhatsApp)' value={phone} onChange={(e) => setPhone(e.target.value)} required bg='white' color='gray.800' />
              <Input placeholder='Email (opcional)' type='email' value={email} onChange={(e) => setEmail(e.target.value)} bg='white' color='gray.800' />
              <Textarea placeholder='Mensaje' value={message} onChange={(e) => setMessage(e.target.value)} rows={3} bg='white' color='gray.800' />
              <Button type='submit' colorScheme='whiteAlpha' bg='whiteAlpha.300' _hover={{ bg: 'whiteAlpha.400' }} isLoading={submitting} alignSelf='stretch'>
                Enviar
              </Button>
            </>
          )}
        </VStack>
      </Box>
    </Box>
  );
}
