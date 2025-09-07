// Redirect /favicon.ico to /favicon.png with 308 (Permanent Redirect)
// This serves as a fallback in case the static file serving doesn't work
export async function GET() {
	return new Response(null, {
		status: 308,
		headers: {
			'Location': '/favicon.png'
		}
	});
}