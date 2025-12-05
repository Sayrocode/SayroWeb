import type { GetServerSideProps } from "next";
import React from "react";
import { getIronSession } from "iron-session";
import useSWR from "swr";
import {
  AspectRatio,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Flex,
  Heading,
  HStack,
  Image as ChakraImage,
  SimpleGrid,
  Grid,
  GridItem,
  Spinner,
  Stack,
  Text,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { FiPlus } from "react-icons/fi";
import Layout from "../../components/Layout";
import { AppSession, sessionOptions } from "../../lib/session";
import {
  HomepageContent,
  defaultHomepageContent,
  normalizeHomepageContent,
} from "../../lib/homepage-content";

type Props = {
  username: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function contentClone(base?: HomepageContent): HomepageContent {
  const source = base ? normalizeHomepageContent(base) : defaultHomepageContent;
  return {
    ...source,
    dualCta: { ...source.dualCta },
    hero: { ...source.hero },
    about: { ...source.about, paragraphs: [...source.about.paragraphs] },
    whatWeDo: { ...source.whatWeDo },
    contact: { ...source.contact, addressLines: [...source.contact.addressLines] },
  };
}

type EditableTextBlockProps = {
  label?: string;
  value: string;
  onSave: (next: string) => void;
  multiline?: boolean;
  fontSize?: string | { base?: string; md?: string };
  fontWeight?: string | number;
  align?: "left" | "center" | "right";
  color?: string;
};

function EditableTextBlock({
  label,
  value,
  onSave,
  multiline = false,
  fontSize,
  fontWeight,
  align,
  color,
}: EditableTextBlockProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
  }, [value]);

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const next = e.currentTarget.innerText.replace(/\u00a0/g, " ").trim();
    if (next === value) return;
    onSave(next);
  };

  return (
    <Box w="full">
      {label && (
        <Text fontSize="xs" textTransform="uppercase" color="gray.500" mb={1} letterSpacing="wide">
          {label}
        </Text>
      )}
      <Box
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        whiteSpace={multiline ? "pre-line" : "normal"}
        borderWidth="1px"
        borderColor="gray.200"
        rounded="md"
        px={3}
        py={2}
        bg="white"
        minH="44px"
        fontSize={fontSize}
        fontWeight={fontWeight}
        textAlign={align}
        color={color}
        _focusWithin={{ outline: "2px solid", outlineColor: "green.500" }}
        cursor="text"
      >
        {value}
      </Box>
    </Box>
  );
}

type EditableImageCardProps = {
  label: string;
  src: string;
  onChange: (url: string) => void;
  ratio?: number;
};

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function EditableImageCard({ label, src, onChange, ratio = 16 / 9 }: EditableImageCardProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const toast = useToast();
  const [uploading, setUploading] = React.useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const r = await fetch("/api/admin/homepage/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, mimeType: file.type, base64 }),
      });
      if (!r.ok) throw new Error("upload_failed");
      const j = await r.json();
      onChange(j.url);
      toast({ title: "Imagen actualizada", status: "success", duration: 1400 });
    } catch (e: any) {
      toast({ title: "No se pudo subir la imagen", status: "error", duration: 2200 });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Box>
      <HStack justify="space-between" align="center" mb={1}>
        <Text fontSize="xs" textTransform="uppercase" color="gray.500" letterSpacing="wide">
          {label}
        </Text>
        <Badge colorScheme={uploading ? "orange" : "gray"}>
          {uploading ? "Subiendo…" : "Doble click para cambiar"}
        </Badge>
      </HStack>
      <Box
        position="relative"
        role="button"
        onDoubleClick={() => inputRef.current?.click()}
        cursor="pointer"
      >
        <input
          type="file"
          accept="image/*"
          ref={inputRef}
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <AspectRatio ratio={ratio}>
          <ChakraImage
            src={src || "/image3.jpg"}
            alt={label}
            objectFit="cover"
            rounded="md"
            borderWidth="1px"
            borderColor="gray.200"
            fallbackSrc="/image3.jpg"
          />
        </AspectRatio>
        <Box
          position="absolute"
          inset={0}
          rounded="md"
          border="1px dashed rgba(0,0,0,0.3)"
          pointerEvents="none"
        />
      </Box>
    </Box>
  );
}

type EditableHeroProps = {
  hero: HomepageContent["hero"];
  onChange: (next: HomepageContent["hero"]) => void;
};

function EditableHero({ hero, onChange }: EditableHeroProps) {
  const bgInput = React.useRef<HTMLInputElement | null>(null);

  const handleBg = async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      const r = await fetch("/api/admin/homepage/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, mimeType: file.type, base64 }),
      });
      if (!r.ok) throw new Error("upload_failed");
      const j = await r.json();
      onChange({ ...hero, backgroundUrl: j.url });
    } catch (e) {
      console.error(e);
    } finally {
      if (bgInput.current) bgInput.current.value = "";
    }
  };

  const overlay =
    "linear-gradient(0deg, rgba(6,78,59,.08), rgba(6,78,59,.08)), \
  linear-gradient(180deg, rgba(0,0,0,.10) 0%, rgba(0,0,0,.18) 45%, rgba(0,0,0,.28) 100%), \
  radial-gradient(1600px 600px at 50% 20%, rgba(0,0,0,.04) 0%, transparent 70%)";

  const handleChange = (key: keyof HomepageContent["hero"]) => (next: string) =>
    onChange({ ...hero, [key]: next });

  const editableProps = (key: keyof HomepageContent["hero"]) => ({
    contentEditable: true,
    suppressContentEditableWarning: true,
    onBlur: (e: React.FocusEvent<HTMLHeadingElement | HTMLParagraphElement | HTMLSpanElement>) => {
      const next = e.currentTarget.innerText.replace(/\u00a0/g, " ").trim();
      if (next !== (hero[key] as string)) handleChange(key)(next);
    },
  });

  return (
    <Box
      position="relative"
      minH={{ base: "70vh", md: "80vh" }}
      display="flex"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
      rounded="lg"
      borderWidth="1px"
      role="button"
      onDoubleClick={() => bgInput.current?.click()}
    >
      <input
        type="file"
        accept="image/*"
        ref={bgInput}
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleBg(file);
        }}
      />
      <Box position="absolute" inset={0} zIndex={0} aria-hidden>
        <ChakraImage
          src={hero.backgroundUrl || "/hero.png"}
          alt=""
          objectFit="cover"
          w="100%"
          h="100%"
        />
        <Box position="absolute" inset={0} pointerEvents="none" sx={{ backgroundImage: overlay }} />
      </Box>
      <Box position="absolute" top={3} right={3} zIndex={2}>
        <Badge colorScheme="blackAlpha" bg="rgba(0,0,0,0.55)" color="white">
          Doble click para cambiar fondo
        </Badge>
      </Box>
      <Container maxW="6xl" position="relative" zIndex={1}>
        <VStack spacing={{ base: 4, md: 6 }} align="center" textAlign="center">
          <Heading
            as="h1"
            textTransform="uppercase"
            color="#013927"
            fontWeight="extrabold"
            fontSize={{ base: "4xl", md: "6xl", lg: "7xl" }}
            letterSpacing="wide"
            lineHeight={1.1}
            textShadow="0 2px 20px rgba(0,0,0,0.65), 0 0 10px rgba(255,255,255,0.15)"
            fontFamily="'Binggo Wood', heading"
            {...editableProps("title")}
            cursor="text"
            px={2}
            bg="rgba(255,255,255,0.12)"
            rounded="md"
          >
            {hero.title}
          </Heading>
          <Text
            mt={{ base: 2, md: 3 }}
            color="whiteAlpha.900"
            fontSize={{ base: "md", md: "lg" }}
            textTransform="uppercase"
            letterSpacing="widest"
            className="text-shiny-white"
            {...editableProps("subtitle")}
            cursor="text"
            px={3}
            py={1}
            bg="rgba(0,0,0,0.25)"
            rounded="md"
          >
            {hero.subtitle}
          </Text>
          <HStack spacing={3}>
            <Button
              variant="outline"
              color="white"
              borderColor="whiteAlpha.800"
              _hover={{ bg: "whiteAlpha.100" }}
              _active={{ bg: "whiteAlpha.200" }}
              fontWeight="semibold"
              letterSpacing="widest"
              fontSize="sm"
              {...editableProps("ctaLabel")}
              cursor="text"
              px={4}
            >
              {hero.ctaLabel}
            </Button>
            <Badge
              colorScheme="blackAlpha"
              bg="rgba(255,255,255,0.18)"
              color="white"
              px={3}
              py={2}
              rounded="md"
              fontSize="xs"
              {...editableProps("ctaHref")}
              cursor="text"
            >
              {hero.ctaHref}
            </Badge>
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
}

type EditableDualCtaProps = {
  dualCta: HomepageContent["dualCta"];
  onChange: (next: HomepageContent["dualCta"]) => void;
};

function EditableDualCta({ dualCta, onChange }: EditableDualCtaProps) {
  const handle = (key: keyof HomepageContent["dualCta"]) => (val: string) =>
    onChange({ ...dualCta, [key]: val });

  const editable = (key: keyof HomepageContent["dualCta"]) => ({
    contentEditable: true,
    suppressContentEditableWarning: true,
    onBlur: (e: React.FocusEvent<HTMLDivElement>) => {
      const next = e.currentTarget.innerText.replace(/\u00a0/g, " ").trim();
      if (next !== (dualCta[key] as string)) handle(key)(next);
    },
  });

  const leftInput = React.useRef<HTMLInputElement | null>(null);
  const rightInput = React.useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File, side: "left" | "right") => {
    const input = side === "left" ? leftInput.current : rightInput.current;
    try {
      const base64 = await fileToBase64(file);
      const r = await fetch("/api/admin/homepage/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, mimeType: file.type, base64 }),
      });
      if (!r.ok) throw new Error("upload_failed");
      const j = await r.json();
      onChange({
        ...dualCta,
        ...(side === "left" ? { advertiseImage: j.url } : { acquireImage: j.url }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      if (input) input.value = "";
    }
  };

  const renderCard = ({
    title,
    image,
    side,
  }: {
    title: string;
    image: string;
    side: "left" | "right";
  }) => {
    const inputRef = side === "left" ? leftInput : rightInput;
    return (
      <Box position="relative" cursor="pointer">
        <input
          type="file"
          accept="image/*"
          ref={inputRef}
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file, side);
          }}
        />
        <AspectRatio ratio={{ base: 4 / 3, md: 4 / 3 }}>
          <Box
            role="group"
            overflow="hidden"
            rounded="md"
            borderWidth="1px"
            onDoubleClick={() => inputRef.current?.click()}
          >
            <ChakraImage src={image || "/image3.jpg"} alt={title} objectFit="cover" w="100%" h="100%" />
            <Box
              position="absolute"
              inset={0}
              bg="linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.20) 100%)"
              _groupHover={{ bg: "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.28) 100%)" }}
            />
            <Box
              position="absolute"
              top={2}
              right={3}
              bg="rgba(0,0,0,0.6)"
              color="white"
              px={3}
              py={1}
              rounded="sm"
              fontSize="xs"
              fontWeight="bold"
              letterSpacing="wide"
              textTransform="uppercase"
            >
              Doble click para cambiar
            </Box>
            <Box position="absolute" inset={0} display="grid" placeItems="center" textAlign="center" px={3}>
              <Heading
                as="p"
                fontSize={{ base: "2xl", md: "3xl" }}
                color="white"
                letterSpacing="widest"
                textTransform="uppercase"
                fontWeight="bold"
                lineHeight="1.1"
                {...editable(side === "left" ? "advertiseTitle" : "acquireTitle")}
                cursor="text"
              >
                {title}
              </Heading>
            </Box>
          </Box>
        </AspectRatio>
      </Box>
    );
  };

  return (
    <Box borderWidth="1px" rounded="lg" overflow="hidden" bg="#FBF6E9" p={{ base: 4, md: 6 }}>
      <Box textAlign="center" mb={5}>
        <Heading
          as="h2"
          fontSize={{ base: "2xl", md: "3xl" }}
          textTransform="uppercase"
          letterSpacing="wide"
          fontWeight="extrabold"
          {...editable("heading")}
          cursor="text"
          display="inline-block"
          px={3}
          py={1}
          bg="white"
          rounded="md"
        >
          {dualCta.heading}
        </Heading>
      </Box>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {renderCard({ title: dualCta.advertiseTitle, image: dualCta.advertiseImage, side: "left" })}
        {renderCard({ title: dualCta.acquireTitle, image: dualCta.acquireImage, side: "right" })}
      </SimpleGrid>
    </Box>
  );
}

type EditableAboutProps = {
  about: HomepageContent["about"];
  onChange: (next: HomepageContent["about"]) => void;
};

function EditableAbout({ about, onChange }: EditableAboutProps) {
  const imageInput = React.useRef<HTMLInputElement | null>(null);
  const logoInput = React.useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File, kind: "image" | "logo") => {
    const input = kind === "image" ? imageInput.current : logoInput.current;
    try {
      const base64 = await fileToBase64(file);
      const r = await fetch("/api/admin/homepage/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, mimeType: file.type, base64 }),
      });
      if (!r.ok) throw new Error("upload_failed");
      const j = await r.json();
      onChange({ ...about, ...(kind === "image" ? { imageSrc: j.url } : { logoSrc: j.url }) });
    } catch (e) {
      console.error(e);
    } finally {
      if (input) input.value = "";
    }
  };

  const editable = (key: keyof HomepageContent["about"]) => ({
    contentEditable: true,
    suppressContentEditableWarning: true,
    onBlur: (e: React.FocusEvent<HTMLDivElement | HTMLHeadingElement>) => {
      const next = e.currentTarget.innerText.replace(/\u00a0/g, " ").trim();
      if (next !== (about[key] as string)) {
        onChange({ ...about, [key]: next } as HomepageContent["about"]);
      }
    },
  });

  const updateParagraph = (idx: number, val: string) => {
    const paragraphs = [...about.paragraphs];
    paragraphs[idx] = val;
    onChange({ ...about, paragraphs });
  };

  const addParagraph = () => {
    onChange({ ...about, paragraphs: [...about.paragraphs, "Nuevo párrafo"] });
  };

  return (
    <Box borderWidth="1px" rounded="lg" overflow="hidden" bg="white">
      <Grid templateColumns={{ base: "1fr", md: "1.5fr 1fr" }} gap={0} alignItems="stretch">
        <GridItem
          bg="#013927"
          color="white"
          px={{ base: 6, md: 10, lg: 12 }}
          py={{ base: 8, md: 10 }}
          display="flex"
          alignItems="center"
        >
          <Box w="full">
            <Box textAlign="center" mb={{ base: 6, md: 8 }}>
              <Heading
                as="h2"
                fontFamily="'Binggo Wood', heading"
                fontWeight="700"
                fontSize={{ base: "2.6rem", md: "3.6rem" }}
                lineHeight="1.1"
                letterSpacing=".02em"
                textShadow="0 1px 10px rgba(0,0,0,.22)"
                {...editable("title")}
                cursor="text"
                display="inline-block"
                px={2}
              >
                {about.title}
              </Heading>
              <Box
                aria-hidden
                mx="auto"
                w={{ base: "64px", md: "88px" }}
                h="3px"
                bg="green.300"
                rounded="full"
                mt={3}
              />
            </Box>

            <Stack spacing={{ base: 4, md: 5 }} maxW="62ch" mx="auto">
              {about.paragraphs.map((p, i) => (
                <Text
                  key={i}
                  fontSize={{ base: i === 0 ? "lg" : "md", md: i === 0 ? "xl" : "lg" }}
                  lineHeight={{ base: 1.85, md: 1.9 }}
                  color="whiteAlpha.900"
                  letterSpacing=".005em"
                  textAlign="center"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => updateParagraph(i, e.currentTarget.innerText.replace(/\u00a0/g, " ").trim())}
                  cursor="text"
                  px={1}
                >
                  {p}
                </Text>
              ))}
              <Button
                size="sm"
                onClick={addParagraph}
                leftIcon={<FiPlus />}
                alignSelf="center"
                colorScheme="whiteAlpha"
                variant="outline"
              >
                Añadir párrafo
              </Button>
            </Stack>
          </Box>
        </GridItem>

        <GridItem position="relative" minH={{ base: "320px", md: "480px" }} overflow="hidden">
          <input
            type="file"
            accept="image/*"
            ref={imageInput}
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file, "image");
            }}
          />
          <input
            type="file"
            accept="image/*"
            ref={logoInput}
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file, "logo");
            }}
          />
          <Box
            position="absolute"
            inset={0}
            role="button"
            onDoubleClick={() => imageInput.current?.click()}
            cursor="pointer"
          >
            <ChakraImage
              src={about.imageSrc || "/about.png"}
              alt={about.imageAlt || "Fachada"}
              w="100%"
              h="100%"
              objectFit="cover"
            />
            <Box
              position="absolute"
              top={2}
              right={3}
              bg="rgba(0,0,0,0.6)"
              color="white"
              px={3}
              py={1}
              rounded="sm"
              fontSize="xs"
              fontWeight="bold"
              letterSpacing="wide"
              textTransform="uppercase"
            >
              Doble click para cambiar
            </Box>
            <Box position="absolute" inset={0} display="grid" placeItems="center" pointerEvents="none">
              <ChakraImage
              src={about.logoSrc || "/logos/sayro-sello-blanco.svg"}
              alt={about.logoAlt || "Logo"}
              maxW={{ base: "75%", md: "60%" }}
              maxH={{ base: "75%", md: "70%" }}
              objectFit="contain"
              opacity={0.95}
              filter="drop-shadow(0 4px 20px rgba(0,0,0,.35))"
              fallbackSrc="/sayrowhite.png"
              referrerPolicy="no-referrer"
              onDoubleClick={() => logoInput.current?.click()}
            />
          </Box>
            <Box
              position="absolute"
              bottom={3}
              left={3}
              bg="rgba(0,0,0,0.6)"
              color="white"
              px={3}
              py={1}
              rounded="sm"
              fontSize="xs"
              fontWeight="bold"
              letterSpacing="wide"
              textTransform="uppercase"
              pointerEvents="auto"
              onDoubleClick={() => logoInput.current?.click()}
            >
              Cambiar logo
            </Box>
          </Box>
        </GridItem>
      </Grid>
    </Box>
  );
}

type EditableWhatWeDoProps = {
  whatWeDo: HomepageContent["whatWeDo"];
  onChange: (next: HomepageContent["whatWeDo"]) => void;
};

function EditableWhatWeDo({ whatWeDo, onChange }: EditableWhatWeDoProps) {
  const imageInput = React.useRef<HTMLInputElement | null>(null);

  const handleImage = async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      const r = await fetch("/api/admin/homepage/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, mimeType: file.type, base64 }),
      });
      if (!r.ok) throw new Error("upload_failed");
      const j = await r.json();
      onChange({ ...whatWeDo, imageSrc: j.url });
    } catch (e) {
      console.error(e);
    } finally {
      if (imageInput.current) imageInput.current.value = "";
    }
  };

  const editable = (key: keyof HomepageContent["whatWeDo"]) => ({
    contentEditable: true,
    suppressContentEditableWarning: true,
    onBlur: (e: React.FocusEvent<HTMLDivElement | HTMLHeadingElement | HTMLParagraphElement | HTMLButtonElement>) => {
      const next = e.currentTarget.innerText.replace(/\u00a0/g, " ").trim();
      if (next !== (whatWeDo[key] as string)) {
        onChange({ ...whatWeDo, [key]: next } as HomepageContent["whatWeDo"]);
      }
    },
  });

  return (
    <Box borderWidth="1px" rounded="lg" overflow="hidden" bg="white">
      <Grid templateColumns={{ base: "1fr", md: "1.2fr 1fr" }} alignItems="stretch">
        <GridItem
          bg="#013927"
          color="white"
          px={{ base: 6, md: 10, lg: 12 }}
          py={{ base: 8, md: 10 }}
          display="flex"
          alignItems="center"
        >
          <Stack spacing={{ base: 8, md: 10 }} w="full">
            <Box>
              <Heading
                as="h2"
                fontFamily="'Binggo Wood', heading"
                fontWeight="700"
                fontSize={{ base: "2.5rem", md: "3.4rem" }}
                lineHeight="1.1"
                letterSpacing=".01em"
                {...editable("leftTitle")}
                cursor="text"
              >
                {whatWeDo.leftTitle}
              </Heading>
              <Text
                mt={4}
                fontSize={{ base: "md", md: "lg" }}
                lineHeight={1.8}
                color="whiteAlpha.900"
                {...editable("leftBodyTop")}
                cursor="text"
              >
                {whatWeDo.leftBodyTop}
              </Text>
            </Box>

            <Box>
              <Heading
                as="h2"
                fontFamily="'Binggo Wood', heading"
                fontWeight="700"
                fontSize={{ base: "2.5rem", md: "3.4rem" }}
                lineHeight="1.1"
                letterSpacing=".01em"
                {...editable("rightTitle")}
                cursor="text"
              >
                {whatWeDo.rightTitle}
              </Heading>
              <Text
                mt={4}
                fontSize={{ base: "md", md: "lg" }}
                lineHeight={1.85}
                color="whiteAlpha.900"
                {...editable("rightBody")}
                cursor="text"
              >
                {whatWeDo.rightBody}
              </Text>
            </Box>

            <Button
              alignSelf="flex-start"
              colorScheme="green"
              variant="solid"
              px={6}
              {...editable("ctaText")}
              cursor="text"
            >
              {whatWeDo.ctaText}
            </Button>
          </Stack>
        </GridItem>

        <GridItem position="relative" minH={{ base: "320px", md: "520px" }} overflow="hidden">
          <input
            type="file"
            accept="image/*"
            ref={imageInput}
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImage(file);
            }}
          />
          <Box
            position="absolute"
            inset={0}
            role="button"
            cursor="pointer"
            onDoubleClick={() => imageInput.current?.click()}
          >
            <ChakraImage
              src={whatWeDo.imageSrc || "/know.png"}
              alt={whatWeDo.imageAlt || "Handshake"}
              w="100%"
              h="100%"
              objectFit="cover"
            />
            <Box
              position="absolute"
              top={2}
              right={3}
              bg="rgba(0,0,0,0.6)"
              color="white"
              px={3}
              py={1}
              rounded="sm"
              fontSize="xs"
              fontWeight="bold"
              letterSpacing="wide"
              textTransform="uppercase"
            >
              Doble click para cambiar
            </Box>
          </Box>
        </GridItem>
      </Grid>
    </Box>
  );
}

type EditableContactProps = {
  contact: HomepageContent["contact"];
  onChange: (next: HomepageContent["contact"]) => void;
};

function EditableContact({ contact, onChange }: EditableContactProps) {
  const directorInput = React.useRef<HTMLInputElement | null>(null);
  const buildingInput = React.useRef<HTMLInputElement | null>(null);

  const handleImage = async (file: File, type: "director" | "building") => {
    const ref = type === "director" ? directorInput.current : buildingInput.current;
    try {
      const base64 = await fileToBase64(file);
      const r = await fetch("/api/admin/homepage/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, mimeType: file.type, base64 }),
      });
      if (!r.ok) throw new Error("upload_failed");
      const j = await r.json();
      onChange({ ...contact, ...(type === "director" ? { directorImage: j.url } : { buildingImage: j.url }) });
    } catch (e) {
      console.error(e);
    } finally {
      if (ref) ref.value = "";
    }
  };

  const editable = (key: keyof HomepageContent["contact"]) => ({
    contentEditable: true,
    suppressContentEditableWarning: true,
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      const next = e.currentTarget.innerText.replace(/\u00a0/g, " ").trim();
      if (next !== (contact[key] as string)) {
        onChange({ ...contact, [key]: next } as HomepageContent["contact"]);
      }
    },
  });

  return (
    <Box borderWidth="1px" rounded="lg" overflow="hidden" bg="white">
      <Grid templateColumns={{ base: "1fr", md: "1.1fr 1fr" }} alignItems="stretch">
        <GridItem
          bg="#013927"
          color="white"
          px={{ base: 6, md: 10, lg: 12 }}
          py={{ base: 8, md: 10 }}
        >
          <Stack spacing={4}>
            <Heading
              as="h2"
              fontFamily="'Binggo Wood', heading"
              fontWeight="700"
              fontSize={{ base: "2.2rem", md: "3rem" }}
              textTransform="uppercase"
              letterSpacing=".03em"
              {...editable("heading")}
              cursor="text"
            >
              {contact.heading}
            </Heading>
            <Box>
              <Heading as="h3" size="lg" {...editable("name")} cursor="text">
                {contact.name}
              </Heading>
              <Text fontStyle="italic" fontWeight="semibold" mt={2} {...editable("role")} cursor="text">
                {contact.role}
              </Text>
            </Box>

            <Stack spacing={1} fontSize={{ base: "md", md: "lg" }}>
              {contact.addressLines.map((line, idx) => (
                <Text
                  key={idx}
                  fontStyle="italic"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const lines = [...contact.addressLines];
                    lines[idx] = e.currentTarget.innerText.replace(/\u00a0/g, " ").trim();
                    onChange({ ...contact, addressLines: lines });
                  }}
                  cursor="text"
                >
                  {line}
                </Text>
              ))}
              <Text {...editable("phone")} cursor="text">
                {contact.phone}
              </Text>
              <Text fontStyle="italic" {...editable("schedule")} cursor="text">
                {contact.schedule}
              </Text>
            </Stack>

            <Box pt={4}>
              <Text fontWeight="semibold" mb={2}>
                Síguenos
              </Text>
              <HStack spacing={4}>
                <Text
                  as="span"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    onChange({ ...contact, facebookUrl: e.currentTarget.innerText.replace(/\u00a0/g, " ").trim() })
                  }
                  cursor="text"
                  bg="white"
                  color="black"
                  px={2}
                  py={1}
                  rounded="md"
                  fontSize="sm"
                >
                  {contact.facebookUrl}
                </Text>
                <Text
                  as="span"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    onChange({ ...contact, instagramUrl: e.currentTarget.innerText.replace(/\u00a0/g, " ").trim() })
                  }
                  cursor="text"
                  bg="white"
                  color="black"
                  px={2}
                  py={1}
                  rounded="md"
                  fontSize="sm"
                >
                  {contact.instagramUrl}
                </Text>
              </HStack>
            </Box>
          </Stack>
        </GridItem>

        <GridItem position="relative" minH={{ base: "340px", md: "520px" }} bg="black">
          <input
            type="file"
            accept="image/*"
            ref={buildingInput}
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImage(file, "building");
            }}
          />
          <input
            type="file"
            accept="image/*"
            ref={directorInput}
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImage(file, "director");
            }}
          />
          <Box
            position="absolute"
            inset={0}
            role="button"
            cursor="pointer"
            onDoubleClick={() => buildingInput.current?.click()}
          >
            <ChakraImage
            src={contact.buildingImage || "/contactohero.jpg?v=1"}
              alt="Fachada"
              w="100%"
              h="100%"
              objectFit="cover"
            />
            <Box
              position="absolute"
              top={2}
              right={3}
              bg="rgba(0,0,0,0.6)"
              color="white"
              px={3}
              py={1}
              rounded="sm"
              fontSize="xs"
              fontWeight="bold"
              letterSpacing="wide"
              textTransform="uppercase"
            >
              Doble click para cambiar fondo
            </Box>
          </Box>
          <Box
            position="absolute"
            inset={0}
            display="grid"
            placeItems="center"
            pointerEvents="none"
            px={4}
          >
            <Box
              bg="white"
              rounded="lg"
              shadow="xl"
              overflow="hidden"
              maxW="320px"
              w="full"
              pointerEvents="auto"
              onDoubleClick={() => directorInput.current?.click()}
              cursor="pointer"
            >
              <AspectRatio ratio={3 / 4}>
                <ChakraImage
                  src={contact.directorImage || "/director.jpg"}
                  alt="Director"
                  objectFit="cover"
                />
              </AspectRatio>
              <Box py={2} textAlign="center" bg="white">
                <Text fontWeight="semibold" color="black">
                  Foto (doble click para cambiar)
                </Text>
              </Box>
            </Box>
          </Box>
        </GridItem>
      </Grid>
    </Box>
  );
}

export default function AdminHomepage({ username }: Props) {
  const toast = useToast();
  const { data, mutate, isLoading } = useSWR("/api/admin/homepage", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  const [draft, setDraft] = React.useState<HomepageContent>(defaultHomepageContent);
  const [saving, setSaving] = React.useState(false);
  const saveVersionRef = React.useRef(0);

  React.useEffect(() => {
    if (data?.content) {
      setDraft(contentClone(data.content));
    }
  }, [data]);

  const saveContent = React.useCallback(
    async (next: HomepageContent) => {
      const currentVersion = ++saveVersionRef.current;
      setSaving(true);
      try {
        const r = await fetch("/api/admin/homepage", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: next }),
        });
        if (!r.ok) throw new Error(`status_${r.status}`);
        const j = await r.json();
        if (currentVersion === saveVersionRef.current) {
          setDraft(contentClone(j.content));
          mutate(j, { revalidate: false });
          toast({ title: "Guardado", status: "success", duration: 1200 });
        }
      } catch (e: any) {
        if (currentVersion === saveVersionRef.current) {
          toast({ title: "No se pudo guardar", status: "error", duration: 2000 });
        }
      } finally {
        if (currentVersion === saveVersionRef.current) setSaving(false);
      }
    },
    [mutate, toast]
  );

  const updateContent = React.useCallback(
    (updater: (state: HomepageContent) => HomepageContent) => {
      setDraft((prev) => {
        const base = contentClone(prev);
        const next = contentClone(updater(base));
        void saveContent(next);
        return next;
      });
    },
    [saveContent]
  );

  const hero = draft.hero;
  const dualCta = draft.dualCta;
  const about = draft.about;
  const whatWeDo = draft.whatWeDo;
  const contact = draft.contact;

  return (
    <Layout title="Editar página principal">
      <Container maxW="7xl" py={{ base: 6, md: 8 }}>
        <Stack spacing={3} mb={6}>
          <HStack justify="space-between" align="center">
            <Heading size="lg">Editor de la página principal</Heading>
            <Badge colorScheme={saving ? "orange" : "green"}>
              {saving ? "Guardando…" : "Cambios guardados"}
            </Badge>
          </HStack>
          <Text color="gray.600">
            Haz click sobre cualquier texto para editarlo. Al salir del campo se guarda automáticamente.
            Doble click en las imágenes para subir una nueva.
          </Text>
        </Stack>

        {isLoading && (
          <Flex align="center" justify="center" py={10} gap={3}>
            <Spinner />
            <Text>Cargando contenido…</Text>
          </Flex>
        )}

        {!isLoading && (
          <Stack spacing={10}>
            {/* Hero (vista similar a la landing con edición inline) */}
            <EditableHero hero={hero} onChange={(next) => updateContent((s) => ({ ...s, hero: next }))} />

            {/* Dual CTA */}
            <EditableDualCta
              dualCta={dualCta}
              onChange={(next) => updateContent((s) => ({ ...s, dualCta: next }))}
            />

            {/* About - vista editable replicando el diseño */}
            <EditableAbout
              about={about}
              onChange={(next) => updateContent((s) => ({ ...s, about: next }))}
            />

            {/* What we do - vista editable replicando el diseño */}
            <EditableWhatWeDo
              whatWeDo={whatWeDo}
              onChange={(next) => updateContent((s) => ({ ...s, whatWeDo: next }))}
            />

            {/* Contact */}
            <EditableContact
              contact={contact}
              onChange={(next) => updateContent((s) => ({ ...s, contact: next }))}
            />

            <Divider />
            <Text color="gray.600" fontSize="sm">
              Sesión iniciada como {username}. Los cambios se guardan en cuanto sales de un campo o cambias una imagen.
            </Text>
          </Stack>
        )}
      </Container>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const session = await getIronSession<AppSession>(context.req, context.res, sessionOptions);
  if (!session?.user) {
    return {
      redirect: { destination: "/admin/login", permanent: false },
    };
  }

  return {
    props: {
      username: session.user.username || "Admin",
    },
  };
};
