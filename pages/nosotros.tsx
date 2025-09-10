import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/#nosotros', permanent: false } };
};

export default function NosotrosRedirect() { return null; }

