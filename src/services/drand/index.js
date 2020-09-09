export default async function () {
  console.log('drand')
  return await (await fetch('https://pl-us.incentinet.drand.sh/health')).json()
}
