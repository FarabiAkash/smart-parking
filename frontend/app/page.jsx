export default async function Home() {
  let data = null;
  let error = null;

  try {
    const res = await fetch("http://127.0.0.1:8000/api/health/", {
      cache: "no-store",
    });
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json") && res.ok) {
      data = await res.json();
    } else {
      error = res.ok
        ? "Backend did not return JSON"
        : `Backend error: ${res.status} ${res.statusText}`;
    }
  } catch (e) {
    error = "Cannot reach backend. Is Django running on http://127.0.0.1:8000?";
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Smart Parking</h1>
      {error ? (
        <p style={{ color: "#c00" }}>{error}</p>
      ) : (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      )}
    </main>
  );
}
