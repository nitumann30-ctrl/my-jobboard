export async function GET() {
  return Response.json({
    ok: true,
    service: 'nitu-job-board-webapp',
    timestamp: new Date().toISOString()
  })
}
