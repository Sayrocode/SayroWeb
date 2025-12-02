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

const NAME_REGEX = /^[a-zA-ZÀ-ÿ\u00f1\u00d1'`´.-]{2,80}(?: [a-zA-ZÀ-ÿ\u00f1\u00d1'`´.-]{2,80}){0,4}$/;
const PHONE_REGEX = /^[+]?[\d\s().-]{7,20}$/;
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SESSION_LIMIT = 10;

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
  const [botField, setBotField] = React.useState(''); // honeypot para bots
  // Nota: la versión solicitada no usa fecha/hora; sólo cambia el formulario
  const [submitting, setSubmitting] = React.useState(false);

  const waUrl = React.useMemo(() => waHref(`Hola, me interesa ${propertyTitle} (ID: ${propertyId}).`), [propertyId, propertyTitle]);
  const mailtoHref = React.useMemo(() => {
    const subject = `Interés en ${propertyTitle}`;
    const body = `Hola, me interesa ${propertyTitle} (ID: ${propertyId}).`;
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [propertyId, propertyTitle]);

  function sanitizeMessage(text: string) {
    return text.replace(/<[^>]*>/g, ' ').replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
  }

  function sessionSubmissionCount() {
    if (typeof window === 'undefined') return 0;
    const raw = window.sessionStorage.getItem('leadSubmissions') || '0';
    const num = parseInt(raw, 10);
    return Number.isFinite(num) ? num : 0;
  }

  function bumpSessionSubmission() {
    if (typeof window === 'undefined') return;
    const next = Math.min(SESSION_LIMIT, sessionSubmissionCount() + 1);
    window.sessionStorage.setItem('leadSubmissions', String(next));
  }

  function validateFields() {
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();
    const cleanMessage = sanitizeMessage(message);

    if (!NAME_REGEX.test(cleanName)) {
      toast({ title: 'Nombre inválido', description: 'Usa solo letras y apellidos reales.', status: 'warning' });
      return null;
    }
    if (!cleanPhone && !cleanEmail) {
      toast({ title: 'Agrega un contacto', description: 'Incluye teléfono o correo para poder responderte.', status: 'warning' });
      return null;
    }
    if (cleanPhone && !PHONE_REGEX.test(cleanPhone)) {
      toast({ title: 'Teléfono inválido', description: 'Revisa el formato; solo dígitos y signos +()-', status: 'warning' });
      return null;
    }
    if (cleanEmail && !EMAIL_REGEX.test(cleanEmail)) {
      toast({ title: 'Correo inválido', description: 'Verifica que el email esté bien escrito.', status: 'warning' });
      return null;
    }

    return { cleanName, cleanPhone, cleanEmail, cleanMessage };
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionSubmissionCount() >= SESSION_LIMIT) {
      toast({ title: 'Límite alcanzado', description: 'Has enviado muchos formularios. Inténtalo más tarde.', status: 'error' });
      return;
    }

    const validated = validateFields();
    if (!validated) return;

    if (botField.trim()) {
      toast({ title: 'Detección anti-bot', description: 'No pudimos procesar tu envío.', status: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        source: 'website',
        name: validated.cleanName,
        phone: validated.cleanPhone,
        email: validated.cleanEmail,
        message: mode === 'contact' ? validated.cleanMessage : `${validated.cleanMessage}\n\nSolicitud de cita`,
        propertyPublicId: propertyId,
        pagePath: '/propiedades/[id]',
        botField,
      };
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const resp = await fetch(`/api/leads?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        toast({ title: mode === 'contact' ? 'Mensaje enviado' : 'Cita solicitada', status: 'success', duration: 2200 });
        bumpSessionSubmission();
        setName(''); setPhone(''); setEmail('');
      } else {
        const err = await resp.json().catch(() => null);
        toast({ title: 'No se pudo enviar', description: err?.error || 'Inténtalo nuevamente.', status: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box bg={bgColor} borderRadius="md" p={6} color="white" position={{ base: 'static', lg: 'sticky' }} top={{ base: 'auto', lg: 6 }} boxShadow="lg">
      <Text fontSize="lg" fontWeight="bold" textAlign="center" mb={3} textTransform="uppercase" fontFamily='heading'>Contacto</Text>

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
          <Input
            type='text'
            value={botField}
            onChange={(e) => setBotField(e.target.value)}
            tabIndex={-1}
            aria-hidden={true}
            autoComplete="off"
            style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0 }}
          />
          {mode === 'schedule' ? (
            <>
              <FormControl isRequired>
                <FormLabel color='white'>Nombre</FormLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  bg='white'
                  color='gray.800'
                  placeholder='Tu nombre completo'
                  maxLength={120}
                  pattern={NAME_REGEX.source}
                  autoComplete="name"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel color='white'>Teléfono</FormLabel>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  bg='white'
                  color='gray.800'
                  placeholder='Tu número de teléfono'
                  maxLength={40}
                  pattern={PHONE_REGEX.source}
                  autoComplete="tel"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel color='white'>Correo</FormLabel>
                <Input
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  bg='white'
                  color='gray.800'
                  placeholder='tu@email.com'
                  maxLength={160}
                  pattern={EMAIL_REGEX.source}
                  autoComplete="email"
                />
              </FormControl>
              <FormControl>
                <FormLabel color='white'>Mensaje</FormLabel>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(sanitizeMessage(e.target.value))}
                  rows={4}
                  bg='white'
                  color='gray.800'
                  placeholder='Cuéntanos más sobre tu interés…'
                  maxLength={500}
                />
              </FormControl>
              <Button type='submit' colorScheme='whiteAlpha' bg='whiteAlpha.300' _hover={{ bg: 'whiteAlpha.400' }} isLoading={submitting} alignSelf='stretch'>
                Enviar
              </Button>
            </>
          ) : (
            <>
              <Input
                placeholder='Nombre completo'
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                bg='white'
                color='gray.800'
                maxLength={120}
                pattern={NAME_REGEX.source}
                autoComplete="name"
              />
              <Input
                placeholder='Teléfono (WhatsApp)'
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                bg='white'
                color='gray.800'
                maxLength={40}
                pattern={PHONE_REGEX.source}
                autoComplete="tel"
              />
              <Input
                placeholder='Email (opcional)'
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                bg='white'
                color='gray.800'
                maxLength={160}
                pattern={EMAIL_REGEX.source}
                autoComplete="email"
              />
              <Textarea
                placeholder='Mensaje'
                value={message}
                onChange={(e) => setMessage(sanitizeMessage(e.target.value))}
                rows={3}
                bg='white'
                color='gray.800'
                maxLength={500}
              />
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
