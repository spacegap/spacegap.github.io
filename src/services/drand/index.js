export default async function () {
  return await (await fetch('https://pl-us.incentinet.drand.sh/health')).json()
}
