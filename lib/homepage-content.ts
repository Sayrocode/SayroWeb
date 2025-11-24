export type HomepageContent = {
  hero: {
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaHref: string;
    backgroundUrl: string;
  };
  dualCta: {
    heading: string;
    advertiseTitle: string;
    advertiseHref: string;
    advertiseImage: string;
    acquireTitle: string;
    acquireHref: string;
    acquireImage: string;
  };
  about: {
    title: string;
    paragraphs: string[];
    imageSrc: string;
    imageAlt: string;
    logoSrc: string;
    logoAlt: string;
    anchorId: string;
  };
  whatWeDo: {
    leftTitle: string;
    leftBodyTop: string;
    rightTitle: string;
    rightBody: string;
    ctaHref: string;
    ctaText: string;
    imageSrc: string;
    imageAlt: string;
    imageObjectPosition?: string;
    instagramUrl: string;
    facebookUrl: string;
    brandName: string;
    reverseDesktop?: boolean;
  };
  contact: {
    heading: string;
    name: string;
    role: string;
    addressLines: string[];
    phone: string;
    schedule: string;
    directorImage: string;
    buildingImage: string;
    facebookUrl: string;
    instagramUrl: string;
  };
};

const sanitize = (value: unknown, fallback: string) => {
  if (typeof value === "string") {
    const t = value.trim();
    return t || fallback;
  }
  return fallback;
};

const sanitizeUrl = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const t = value.trim();
  if (!t) return fallback;
  return t;
};

const normalizeAssetUrl = (value: unknown, fallback: string) => {
  const url = sanitizeUrl(value, fallback);
  if (!url) return fallback;
  if (url.startsWith("/") || /^https?:\/\//i.test(url)) return url;
  return `/${url}`;
};

const normalizeParagraphs = (arr?: unknown, fallback: string[] = []) => {
  if (!Array.isArray(arr)) return fallback;
  const cleaned = arr
    .map((it) => (typeof it === "string" ? it.trim() : ""))
    .filter(Boolean);
  return cleaned.length ? cleaned : fallback;
};

export const defaultHomepageContent: HomepageContent = {
  hero: {
    title: "Sayro Bienes Raíces",
    subtitle: "El mejor precio, rápido y seguro.",
    ctaLabel: "Ver propiedades",
    ctaHref: "/propiedades",
    backgroundUrl: "/hero.png",
  },
  dualCta: {
    heading: "ANUNCIANTES Y ADQUIERENTES",
    advertiseTitle: "¿VENDES\nO\nRENTAS?",
    advertiseHref: "/anunciate",
    advertiseImage: "/anuncia.png",
    acquireTitle: "¿ADQUIERES?",
    acquireHref: "/propiedades",
    acquireImage: "/adquiere.png",
  },
  about: {
    title: "¿Quiénes somos?",
    paragraphs: [
      "Somos una empresa líder en el sector inmobiliario de la Ciudad de Querétaro, México, con más de 33 años de experiencia respaldando nuestro trabajo.",
      "Nuestro compromiso es garantizar que cada cliente obtenga el mejor precio, con rapidez y seguridad, asegurando la máxima rentabilidad de sus operaciones inmobiliarias y la mayor optimización en sus inversiones.",
      "Nos especializamos en la comercialización de bienes raíces en venta y renta de todo tipo en la Ciudad de Querétaro.",
    ],
    imageSrc: "/about.png",
    imageAlt: "Fachada curvada",
    logoSrc: "/sayrowhite.png",
    logoAlt: "SR · Sayro Bienes Raíces S.A. de C.V.",
    anchorId: "nosotros",
  },
  whatWeDo: {
    leftTitle: "¿Qué hacemos?",
    leftBodyTop:
      "Brindamos asesoría profesional y personalizada a particulares y empresas interesadas en comprar, vender o rentar inmuebles en Querétaro.",
    rightTitle: "¿Cómo lo hacemos?",
    rightBody:
      "Ofrecemos un servicio integral que proporciona seguridad, confianza y acompañamiento en cada etapa del proceso inmobiliario, ya sea en la compra, venta o renta de su propiedad. Nuestro valor agregado: contamos con uno de los inventarios más amplios de inmuebles en Querétaro. Y si no tenemos lo que busca, lo encontramos por usted.",
    ctaHref: "/contacto",
    ctaText: "Contáctanos",
    imageSrc: "/know.png",
    imageAlt: "Atención profesional inmobiliaria",
    imageObjectPosition: "center right",
    instagramUrl: "https://www.instagram.com/",
    facebookUrl: "https://www.facebook.com/",
    brandName: "Sayro Bienes Raíces",
    reverseDesktop: false,
  },
  contact: {
    heading: "CONTACTO",
    name: "Raul Martín Salamanca Riba",
    role: "Director",
    addressLines: [
      "Av. Circunvalación 11-5",
      "Col. Diligencias C.P. 76020 Qro. Qro.",
    ],
    phone: "(442)213-30-30",
    schedule: "9:00 a 17:00 (lunes a viernes)",
    directorImage: "/director.jpg",
    buildingImage: "/contactohero.jpg?v=1",
    facebookUrl: "https://facebook.com/",
    instagramUrl: "https://instagram.com/",
  },
};

export function normalizeHomepageContent(data?: Partial<HomepageContent>): HomepageContent {
  const base: Partial<HomepageContent> = data ?? {};
  const hero: Partial<HomepageContent["hero"]> = base.hero ?? {};
  const dualCta: Partial<HomepageContent["dualCta"]> = base.dualCta ?? {};
  const about: Partial<HomepageContent["about"]> = base.about ?? {};
  const whatWeDo: Partial<HomepageContent["whatWeDo"]> = base.whatWeDo ?? {};
  const contact: Partial<HomepageContent["contact"]> = base.contact ?? {};

  return {
    hero: {
      title: sanitize(hero.title, defaultHomepageContent.hero.title),
      subtitle: sanitize(hero.subtitle, defaultHomepageContent.hero.subtitle),
      ctaLabel: sanitize(hero.ctaLabel, defaultHomepageContent.hero.ctaLabel),
      ctaHref: sanitizeUrl(hero.ctaHref, defaultHomepageContent.hero.ctaHref),
      backgroundUrl: sanitizeUrl(hero.backgroundUrl, defaultHomepageContent.hero.backgroundUrl),
    },
    dualCta: {
      heading: sanitize(dualCta.heading, defaultHomepageContent.dualCta.heading),
      advertiseTitle: sanitize(dualCta.advertiseTitle, defaultHomepageContent.dualCta.advertiseTitle),
      advertiseHref: sanitizeUrl(dualCta.advertiseHref, defaultHomepageContent.dualCta.advertiseHref),
      advertiseImage: sanitizeUrl(dualCta.advertiseImage, defaultHomepageContent.dualCta.advertiseImage),
      acquireTitle: sanitize(dualCta.acquireTitle, defaultHomepageContent.dualCta.acquireTitle),
      acquireHref: sanitizeUrl(dualCta.acquireHref, defaultHomepageContent.dualCta.acquireHref),
      acquireImage: sanitizeUrl(dualCta.acquireImage, defaultHomepageContent.dualCta.acquireImage),
    },
    about: {
      title: sanitize(about.title, defaultHomepageContent.about.title),
      paragraphs: normalizeParagraphs(about.paragraphs, defaultHomepageContent.about.paragraphs),
      imageSrc: sanitizeUrl(about.imageSrc, defaultHomepageContent.about.imageSrc),
      imageAlt: sanitize(about.imageAlt, defaultHomepageContent.about.imageAlt),
      logoSrc: sanitizeUrl(about.logoSrc, defaultHomepageContent.about.logoSrc),
      logoAlt: sanitize(about.logoAlt, defaultHomepageContent.about.logoAlt),
      anchorId: sanitize(about.anchorId, defaultHomepageContent.about.anchorId),
    },
    whatWeDo: {
      leftTitle: sanitize(whatWeDo.leftTitle, defaultHomepageContent.whatWeDo.leftTitle),
      leftBodyTop: sanitize(whatWeDo.leftBodyTop, defaultHomepageContent.whatWeDo.leftBodyTop),
      rightTitle: sanitize(whatWeDo.rightTitle, defaultHomepageContent.whatWeDo.rightTitle),
      rightBody: sanitize(whatWeDo.rightBody, defaultHomepageContent.whatWeDo.rightBody),
      ctaHref: sanitizeUrl(whatWeDo.ctaHref, defaultHomepageContent.whatWeDo.ctaHref),
      ctaText: sanitize(whatWeDo.ctaText, defaultHomepageContent.whatWeDo.ctaText),
      imageSrc: normalizeAssetUrl(whatWeDo.imageSrc, defaultHomepageContent.whatWeDo.imageSrc),
      imageAlt: sanitize(whatWeDo.imageAlt, defaultHomepageContent.whatWeDo.imageAlt),
      imageObjectPosition: sanitize(whatWeDo.imageObjectPosition, defaultHomepageContent.whatWeDo.imageObjectPosition || ""),
      instagramUrl: sanitizeUrl(whatWeDo.instagramUrl, defaultHomepageContent.whatWeDo.instagramUrl),
      facebookUrl: sanitizeUrl(whatWeDo.facebookUrl, defaultHomepageContent.whatWeDo.facebookUrl),
      brandName: sanitize(whatWeDo.brandName, defaultHomepageContent.whatWeDo.brandName),
      reverseDesktop: Boolean(
        typeof whatWeDo.reverseDesktop === "boolean"
          ? whatWeDo.reverseDesktop
          : defaultHomepageContent.whatWeDo.reverseDesktop
      ),
    },
    contact: {
      heading: sanitize(contact.heading, defaultHomepageContent.contact.heading),
      name: sanitize(contact.name, defaultHomepageContent.contact.name),
      role: sanitize(contact.role, defaultHomepageContent.contact.role),
      addressLines: normalizeParagraphs(contact.addressLines, defaultHomepageContent.contact.addressLines),
      phone: sanitize(contact.phone, defaultHomepageContent.contact.phone),
      schedule: sanitize(contact.schedule, defaultHomepageContent.contact.schedule),
      directorImage: sanitizeUrl(contact.directorImage, defaultHomepageContent.contact.directorImage),
      buildingImage: sanitizeUrl(contact.buildingImage, defaultHomepageContent.contact.buildingImage),
      facebookUrl: sanitizeUrl(contact.facebookUrl, defaultHomepageContent.contact.facebookUrl),
      instagramUrl: sanitizeUrl(contact.instagramUrl, defaultHomepageContent.contact.instagramUrl),
    },
  };
}
