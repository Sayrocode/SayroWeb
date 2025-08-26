import Head from "next/head";
import Hero from "../components/Hero"; // opcional si ya lo tienes
import HomeProperties from "../components/HomeProperties";

export default function HomePage() {
  const title = "Propiedades en venta y renta — Sayro Bienes Raíces";
  const description =
    "Encuentra tu próxima propiedad con Sayro Bienes Raíces. Inventario actualizado, atención personalizada y procesos claros.";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        {/* Opcional: Open Graph / Twitter meta */}
      </Head>

  
    <Hero /> 

      <main id="contenido">
        <HomeProperties />
      </main>
    </>
  );
}
