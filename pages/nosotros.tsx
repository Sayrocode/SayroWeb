export { };
export async function getServerSideProps() { return { redirect: { destination: '/#nosotros', permanent: false } }; }
export default function NosotrosRedirect() { return null; }
