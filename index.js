async function sha256(message) {
  // encode as UTF-8
  const msgBuffer = new TextEncoder().encode(message)

  // hash the message
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer)

  // convert ArrayBuffer to Array
  const hashArray = Array.from(new Uint8Array(hashBuffer))

  // convert bytes to hex string
  const hashHex = hashArray.map(b => ("00" + b.toString(16)).slice(-2)).join("")
  return hashHex
}

async function handleRequest(event) {
  const cache = caches.default;
  const request = event.request
  const body = await request.clone().text()

  // Hash the request body to use it as a part of the cache key
  const hash = await sha256(body)
  const cacheUrl = new URL('https://eth-ropsten.alchemyapi.io/v2/RqtAm8cc9-XSIGa_YpYjo3g7de_CJF-K')

  // Store the URL in cache by prepending the body's hash
  cacheUrl.pathname = cacheUrl.pathname + "/posts/" + hash

  // Convert to a GET to be able to cache
  const cacheKey = new Request(cacheUrl.toString(), {
    headers: request.headers,
    method: "GET",
  });

  // Find the cache key in the cache
  let cashedResponse = await cache.match(cacheKey);
  if (cashedResponse) return cashedResponse;

  // Otherwise, fetch response to POST request from origin
  const url = new URL('https://eth-ropsten.alchemyapi.io/v2/RqtAm8cc9-XSIGa_YpYjo3g7de_CJF-K')
  let response = await fetch(url, request);

  response = new Response(response.body, response);
  response.headers.append("Cache-Control", "s-maxage=30")
  
  event.waitUntil(
    cache.put(cacheKey, response.clone())
  )
  
  return response;
}


addEventListener("fetch", event => {
  try {
    return event.respondWith(handleRequest(event))
  } catch (e) {
    return event.respondWith(new Response("Error thrown " + e.message))
  }
})