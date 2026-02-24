/**
 * Rastera — /api/analyze
 * Serverless proxy to rastera-engine /v1/site/analyze.
 * Holds the API key server-side; never exposed to the browser.
 */
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ detail: "Method not allowed" });

  const { address, lat, lon, radius_m, industry_template } = req.body || {};

  if (!address && (lat == null || lon == null)) {
    return res
      .status(422)
      .json({ detail: "Provide an address or lat/lon coordinates." });
  }

  try {
    const upstream = await fetch(
      `${process.env.RASTERA_API_URL}/v1/site/analyze`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.RASTERA_API_KEY,
        },
        body: JSON.stringify({
          address: address || undefined,
          lat: lat != null ? Number(lat) : undefined,
          lon: lon != null ? Number(lon) : undefined,
          radius_m: radius_m ? Number(radius_m) : 1600,
          industry_template: industry_template || "coffee",
          generate_ai_summary: true,
        }),
      }
    );

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ detail: "Upstream error: " + err.message });
  }
};
