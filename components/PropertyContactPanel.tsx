import React, { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Input,
  Textarea,
  useToast,
  Icon,
  FormControl,
  FormLabel,
  useColorModeValue,
  Badge,
  Heading,
} from '@chakra-ui/react';
import { FaWhatsapp, FaHeart, FaShare } from 'react-icons/fa';
import { FiMapPin, FiHome, FiDroplet } from 'react-icons/fi';
import { waHref } from '../lib/site';

interface PropertyContactPanelProps {
  propertyTitle: string;
  propertyId: string;
  onShare?: () => void;
  onFavorite?: () => void;
}

export default function PropertyContactPanel({
  propertyTitle,
  propertyId,
  onShare,
  onFavorite,
}: PropertyContactPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
  });
  const [scheduleData, setScheduleData] = useState({
    name: '',
    phone: '',
    email: '',
    date1: '',
    time1: '',
    date2: '',
    time2: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const bgColor = useColorModeValue('green.700', 'green.800');
  const textColor = 'white';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleScheduleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setScheduleData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'website',
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          propertyId: propertyId,
          propertyPublicId: propertyId,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al enviar el formulario');
      }
      
      toast({
        title: 'Mensaje enviado',
        description: 'Gracias por tu interés. Te contactaremos pronto.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Reset form
      setFormData({ name: '', phone: '', email: '', message: '' });
      setShowForm(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje. Inténtalo de nuevo.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const message = `Solicitud de visita para ${propertyTitle}:\n\nFecha 1: ${scheduleData.date1} a las ${scheduleData.time1}\nFecha 2: ${scheduleData.date2} a las ${scheduleData.time2}\n\nMensaje: ${scheduleData.message}`;

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'website',
          name: scheduleData.name,
          email: scheduleData.email,
          phone: scheduleData.phone,
          message: message,
          propertyId: propertyId,
          propertyPublicId: propertyId,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al enviar el formulario');
      }
      
      toast({
        title: 'Visita agendada',
        description: 'Hemos recibido tu solicitud de visita. Te contactaremos pronto.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Reset form
      setScheduleData({ name: '', phone: '', email: '', date1: '', time1: '', date2: '', time2: '', message: '' });
      setShowScheduleForm(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo enviar la solicitud. Inténtalo de nuevo.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsApp = () => {
    const message = `Hola, me interesa ${propertyTitle} (ID: ${propertyId}).`;
    const waUrl = waHref(message);
    window.open(waUrl, '_blank');
  };

  const handleScheduleVisit = () => {
    setShowScheduleForm(true);
  };

  const handleContactForm = () => {
    setShowForm(true);
  };

  return (
    <Box
      bg={bgColor}
      borderRadius="md"
      p={6}
      color={textColor}
      position="sticky"
      top={6}
      boxShadow="lg"
      height="fit-content"
    >
      {/* Título del panel */}
      <Text
        fontSize="lg"
        fontWeight="bold"
        textAlign="center"
        mb={4}
        textTransform="uppercase"
        color="white"
      >
        CONTACTO
      </Text>

      {/* Botones de acción principales */}
      <VStack spacing={3} mb={4}>
        <Button
          width="full"
          bg="white"
          color={bgColor}
          _hover={{ bg: 'gray.100' }}
          onClick={handleScheduleVisit}
          fontWeight="bold"
        >
          Agenda una visita
        </Button>
        
        <Button
          width="full"
          bg="white"
          color={bgColor}
          _hover={{ bg: 'gray.100' }}
          leftIcon={<Icon as={FaWhatsapp} />}
          onClick={handleWhatsApp}
          fontWeight="bold"
        >
          WhatsApp
        </Button>
      </VStack>

      {/* Formulario de contacto normal (siempre visible cuando no está el de agendar) */}
      {!showScheduleForm && (
        <Box
          as="form"
          onSubmit={handleSubmit}
          bg="transparent"
          p={4}
          color="white"
        >
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="bold" color="white">
                Nombre
              </FormLabel>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Tu nombre completo"
                size="sm"
                bg="white"
                color="gray.700"
                borderColor="gray.300"
                _placeholder={{ color: "gray.500" }}
                _focus={{ borderColor: bgColor, boxShadow: `0 0 0 1px ${bgColor}` }}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="bold" color="white">
                Teléfono
              </FormLabel>
              <Input
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Tu número de teléfono"
                size="sm"
                bg="white"
                color="gray.700"
                borderColor="gray.300"
                _placeholder={{ color: "gray.500" }}
                _focus={{ borderColor: bgColor, boxShadow: `0 0 0 1px ${bgColor}` }}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="bold" color="white">
                Correo
              </FormLabel>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="tu@email.com"
                size="sm"
                bg="white"
                color="gray.700"
                borderColor="gray.300"
                _placeholder={{ color: "gray.500" }}
                _focus={{ borderColor: bgColor, boxShadow: `0 0 0 1px ${bgColor}` }}
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="bold" color="white">
                Mensaje
              </FormLabel>
              <Textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Cuéntanos más sobre tu interés..."
                size="sm"
                rows={3}
                bg="white"
                color="gray.700"
                borderColor="gray.300"
                _placeholder={{ color: "gray.500" }}
                _focus={{ borderColor: bgColor, boxShadow: `0 0 0 1px ${bgColor}` }}
                resize="vertical"
              />
            </FormControl>

            <Button
              type="submit"
              bg="white"
              color="green.600"
              size="sm"
              width="full"
              isLoading={isSubmitting}
              loadingText="Enviando..."
              _hover={{ bg: "gray.50" }}
            >
              ENVIAR
            </Button>
          </VStack>
        </Box>
      )}

      {/* Formulario de agendar visita */}
      {showScheduleForm && (
        <Box
          as="form"
          onSubmit={handleScheduleSubmit}
          bg="transparent"
          p={4}
          color="white"
        >
          <Text
            fontSize="md"
            fontWeight="bold"
            textAlign="center"
            mb={4}
            color="white"
          >
            AGENDA TU VISITA
          </Text>
          
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="bold" color="white">
                Nombre
              </FormLabel>
              <Input
                name="name"
                value={scheduleData.name}
                onChange={handleScheduleInputChange}
                placeholder="Tu nombre completo"
                size="sm"
                bg="white"
                color="gray.700"
                borderColor="gray.300"
                _placeholder={{ color: "gray.500" }}
                _focus={{ borderColor: bgColor, boxShadow: `0 0 0 1px ${bgColor}` }}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="bold" color="white">
                Teléfono
              </FormLabel>
              <Input
                name="phone"
                type="tel"
                value={scheduleData.phone}
                onChange={handleScheduleInputChange}
                placeholder="Tu número de teléfono"
                size="sm"
                bg="white"
                color="gray.700"
                borderColor="gray.300"
                _placeholder={{ color: "gray.500" }}
                _focus={{ borderColor: bgColor, boxShadow: `0 0 0 1px ${bgColor}` }}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="bold" color="white">
                Correo electrónico
              </FormLabel>
              <Input
                name="email"
                type="email"
                value={scheduleData.email}
                onChange={handleScheduleInputChange}
                placeholder="tu@email.com"
                size="sm"
                bg="white"
                color="gray.700"
                borderColor="gray.300"
                _placeholder={{ color: "gray.500" }}
                _focus={{ borderColor: bgColor, boxShadow: `0 0 0 1px ${bgColor}` }}
              />
            </FormControl>

            <HStack width="full" spacing={3}>
              <FormControl isRequired flex={1}>
                <FormLabel fontSize="sm" fontWeight="bold" color="white">
                  Fecha 1
                </FormLabel>
                <Input
                  name="date1"
                  type="date"
                  value={scheduleData.date1}
                  onChange={handleScheduleInputChange}
                  size="sm"
                  bg="white"
                  color="gray.700"
                  borderColor="gray.300"
                  _focus={{ borderColor: bgColor, boxShadow: `0 0 0 1px ${bgColor}` }}
                />
              </FormControl>

              <FormControl isRequired flex={1}>
                <FormLabel fontSize="sm" fontWeight="bold" color="white">
                  Hora 1
                </FormLabel>
                <Input
                  name="time1"
                  type="time"
                  value={scheduleData.time1}
                  onChange={handleScheduleInputChange}
                  size="sm"
                  bg="white"
                  color="gray.700"
                  borderColor="gray.300"
                  _focus={{ borderColor: bgColor, boxShadow: `0 0 0 1px ${bgColor}` }}
                />
              </FormControl>
            </HStack>

            <HStack width="full" spacing={3}>
              <FormControl isRequired flex={1}>
                <FormLabel fontSize="sm" fontWeight="bold" color="white">
                  Fecha 2
                </FormLabel>
                <Input
                  name="date2"
                  type="date"
                  value={scheduleData.date2}
                  onChange={handleScheduleInputChange}
                  size="sm"
                  bg="white"
                  color="gray.700"
                  borderColor="gray.300"
                  _focus={{ borderColor: bgColor, boxShadow: `0 0 0 1px ${bgColor}` }}
                />
              </FormControl>

              <FormControl isRequired flex={1}>
                <FormLabel fontSize="sm" fontWeight="bold" color="white">
                  Hora 2
                </FormLabel>
                <Input
                  name="time2"
                  type="time"
                  value={scheduleData.time2}
                  onChange={handleScheduleInputChange}
                  size="sm"
                  bg="white"
                  color="gray.700"
                  borderColor="gray.300"
                  _focus={{ borderColor: bgColor, boxShadow: `0 0 0 1px ${bgColor}` }}
                />
              </FormControl>
            </HStack>

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="bold" color="white">
                Mensaje
              </FormLabel>
              <Textarea
                name="message"
                value={scheduleData.message}
                onChange={handleScheduleInputChange}
                placeholder="Comentarios adicionales..."
                size="sm"
                rows={3}
                bg="white"
                color="gray.700"
                borderColor="gray.300"
                _placeholder={{ color: "gray.500" }}
                _focus={{ borderColor: bgColor, boxShadow: `0 0 0 1px ${bgColor}` }}
                resize="vertical"
              />
            </FormControl>

            <HStack width="full" spacing={3}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                flex={1}
                onClick={() => setShowScheduleForm(false)}
                borderColor="white"
                color="white"
                _hover={{ bg: "white", color: "green.600" }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                bg="white"
                color="green.600"
                size="sm"
                flex={1}
                isLoading={isSubmitting}
                loadingText="Enviando..."
                _hover={{ bg: "gray.50" }}
              >
                ENVIAR
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}
    </Box>
  );
}
