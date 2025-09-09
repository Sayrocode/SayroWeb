import { Box, Container, Heading, Text, SimpleGrid, Stack, Image } from '@chakra-ui/react';

type Props = {
  title?: string;
  paragraphs?: string[];
  imageSrc: string;
  imageAlt?: string;
  logoSrc?: string;
  logoAlt?: string;
};

export default function AboutShowcase({
  title = '¿Quiénes somos?',
  paragraphs = [],
  imageSrc,
  imageAlt = 'Imagen',
  logoSrc,
  logoAlt,
}: Props) {
  return (
    <Box py={{ base: 10, md: 14 }}>
      <Container maxW='7xl'>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} alignItems='center'>
          <Box>
            <Heading size='lg' mb={3}>{title}</Heading>
            <Stack spacing={3} color='gray.700'>
              {paragraphs.length ? (
                paragraphs.map((p, i) => <Text key={i}>{p}</Text>)
              ) : (
                <Text>Somos una empresa líder en el sector inmobiliario.</Text>
              )}
            </Stack>
          </Box>
          <Box>
            <Image src={imageSrc} alt={imageAlt} rounded='md' shadow='md' width='100%' height='auto' />
            {logoSrc && (
              <Box mt={4} textAlign='center'>
                <Image src={logoSrc} alt={logoAlt || 'logo'} mx='auto' maxH='80px' objectFit='contain' />
              </Box>
            )}
          </Box>
        </SimpleGrid>
      </Container>
    </Box>
  );
}
