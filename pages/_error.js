import Link from 'next/link';

function Error({ statusCode }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>{statusCode ? `Error ${statusCode}` : 'Error'}</h1>
      <p>{statusCode === 404 ? 'Página no encontrada' : 'Ha ocurrido un error'}</p>
      <Link href="/">Volver al inicio</Link>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
