export default async function () {
  return await (await fetch('https://api3.drand.sh/health')).json()
}
