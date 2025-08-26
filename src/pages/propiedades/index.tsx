import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { SimpleGrid, Container, Spinner, Center } from "@chakra-ui/react";
import PropertyCard from "../../components/PropertyCard";
import Filters from "../../components/Filters";

export default function Propiedades() {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);



  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await fetch("/api/easybroker?endpoint=properties");
        console.log(res)
        const data = await res.json();
        setProperties(data.content || []);
      } catch (err) {
        console.error("Error al cargar propiedades", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  return (
    <Layout title="Propiedades">
      <Container maxW="6xl" py={10}>
        <Filters />
        {loading ? (
          <Center py={20}>
            <Spinner size="xl" />
          </Center>
        ) : (
          <SimpleGrid columns={[1, 2, 3]} spacing={8}>
            {properties.map((p) => (
              <PropertyCard key={p.public_id} property={p} />
            ))}
          </SimpleGrid>
        )}
      </Container>
    </Layout>
  );
}
