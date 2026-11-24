// Situs statis: cukup sajikan berkas di app/.
export default {
  fetch: (request, env) => env.ASSETS.fetch(request),
};
