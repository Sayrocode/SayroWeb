import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/#servicios', permanent: false } };
};

export default function ServiciosRedirect() { return null; }

