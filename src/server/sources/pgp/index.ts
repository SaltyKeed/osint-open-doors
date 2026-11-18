import "server-only";
import { found, type Source } from "@/server/domain/source";

// keys.openpgp.org (SOURCES.md, section 2): a public encryption key published for
// the address. It usually holds the full name and stays online until removed.
export const pgpKeys: Source = {
  id: "pgp",
  label: "Clés PGP (keys.openpgp.org)",
  accepts: ["EMAIL"],
  requiredEnv: [],
  async run(email, { signal }) {
    const url = `https://keys.openpgp.org/vks/v1/by-email/${encodeURIComponent(email.value)}`;
    const response = await fetch(url, { signal });
    if (response.status === 404) return found([]);
    if (!response.ok) throw new Error(`pgp: HTTP ${response.status}`);
    await response.body?.cancel();
    return found([
      {
        origin: "keys.openpgp.org",
        evidence: url,
        values: [
          {
            field: "F2",
            value: url,
            attributes: [
              { label: "Service", value: "Clé PGP publique", known: true },
              { label: "Ce que ça veut dire", value: "Une clé de chiffrement est publiée pour ton adresse. Elle contient en général ton nom complet.", known: true },
            ],
          },
        ],
        identifiers: [{ identifier: email }],
      },
    ]);
  },
};
