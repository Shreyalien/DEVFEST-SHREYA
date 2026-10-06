/**
 * Loads the bundled sample pack from /sample-pack. The file list comes from
 * manifest.json, so nothing about the sample is hard-coded here.
 * @returns {{ requirementsText: string, files: File[] }}
 */
export async function loadSamplePack() {
  const base = `${import.meta.env.BASE_URL}sample-pack/`
  const get = async (path) => {
    const response = await fetch(base + path.split('/').map(encodeURIComponent).join('/'))
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
    return response
  }

  const manifest = await (await get('manifest.json')).json()
  const requirementsText = await (await get(manifest.requirements)).text()
  const files = []
  for (const name of manifest.documents) {
    const blob = await (await get(`documents/${name}`)).blob()
    files.push(new File([blob], name, { type: 'application/pdf' }))
  }
  return { requirementsText, files }
}
