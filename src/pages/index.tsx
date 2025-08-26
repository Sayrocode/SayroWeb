import Head from "next/head";
import Hero from "../components/Hero"; // opcional si ya lo tienes
import HomeProperties from "../components/HomeProperties";
import DualCTASection from "components/DualCTASection";
import Layout from "components/Layout";
import AboutShowcase from "components/AboutShowcase";

export default function HomePage() {
  const title = "Propiedades en venta y renta — Sayro Bienes Raíces";
  const description =
    "Encuentra tu próxima propiedad con Sayro Bienes Raíces. Inventario actualizado, atención personalizada y procesos claros.";

  return (
    <>
    <Layout>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        {/* Opcional: Open Graph / Twitter meta */}
      </Head>

  
    <Hero /> 
<DualCTASection/>
<AboutShowcase
      imageSrc="/about.png"
      imageAlt="Fachada curvada"
      logoSrc="/logos/sayro-sello-blanco.svg"
      logoAlt="SR · Sayro Bienes Raíces S.A. de C.V."
      caption="al dar scroll down que la imagen vaya cambiando" // si no lo quieres, quítalo
      title="¿Quiénes somos?"
      paragraphs={[
        "Somos una empresa líder en el sector inmobiliario de la Ciudad de Querétaro, México, con más de 33 años de experiencia respaldando nuestro trabajo.",
        "Nuestro compromiso es garantizar que cada cliente obtenga el mejor precio, con rapidez y seguridad, asegurando la máxima rentabilidad de sus operaciones inmobiliarias y la mayor optimización en sus inversiones.",
        "Nos especializamos en la comercialización de bienes raíces en venta y renta de todo tipo en la Ciudad de Querétaro.",
      ]}
    />
      <main id="contenido">
        <HomeProperties />
      </main>
      </Layout>
    </>
  );
}
