/**
 * Rastera — /api/report
 * Serverless proxy to rastera-engine /v1/site/report/pdf.
 * Streams the PDF bytes back to the browser.
 */
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ detail: "Method not allowed" });

  const { site_id } = req.body || {};
  if (!site_id)
    return res.status(422).json({ detail: "site_id is required" });

  try {
    const upstream = await fetch(
      `${process.env.RASTERA_API_URL}/v1/site/report/pdf`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.RASTERA_API_KEY,
        },
        body: JSON.stringify({ site_id }),
      }
    );

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      return res.status(upstream.status).json(err);
    }

    const pdf = await upstream.arrayBuffer();
    const slug = site_id.slice(0, 8);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="rastera-report-${slug}.pdf"`
    );
    return res.status(200).send(Buffer.from(pdf));
  } catch (err) {
    return res.status(502).json({ detail: "Upstream error: " + err.message });
  }
};
