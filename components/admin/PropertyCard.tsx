import React from 'react';
import Link from 'next/link';
import {
  Box,
  AspectRatio,
  Image,
  Checkbox,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  IconButton,
  HStack,
  Badge,
  Text,
  Icon,
  Button,
} from '@chakra-ui/react';
import { FiMoreVertical, FiExternalLink, FiCopy, FiTrash2, FiEdit2, FiMaximize } from 'react-icons/fi';

export type PropertyCardProps = {
  property: any;
  campaignMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onDelete: (id: number) => void;
};

function norm(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getSizeSqmAdmin(p: any): number | null {
  const typeText = norm(p?.propertyType || '');
  if (typeText.includes('terreno')) {
    if (typeof p?.lotSize === 'number') return p.lotSize;
    if (typeof p?.constructionSize === 'number') return p.constructionSize;
    return null;
  }
  if (typeof p?.constructionSize === 'number') return p.constructionSize;
  if (typeof p?.lotSize === 'number') return p.lotSize;
  return null;
}

function InnerCard({ property: p, campaignMode, isSelected, onToggleSelect, onDelete }: PropertyCardProps) {
  const onTopClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (campaignMode) {
        e.preventDefault();
        onToggleSelect(p.id);
      }
    },
    [campaignMode, onToggleSelect, p.id]
  );

  const onEditClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (campaignMode) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [campaignMode]
  );

  const sqm = getSizeSqmAdmin(p);

  return (
    <Box
      borderWidth="1px"
      rounded="none"
      overflow="hidden"
      bg={campaignMode && isSelected ? 'green.50' : '#fffcf1'}
      borderColor={campaignMode && isSelected ? 'green.400' : undefined}
      _hover={{ boxShadow: 'lg', transform: 'translateY(-2px)' }}
      transition="all 0.15s ease"
      cursor={campaignMode ? 'pointer' : 'default'}
      onClick={onTopClick}
    >
      <Box position="relative">
        <AspectRatio ratio={16 / 9}>
          <Box
            as={Link}
            href={`/admin/properties/${p.id}`}
            display="block"
            overflow="hidden"
            onClick={onTopClick}
          >
            <Image
              src={p.coverUrl || '/image3.jpg'}
              alt={p.title}
              w="100%"
              h="100%"
              objectFit="cover"
              cursor="pointer"
              loading="lazy"
              decoding="async"
              style={{
                transform: `scale(${Number.isFinite(p?.coverZoom) && p.coverZoom ? p.coverZoom : 1})`,
                transformOrigin: 'center',
                transition: 'transform 0.2s ease',
              }}
            />
          </Box>
        </AspectRatio>
        {campaignMode && (
          <Checkbox
            isChecked={isSelected}
            onChange={() => onToggleSelect(p.id)}
            position="absolute"
            top="2"
            left="2"
            bg="white"
            px={2}
            py={1}
            rounded="md"
            shadow="sm"
          />
        )}
        <Menu placement="bottom-end" isLazy>
          <MenuButton
            as={IconButton}
            aria-label="Acciones"
            icon={<FiMoreVertical />}
            size="sm"
            variant="solid"
            position="absolute"
            top="2"
            right="2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
          <MenuList>
            <MenuItem as={Link} href={`/admin/properties/${p.id}`} icon={<FiEdit2 />}>Editar</MenuItem>
            <MenuItem as={Link} href={`/propiedades/${encodeURIComponent(p.publicId)}`} target="_blank" icon={<FiExternalLink />}>Ver público</MenuItem>
            <MenuItem icon={<FiCopy />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/propiedades/${p.publicId}`); }}>Copiar enlace público</MenuItem>
            <MenuItem icon={<FiTrash2 />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(p.id); }}>
              Eliminar
            </MenuItem>
          </MenuList>
        </Menu>
      </Box>
      <Box p={3}>
        <Box as={Link} href={`/admin/properties/${p.id}`} _hover={{ textDecoration: 'none' }} onClick={onEditClick}>
          <Text fontWeight="bold" noOfLines={1} cursor="pointer">{p.title}</Text>
        </Box>
        <HStack mt={2} spacing={2} color="gray.600" wrap="wrap">
          {p.propertyType && <Badge colorScheme="green" variant="subtle" rounded="full">{p.propertyType}</Badge>}
          {p.status && <Badge variant="outline" rounded="full">{p.status}</Badge>}
          {p.price && <Text fontWeight="semibold" color="green.700">{p.price}</Text>}
          {typeof sqm === 'number' && (
            <HStack spacing={1}>
              <Icon as={FiMaximize} />
              <Text>{new Intl.NumberFormat('es-MX').format(sqm)} m²</Text>
            </HStack>
          )}
          {p.publicId && <Badge variant="subtle" rounded="full">ID {p.publicId}</Badge>}
        </HStack>
        <HStack mt={3} spacing={2}>
          <Button as={Link} href={`/admin/properties/${p.id}`} size="sm" colorScheme="blue" leftIcon={<FiEdit2 />} isDisabled={campaignMode} onClick={onEditClick}>Editar</Button>
          <Button size="sm" variant="outline" colorScheme="red" leftIcon={<FiTrash2 />} isDisabled={campaignMode} onClick={(e) => { if (!campaignMode) onDelete(p.id); else { e.preventDefault(); e.stopPropagation(); } }}>Eliminar</Button>
        </HStack>
      </Box>
    </Box>
  );
}

export default React.memo(InnerCard);

